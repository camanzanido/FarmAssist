import { useAuth } from '@/src/auth/AuthContext';
import { claimAnonymousDecisions } from '@/src/auth/authService';
import { markClaimPromptShown, wasClaimPromptShown } from '@/src/auth/claimPromptState';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import { claimCopy as copy } from '@/src/constants/copy';
import { countAnonymousStagedDecisions } from '@/src/database/repositories/decisions';
import { useEffect } from 'react';

let busy = false;

const LONG_TOAST_MS = 7000;

export function useOfflineClaimPrompt() {
  const { user } = useAuth();
  const { confirm, notify } = useFeedback();
  const userId = user?.user_type === 'farmer' ? user.id : null;

  useEffect(() => {
    if (!userId || wasClaimPromptShown(userId) || busy) return;

    busy = true;

    const run = async () => {
      let count: number;
      try {
        count = await countAnonymousStagedDecisions();
      } catch (err) {
        console.error('Failed to check for offline decisions:', err);
        return;
      }
      if (count === 0) return;

      markClaimPromptShown(userId);
      const accepted = await confirm({
        title: copy.promptTitle,
        message: copy.promptBody(count),
        confirmText: copy.confirm,
        cancelText: copy.notNow,
        icon: 'cloud-upload-outline',
      });
      if (!accepted) return;

      try {
        const { claimed, remaining } = await claimAnonymousDecisions(userId);
        if (remaining > 0) {
          notify.info(copy.deferredTitle, copy.deferredBody, { durationMs: LONG_TOAST_MS });
        } else if (claimed > 0) {
          notify.success(copy.doneTitle, copy.doneBody(claimed));
        }
      } catch (err) {
        console.error('Failed to claim offline decisions:', err);
        notify.error(copy.errorTitle, copy.errorBody, { durationMs: LONG_TOAST_MS });
      }
    };

    void run().finally(() => {
      busy = false;
    });
  }, [userId, confirm, notify]);
}
