import { DELETE_WORD, isDeleteConfirmed } from '../../src/utils/deleteConfirm';

describe('isDeleteConfirmed', () => {
  it('accepts the word in any case, with stray spaces', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
    expect(isDeleteConfirmed(' delete ')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('DELET')).toBe(false);
    expect(isDeleteConfirmed('DELETE ME')).toBe(false);
  });

  it('names the word shown to the person', () => {
    expect(DELETE_WORD).toBe('DELETE');
  });
});
