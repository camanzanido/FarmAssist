import { useAuth } from '@/src/auth/AuthContext';
import { getPendingEmail } from '@/src/auth/profileService';
import { useFeedback } from '@/src/components/feedback/FeedbackProvider';
import type { ProfileSaveResult } from '@/src/components/profile/edit-profile-sheet';
import { profileCopy as copy } from '@/src/constants/copy';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export function useEditProfile() {
  const { user, refreshProfile } = useAuth();
  const { notify } = useFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);
  const userId = user?.id;

  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let cancelled = false;
    getPendingEmail().then(next => {
      if (cancelled || next === undefined) return;
      const wasPending = pendingRef.current !== null;
      pendingRef.current = next;
      setPendingEmail(next);
      if (wasPending && next === null) refreshProfile();
    });
    return () => { cancelled = true; };
  }, [userId, refreshProfile]));

  const onSaved = useCallback((result: ProfileSaveResult) => {
    setIsOpen(false);
    if (result.pendingEmail) {
      pendingRef.current = result.pendingEmail;
      setPendingEmail(result.pendingEmail);
      notify.info(copy.emailConfirmTitle, copy.emailConfirmBody(result.pendingEmail));
    } else {
      notify.success(copy.profileUpdated);
    }
  }, [notify]);

  return {
    isOpen,
    pendingEmail,
    open: useCallback(() => setIsOpen(true), []),
    close: useCallback(() => setIsOpen(false), []),
    onSaved,
  };
}
