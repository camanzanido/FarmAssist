let askedFor: string | null = null;

export function wasClaimPromptShown(userId: string): boolean {
  return askedFor === userId;
}

export function markClaimPromptShown(userId: string): void {
  askedFor = userId;
}

export function resetClaimPrompt(): void {
  askedFor = null;
}
