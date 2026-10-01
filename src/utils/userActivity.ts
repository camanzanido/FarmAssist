const DORMANT_MS = 365 * 24 * 60 * 60 * 1000;

type ActivityFields = {
  user_type: string;
  status: string;
  created_at: string;
  last_decision_at: string | null;
};

export function isDormant(u: ActivityFields, now: Date = new Date()): boolean {
  if (u.user_type !== 'farmer' || u.status !== 'active') return false;
  if (u.last_decision_at === undefined) return false;
  const last = Date.parse(u.last_decision_at ?? u.created_at);
  return Number.isFinite(last) && now.getTime() - last >= DORMANT_MS;
}
