// db/reports.ts
import { db } from '../powersync/powersync';
import { generateId } from './utils';

export interface Report {
  id: string;
  title: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  researcher_id: string;
}

export async function getReports(researcherId?: string): Promise<Report[]> {
  if (researcherId) {
    return db.getAll<Report>(
      'SELECT * FROM reports WHERE researcher_id = ? ORDER BY generated_at DESC',
      [researcherId]
    );
  }
  return db.getAll<Report>(
    'SELECT * FROM reports ORDER BY generated_at DESC'
  );
}

export async function createReport(
  data: Omit<Report, 'id' | 'generated_at'>
): Promise<string> {
  const id = generateId();
  await db.execute(
    `INSERT INTO reports (id, title, period_start, period_end, generated_at, researcher_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.title, data.period_start, data.period_end, new Date().toISOString(), data.researcher_id]
  );
  return id;
}

export async function deleteReport(reportId: string): Promise<void> {
  await db.execute('DELETE FROM reports WHERE id = ?', [reportId]);
}