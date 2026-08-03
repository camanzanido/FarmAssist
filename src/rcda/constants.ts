export interface CropData {
  [key: string]: number;
}

export const climatology: CropData = {
  "Driest": 33,
  "Mid": 34,
  "Wetest": 33,
};

export const nonForecast: number[] = [33.0, 34.0, 33.0];
export const cltlgy: number[] = [1.0, 10.0, 33.0, 50.0, 67.0, 90.0, 100.0];
