import { cltlgy } from './constants';
import { getcltlgyRevised } from './financials';
import { transpose2DList } from '../utils/formatters';

export const calculateClimatologyStripes = (
  hundredPointsInterpolation: any[],
  climate: number[]
) => {
  const stripedCltlgy: (number | null)[][] = [];
  const stripedRevised: (number | null)[][] = [];
  const cltlgyRevised = getcltlgyRevised(climate);

  // hundredPointsInterpolation[0] is our array of 100 points
  const rawData: number[][] = hundredPointsInterpolation[0];

  // Calculate the y-axis ceiling for the stripes
  const maxValA = Math.max(...rawData.map(row => row[0]));
  const maxValB = Math.max(...rawData.map(row => row[1]));
  const overallMax = Math.max(maxValA, maxValB) * 1.2;

  // j=1 to length to match your Dart logic
  for (let j = 1; j < cltlgy.length; j++) {
    const curArray: (number | null)[] = [];
    const curArrayRevised: (number | null)[] = [];

    for (let i = 1; i <= 100; i++) {
      // Standard Climatology Stripes
      if (j === 1) {
        curArray.push(i > cltlgy[j] ? null : overallMax);
      } else {
        curArray.push(i <= cltlgy[j - 1] || i > cltlgy[j] ? null : overallMax);
      }

      // Revised Climatology Stripes
      if (j === 1) {
        curArrayRevised.push(i > cltlgyRevised[j] ? null : overallMax);
      } else {
        curArrayRevised.push(i <= cltlgyRevised[j - 1] || i > cltlgyRevised[j] ? null : overallMax);
      }
    }
    stripedCltlgy.push(curArray);
    stripedRevised.push(curArrayRevised);
  }

  return {
    stripedCltlgy,
    stripedRevised,
    transposedStripedCltlgy: transpose2DList(stripedCltlgy),
    transposedStripedRevised: transpose2DList(stripedRevised),
  };
};
