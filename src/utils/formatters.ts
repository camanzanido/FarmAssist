export const transpose2DList = <T>(data: T[][]): T[][] => {
  if (data.length === 0 || data[0].length === 0) return [];

  const numCols = data[0].length;
  const transposed: T[][] = [];

  for (let colIndex = 0; colIndex < numCols; colIndex++) {
    const column = data.map(row => row[colIndex]);
    transposed.push(column);
  }

  return transposed;
};

export interface CrossoverSummary {
  crossOverPercentile: number;
  firstCropName: string;
  firstCropAve: number;
  firstCropPercent: number;
  secondCropName: string;
  secondCropAve: number;
  secondCropPercent: number;
  firstCropOptimal: boolean;
  secondCropOptimal: boolean;
  optimalCrop: string;
  optimalCropAve: number;
  optimalDiffAve: number;
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
};

export const parseNum = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export function emptyFive(): string[] {
  return ['', '', '', '', ''];
}