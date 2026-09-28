import { formatNumberDisplay, normalizeNumberInput } from '../../src/utils/numberInput';

describe('normalizeNumberInput', () => {
  it.each([
    ['08', '8'],
    ['0008', '8'],
    ['0', '0'],
    ['00', '0'],
    ['0.5', '0.5'],
    ['.5', '0.5'],
    ['12.', '12.'],
    ['12.345', '12.34'],
    ['1.2.3', '1.23'],
    ['12,500', '12500'],
    ['₱ 1,000', '1000'],
    ['-5', '5'],
    ['', ''],
  ])('%p -> %p', (input, expected) => {
    expect(normalizeNumberInput(input)).toBe(expected);
  });

  it('accepts its own formatted output back unchanged', () => {
    for (const plain of ['8', '12500', '1234567.89', '0.5', '100.']) {
      expect(normalizeNumberInput(formatNumberDisplay(plain))).toBe(plain);
    }
  });
});

describe('formatNumberDisplay', () => {
  it.each([
    ['', ''],
    ['8', '8'],
    ['999', '999'],
    ['1000', '1,000'],
    ['12500.5', '12,500.5'],
    ['1234567.89', '1,234,567.89'],
    ['100.', '100.'],
  ])('%p -> %p', (plain, expected) => {
    expect(formatNumberDisplay(plain)).toBe(expected);
  });
});
