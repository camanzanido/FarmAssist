// db/stats.ts — read-only queries for aggregation tables
import { db } from '../powersync/powersync';

export interface MonthlyStats {
  id: string;
  period: string;
  decision_type: string;
  total_decisions: number;
  most_chosen_option: string;
  avg_profit_increase: number;
  updated_at: string;
}

export interface YearlyStats {
  id: string;
  year: number;
  decision_type: string;
  total_decisions: number;
  most_chosen_option: string;
  avg_profit_increase: number;
  updated_at: string;
}

export interface UserActivitySummary {
  id: string;
  user_id: string;
  period: string;
  total_decisions: number;
  last_active: string;
}

export async function getMonthlyStats(
  decisionType?: string,
  limit = 12
): Promise<MonthlyStats[]> {
  if (decisionType) {
    return db.getAll<MonthlyStats>(
      'SELECT * FROM decision_stats_monthly WHERE decision_type = ? ORDER BY period DESC LIMIT ?',
      [decisionType, limit]
    );
  }
  return db.getAll<MonthlyStats>(
    'SELECT * FROM decision_stats_monthly ORDER BY period DESC LIMIT ?',
    [limit]
  );
}

export async function getYearlyStats(
  decisionType?: string
): Promise<YearlyStats[]> {
  if (decisionType) {
    return db.getAll<YearlyStats>(
      'SELECT * FROM decision_stats_yearly WHERE decision_type = ? ORDER BY year DESC',
      [decisionType]
    );
  }
  return db.getAll<YearlyStats>(
    'SELECT * FROM decision_stats_yearly ORDER BY year DESC'
  );
}

export async function getUserActivitySummary(userId: string): Promise<UserActivitySummary[]> {
  return db.getAll<UserActivitySummary>(
    'SELECT * FROM user_activity_summary WHERE user_id = ? ORDER BY period DESC',
    [userId]
  );
}