import { climatology, cltlgy } from './constants';

/**
 * Calculates adjusted yield values based on linear interpolation
 */
export function getYield(yieldData: number[][]): number[][] {
  if (yieldData.length !== 7) return [];

  return [
    yieldData[0],
    [
      yieldData[0][0] + ((yieldData[2][0] - yieldData[0][0]) / 30) * 9,
      yieldData[0][1] + ((yieldData[2][1] - yieldData[0][1]) / 30) * 9
    ],
    yieldData[2],
    yieldData[3],
    yieldData[4],
    [
      yieldData[4][0] + ((yieldData[6][0] - yieldData[4][0]) / 30) * 20,
      yieldData[4][1] + ((yieldData[6][1] - yieldData[4][1]) / 30) * 20
    ],
    yieldData[6]
  ];
}

/**
 * Calculates income by multiplying yield with crop prices
 */
export function getIncome(yieldData: number[][], crop1Price: number, crop2Price: number): number[][] {
  if (yieldData.length !== 7) return [];
  return yieldData.map(row => [row[0] * crop1Price, row[1] * crop2Price]);
}

/**
 * Calculates profit ensuring it doesn't drop below the negative cost (loss floor)
 */
export function getProfit(income: number[][], cost: number[][], addCost: number[][]): number[][] {
  if (income.length !== cost.length || cost.length !== addCost.length) return [];

  return income.map((item, i) => [
    Math.max(item[0] - cost[i][0] - addCost[i][0], -cost[i][0]),
    Math.max(item[1] - cost[i][1] - addCost[i][1], -cost[i][1])
  ]);
}

/**
 * Gets the raw difference between the two crops' profits
 */
export function getDifference(profit: number[][]): number[] {
  if (profit.length !== 7) return [];
  return profit.map(p => p[1] - p[0]);
}

/**
 * Revises climatology based on input climate probabilities
 */
export function getcltlgyRevised(climate: number[] | null): number[] {
  if (!climate) return [];
  return [
    1,
    climate[0] / 3.3,
    climate[0],
    climate[0] + climate[1] / 2,
    climate[0] + climate[1],
    (100 - climate[2] / 3.3),
    100
  ];
}

/**
 * Combines climatology and profit data for decile reporting
 */
export function getProfitByDecile(cltlgyRevised: number[], profit: number[][]): number[][] {
  if (cltlgyRevised.length !== profit.length && profit.length !== 7) return [];
  return profit.map((p, i) => [cltlgy[i], cltlgyRevised[i], p[0], p[1]]);
}

// Global variable for bar axis labels
export const xAxisClimatology: number[] = [
  (climatology["Driest"] / 2) - 1,
  2,
  (climatology["Driest"] / 2) - 1,
  (climatology["Mid"] / 2) - 1,
  2,
  (climatology["Mid"] / 2) - 1,
  (climatology["Wetest"] / 2) - 1,
  2,
  (climatology["Wetest"] / 2) - 1,
];

/**
 * Generates X-axis points for the revised climatology bar charts
 */
export function xAxisRevisedClimatology(revisedClmtlgy: number[]): number[] {
  if (revisedClmtlgy.length !== 3) return [];
  return [
    (revisedClmtlgy[0] / 2) - 1,
    2,
    (revisedClmtlgy[0] / 2) - 1,
    (revisedClmtlgy[1] / 2) - 1,
    2,
    (revisedClmtlgy[1] / 2) - 1,
    (revisedClmtlgy[2] / 2) - 1,
    2,
    (revisedClmtlgy[2] / 2) - 1,
  ];
}

/**
 * Calculates regret based on the difference between the chosen crop and the optimal crop
 */
export function getRegretPlease(profit: number[][], isFirstCrop: boolean): number[] {
  return profit.map(p => isFirstCrop ? p[0] - p[1] : p[1] - p[0]);
}

/**
 * Formats data specifically for a difference graph (e.g., used in Chart.js or Victory)
 */
export function getDifferenceGraph(climate: number[], difference: number[]): number[][] {
  if (climate.length !== 7 || difference.length !== climate.length) return [];
  return climate.map((c, i) => [cltlgy[i], difference[i], c, difference[i]]);
}
