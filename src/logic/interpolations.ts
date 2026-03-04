import { cltlgy, getIncome, getProfit, getcltlgyRevised } from '../constants/data';

/**
 * Interface for the 7-point interpolation results
 */
export interface InterpolationPoint {
  climatology: number;
  profitSlopeA: number;
  profitSlopeB: number;
  climatologyRevised: number;
  revisedSlopeA: number;
  revisedSlopeB: number;
}

/**
 * Ported from interpolation7Points
 */
export const interpolation7Points = (
  crop1Price: number,
  crop2Price: number,
  yieldData: number[][],
  cost: number[][],
  addCost: number[][],
  climate: number[]
): InterpolationPoint[] => {
  const interpolationPoints: InterpolationPoint[] = [];
  const income = getIncome(yieldData, crop1Price, crop2Price);
  const profit = getProfit(income, cost, addCost);
  const cltlgyRevised = getcltlgyRevised(climate);

  // Validation
  if (cltlgy.length === 0 || profit.length === 0 || cltlgyRevised.length === 0) {
    throw new Error("One or more input lists are empty!");
  }

  for (let i = 0; i < cltlgy.length - 1; i++) {
    interpolationPoints.push({
      climatology: cltlgy[i],
      profitSlopeA: (profit[i + 1][0] - profit[i][0]) / (cltlgy[i + 1] - cltlgy[i]),
      profitSlopeB: (profit[i + 1][1] - profit[i][1]) / (cltlgy[i + 1] - cltlgy[i]),
      climatologyRevised: cltlgyRevised[i],
      revisedSlopeA: (profit[i + 1][0] - profit[i][0]) / (cltlgyRevised[i + 1] - cltlgyRevised[i]),
      revisedSlopeB: (profit[i + 1][1] - profit[i][1]) / (cltlgyRevised[i + 1] - cltlgyRevised[i]),
    });
  }
  return interpolationPoints;
};

/**
 * Helper to find the index of a value in a search range
 */
export const lookUp = (lookUpValue: number, searchArray: number[]): number => {
  if (lookUpValue < 1) return 0;
  for (let i = 0; i < searchArray.length; i++) {
    if (searchArray[i] === lookUpValue) return i;
    if (searchArray[i] > lookUpValue) return i - 1;
  }
  return 0;
};

/**
 * Calculates percentile rank
 */
export const percentRank = (array: number[], value: number): number => {
  const sortedArray = [...array].sort((a, b) => a - b);

  if (sortedArray.length === 0) return 0.0;
  if (value <= sortedArray[0]) return 0.0;
  if (value >= sortedArray[sortedArray.length - 1]) return 1.0;

  const n = sortedArray.length;
  const countLess = sortedArray.filter(val => val < value).length;
  const countEqual = sortedArray.filter(val => val === value).length;

  if (countEqual > 0) {
    return countLess / (n - 1);
  } else {
    let lowerIndex = 0;
    let upperIndex = n - 1;

    for (let i = 0; i < n - 1; i++) {
      if (sortedArray[i] <= value && sortedArray[i + 1] >= value) {
        lowerIndex = i;
        upperIndex = i + 1;
        break;
      }
    }

    const lowerVal = sortedArray[lowerIndex];
    const upperVal = sortedArray[upperIndex];
    const lowerRank = lowerIndex / (n - 1);
    const upperRank = upperIndex / (n - 1);

    return lowerRank + ((value - lowerVal) * (upperRank - lowerRank)) / (upperVal - lowerVal);
  }
};