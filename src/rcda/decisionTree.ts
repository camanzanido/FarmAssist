import type { DecisionWithOptions } from '../database/repositories/decisions';
import type { OptionClimateFields } from '../database/repositories/options';
import { transpose2DList } from '../utils/formatters';
import { expandClimateScenarios, getIncome, getProfit, getYield } from './financials';
import { getCrossOverAverages, getRevisedProfitWalk } from './interpolations';

/** The inputs one RCDA run needs, in the shape the input flow produces them. */
export interface RcdaInputs {
  optionNames: string[];
  yield: number[][];   // [option][5 scenarios]
  cost: number[][];    // [option][5 scenarios]
  addCost: number[][]; // [option][5 scenarios]
  price: number[];     // [option]
  climate: number[];   // [driest %, mid %, wettest %], whole numbers summing to 100
}

export interface RcdaComputation {
  profit: number[][];      // 7 climate points x 2 options
  profitWalk: number[][];  // 100 percentiles x 2 options
  averages: [number, number];
  recommendedOption: 0 | 1;
}

// The inputs cannot produce a valid result; callers must not show or save one.
export class RcdaComputeError extends Error {
  name = 'RcdaComputeError';
}

// The walk divides by the width of each climate band; 0% average years makes one band zero-wide.
export function isForecastComputable(climate: number[]): boolean {
  return climate.length === 3 && climate[1] >= 1;
}

export function computeRcda(inputs: RcdaInputs): RcdaComputation {
  const yield7 = expandClimateScenarios(transpose2DList(inputs.yield));
  const cost7 = expandClimateScenarios(transpose2DList(inputs.cost));
  const addCost7 = expandClimateScenarios(transpose2DList(inputs.addCost));

  const income = getIncome(getYield(yield7), inputs.price[0], inputs.price[1]);
  const profit = getProfit(income, cost7, addCost7);
  const profitWalk = getRevisedProfitWalk(profit, inputs.climate);
  if (profitWalk.length !== 100) {
    throw new RcdaComputeError('RCDA inputs did not produce a 100-point profit walk');
  }
  if (!profitWalk.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))) {
    throw new RcdaComputeError(`RCDA profit walk is not finite for forecast ${JSON.stringify(inputs.climate)}`);
  }

  const averages = getCrossOverAverages(profitWalk);
  return {
    profit,
    profitWalk,
    averages,
    recommendedOption: averages[0] >= averages[1] ? 0 : 1,
  };
}

export type OutcomeKey = 'dry' | 'average' | 'wet';

export interface TreeOutcome {
  key: OutcomeKey;
  probability: number;   // 0..1
  value: number | null;  // null when the forecast gives this third 0%
}

export interface TreeBranch {
  optionIndex: number;
  optionName: string;
  expectedValue: number;
  outcomes: TreeOutcome[];
  recommended: boolean;
}

export interface DecisionTree {
  branches: TreeBranch[];
  recommendedOption: 0 | 1;
}

const OUTCOME_KEYS: OutcomeKey[] = ['dry', 'average', 'wet'];

export function buildDecisionTree(
  computation: RcdaComputation,
  climate: number[],
  optionNames: string[]
): DecisionTree {
  const { profitWalk, recommendedOption } = computation;
  const counts = climate.map((c) => Math.round(c));
  if (counts.length !== 3 || counts.some((c) => c < 0) || counts[0] + counts[1] + counts[2] !== profitWalk.length) {
    throw new Error(`Forecast ${JSON.stringify(climate)} does not partition a ${profitWalk.length}-point walk`);
  }
  const bounds = [0, counts[0], counts[0] + counts[1], profitWalk.length];

  const branches = optionNames.slice(0, 2).map((optionName, optionIndex): TreeBranch => {
    const outcomes = OUTCOME_KEYS.map((key, t): TreeOutcome => {
      const slice = profitWalk.slice(bounds[t], bounds[t + 1]);
      const value = slice.length === 0
        ? null
        : slice.reduce((sum, row) => sum + row[optionIndex], 0) / slice.length;
      return { key, probability: slice.length / profitWalk.length, value };
    });
    const expectedValue = outcomes.reduce((sum, o) => sum + o.probability * (o.value ?? 0), 0);
    return {
      optionIndex,
      optionName,
      expectedValue,
      outcomes,
      recommended: optionIndex === recommendedOption,
    };
  });

  return { branches, recommendedOption };
}

export function collapseScenario7to5(values7: number[]): number[] {
  if (values7.length !== 7) return [];
  return [values7[0], values7[2], values7[3], values7[4], values7[6]];
}

// The 5 scenarios a user entered, recovered from any row that stores the 7 climate points.
export function climateFieldsTo5(o: OptionClimateFields): { yield: number[]; cost: number[]; addCost: number[] } {
  return {
    yield: collapseScenario7to5([o.yield_driest, o.yield_very_dry, o.yield_below_avg, o.yield_average, o.yield_above_avg, o.yield_very_good, o.yield_wettest]),
    cost: collapseScenario7to5([o.cost_driest, o.cost_very_dry, o.cost_below_avg, o.cost_average, o.cost_above_avg, o.cost_very_good, o.cost_wettest]),
    addCost: collapseScenario7to5([o.add_cost_driest, o.add_cost_very_dry, o.add_cost_below_avg, o.add_cost_average, o.add_cost_above_avg, o.add_cost_very_good, o.add_cost_wettest]),
  };
}

/** Rebuilds the original RCDA inputs from a saved decision, or null if it is incomplete. */
export function decisionToRcdaInputs(decision: DecisionWithOptions): RcdaInputs | null {
  const options = [...decision.options].sort((a, b) => a.option_slot - b.option_slot);
  if (options.length !== 2) return null;
  return {
    optionNames: options.map((o) => o.option_name),
    yield: options.map((o) => climateFieldsTo5(o).yield),
    cost: options.map((o) => climateFieldsTo5(o).cost),
    addCost: options.map((o) => climateFieldsTo5(o).addCost),
    price: options.map((o) => o.price),
    climate: [decision.climate_driest, decision.climate_mid, decision.climate_wettest],
  };
}
