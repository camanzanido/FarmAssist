import { useCallback, useEffect, useState } from 'react';
import { db } from '@/src/database/powersync/powersync';
import { type SyncErrorRecord } from '@/src/database/repositories/syncErrors';

export interface SyncInfo {
  connected: boolean;
  uploading: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  recentErrors: SyncErrorRecord[];
}

export function useSyncStatus(): SyncInfo {
  const [status, setStatus] = useState(() => db.currentStatus);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentErrors, setRecentErrors] = useState<SyncErrorRecord[]>([]);

  const refreshQueue = useCallback(() => {
    db.getUploadQueueStats()
      .then(stats => setPendingCount(stats.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshQueue();
    const dispose = db.registerListener({
      statusChanged: (next) => {
        setStatus(next);
        refreshQueue();
      },
    });
    return dispose;
  }, [refreshQueue]);

  useEffect(() => {
    const controller = new AbortController();
    db.watch(
      'SELECT * FROM sync_errors ORDER BY occurred_at DESC LIMIT 5',
      [],
      {
        onResult: (result) => setRecentErrors((result.rows?._array as SyncErrorRecord[]) ?? []),
        onError: (err) => console.error('Failed to watch sync_errors:', err),
      },
      { signal: controller.signal }
    );
    return () => controller.abort();
  }, []);

  return {
    connected: status?.connected ?? false,
    uploading: status?.dataFlowStatus?.uploading ?? false,
    pendingCount,
    lastSyncedAt: status?.lastSyncedAt ?? null,
    recentErrors,
  };
}
