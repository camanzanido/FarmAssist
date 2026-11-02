export const DELETE_WORD = 'DELETE';

// Typing the word, not tapping a button, is what unlocks account deletion.
export function isDeleteConfirmed(text: string): boolean {
  return text.trim().toUpperCase() === DELETE_WORD;
}
