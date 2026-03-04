import { cltlgy } from '../constants/data';
import { lookUp } from '../logic/interpolations';

export function terciles() {
  let t1 = [];
  let t2 = [];
  let t3 = [];

  // add the first four elements of the terciles
  t1.push(...[33, 33, 90, 90]);
  t3.push(...[33, 33, (100 - t1[2]) / 2, (100 - t1[3]) / 2]);
  t2.push(...[34, 34, 100 - t1[2] - t3[2], 100 - t1[3] - t3[3]]);

  for (let i = 4; i < 52; i++) {
    if (i > 29) {
      if (i % 2 === 0) t3.push(t3[i - 1] + 5);
      else t3.push(t3[i - 1]);

      t1.push((100 - t3[i]) / 2);
      t2.push(100 - t1[i] - t3[i]);
    } else if (i === 28 || i === 29) {
      t3.push(35);
      t1.push((100 - t3[i]) / 2);
      t2.push(100 - t3[i] - t1[i]);
    } else {
      if (i % 2 === 0) t1.push(t1[i - 1] - 5);
      else t1.push(t1[i - 1]);

      if (i === 26 || i === 27) {
        t1[i] = 33;
        t3.push(33);
        t2.push(34);
      } else {
        t3.push((100 - t1[i]) / 2);
        t2.push(100 - t1[i] - t3[i]);
      }
    }
  }
  return [t1, t2, t3];
}

export function tercileToPointDistribution() {
  const tercile = terciles();
  const climatology = cltlgy;
  const t1 = tercile[0];
  const t2 = tercile[1];
  const t3 = tercile[2];

  let tercileToDistribution = [];
  for (let i = 0; i < climatology.length; i++) {
    let curArray = [];
    for (let j = 0; j < t1.length; j++) {
      if (i === 0) curArray.push(1);
      else if (i === 1) curArray.push(t1[j] / 3.3);
      else if (i === 2) curArray.push(t1[j]);
      else if (i === 3) curArray.push(t1[j] + t2[j] / 2);
      else if (i === 4) curArray.push(t1[j] + t2[j]);
      else if (i === 5) curArray.push(100 - t3[j] / 3.3);
      else if (i === climatology.length - 1) curArray.push(100);
    }
    tercileToDistribution.push(curArray);
  }
  return tercileToDistribution;
}

export function incrementProfit(tercile, yield1, crop1Price, crop2Price, cost, addCost, prof, crops) {
  const n = tercile[0].length;
  let arr1 = [];
  let arr2 = [];
  let arr3 = [];

  for (let i = 0; i < prof.length - 1; i++) {
    let curArray = [];
    for (let j = 0; j < n; j++) {
      if (j % 2 === 0) {
        curArray.push((prof[i + 1][0] - prof[i][0]) / (tercile[i + 1][j] - tercile[i][j]));
      } else {
        curArray.push((prof[i + 1][1] - prof[i][1]) / (tercile[i + 1][j] - tercile[i][j]));
      }
    }
    arr1.push(curArray);
  }

  for (let i = 0; i < prof.length; i++) {
    let curArray1 = [];
    let curArray2 = [];
    for (let j = 0; j < n; j++) {
      if (j % 2 === 0) {
        curArray1.push(tercile[i][j]);
        curArray2.push(tercile[i][j + 1]);
      } else {
        if (i === prof.length - 1) {
          curArray1.push(0);
          curArray2.push(0);
        } else {
          curArray1.push(arr1[i][j - 1]);
          curArray2.push(arr1[i][j]);
        }
      }
    }
    arr2.push(curArray1);
    arr3.push(curArray2);
  }

  let arr4 = [];
  for (let i = 0; i < 100; i++) {
    let curArray = [];
    for (let j = 0; j < n; j++) {
      if (i === 0) {
        curArray.push(j % 2 === 0 ? prof[0][0] : prof[0][1]);
      } else {
        let searchArray = j % 2 === 0
            ? arr2.map(row => row[j])
            : arr3.map(row => row[j - 1]);

        let ind = lookUp(i, searchArray);
        let curVal = arr4[i - 1][j];

        curArray.push(j % 2 === 0 ? curVal + arr2[ind][j + 1] : curVal + arr3[ind][j]);
      }
    }
    arr4.push(curArray);
  }

  let counters = [];
  let averages = [];
  for (let j = 0; j < n; j++) {
    let sum = 0.0;
    let count = 0;
    for (let i = 0; i < arr4.length; i++) {
      let value = arr4[i][j];
      sum += value;
      if (value > 0) count++;
    }
    counters.push(count);
    averages.push(sum / arr4.length);
  }

  let firstCrop1 = [], firstCrop2 = [], secondCrop1 = [], secondCrop2 = [];
  let indx = 2;
  for (let j = 0; j < 26; j++) {
    for (let i = 0; i < 2; i++) {
      if (j >= 13) {
        i === 0 ? firstCrop1.push(" ") : secondCrop1.push(" ");
      } else {
        i === 0 ? firstCrop1.push(averages[indx]) : secondCrop1.push(averages[indx]);
      }
      indx++;
    }
  }

  let idx = 27;
  for (let j = 0; j < 26; j++) {
    for (let i = 0; i < 2; i++) {
      if (j < 13) {
        i === 0 ? firstCrop2.push(" ") : secondCrop2.push(" ");
      } else if (j === 13) {
        i === 0 ? firstCrop2.push(firstCrop1[j - 1]) : secondCrop2.push(secondCrop1[j - 1]);
      } else {
        idx++;
        i === 0 ? firstCrop2.push(averages[idx]) : secondCrop2.push(averages[idx]);
      }
    }
  }

  let arrLabel = [];
  for (let i = 90; i >= 32; i -= 5) arrLabel.push(i);
  arrLabel.push(33, 33);
  for (let i = 35; i <= 90; i += 5) arrLabel.push(i);

  let crop = [];
  for (let i = 0; i < firstCrop1.length; i++) {
    let v1, v2;
    if (i < 13) {
      v1 = firstCrop1[i]; v2 = secondCrop1[i];
    } else {
      v1 = firstCrop2[i]; v2 = secondCrop2[i];
    }
    if (v1 === " " || v2 === " ") crop.push(crops[0][0]);
    else crop.push(v1 > v2 ? crops[0][0] : crops[1][0]);
  }

  let cropDifference = [];
  let mid = Math.floor(crop.length / 2);
  let initMid = mid;
  for (let i = 0; i < firstCrop1.length; i++) {
    let cropMid = i > initMid ? " " : crop[mid];
    if (crop[i] === cropMid || firstCrop1[i] === " " || secondCrop1[i] === " ") {
      cropDifference.push(0);
    } else {
      cropDifference.push(firstCrop1[i] - Math.abs(secondCrop1[i]));
    }
    if (mid + 1 < crop.length) mid++;
  }

  return [arr1, arr2, arr3, arr4, [counters, averages], [firstCrop1, secondCrop1, firstCrop2, secondCrop2], [arrLabel, cropDifference, crop]];
}

export function getCrossOver(crop, interpolation) {
  const firstCrop = crop[0][0];
  const secondCrop = crop[1][0];
  const summary = interpolation[1];
  const averages = summary[1];
  const crossOverPercentile = summary[0][5];

  const firstCropAve = averages[2];
  const secondCropAve = averages[3];
  let firstCropPercent = -1.0;
  let secondCropPercent = -1.0;

  if (firstCropAve > 0) {
    firstCropPercent = firstCropAve < secondCropAve ? firstCropAve / secondCropAve : 999999;
  }
  if (secondCropAve > 0) {
    secondCropPercent = secondCropAve < firstCropAve ? secondCropAve / firstCropAve : 999999;
  }

  return [crossOverPercentile, [firstCrop, firstCropAve, firstCropPercent], [secondCrop, secondCropAve, secondCropPercent]];
}