import { useCallback, useRef, useState } from 'react';

// The ref blocks a second tap in the same frame, before the disabled prop has re-rendered.
export function useSubmitOnce() {
  const busyRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSubmitting(true);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, run };
}
