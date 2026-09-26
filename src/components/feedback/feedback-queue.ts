import type { DialogRequest, Toast, ToastKind, ToastOptions } from './types';

// Plain TypeScript (no React Native imports) so the queue rules are unit-testable
// under the node jest environment. The hosts read these via useSyncExternalStore,
// which is why every change replaces the snapshot instead of mutating it.

type Listener = () => void;

class Store {
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  protected emit() {
    this.listeners.forEach((l) => l());
  }
}

export interface DialogEntry {
  id: number;
  request: DialogRequest;
}

/**
 * Shows one dialog at a time. Two React Native <Modal>s open at once is
 * unreliable on iOS (the second often never appears), so later requests wait
 * their turn — e.g. an error raised from inside a confirm handler.
 */
export class DialogQueue extends Store {
  private entries: { entry: DialogEntry; resolve: (value: boolean) => void }[] = [];
  private nextId = 1;
  private head: DialogEntry | null = null;

  enqueue(request: DialogRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.entries.push({ entry: { id: this.nextId++, request }, resolve });
      this.sync();
    });
  }

  getCurrent = (): DialogEntry | null => this.head;

  /** Settles the visible dialog and advances to the next one. Ignores stale ids (double taps). */
  resolve(id: number, value: boolean) {
    const first = this.entries[0];
    if (!first || first.entry.id !== id) return;
    this.entries.shift();
    this.sync();
    first.resolve(value);
  }

  private sync() {
    const next = this.entries[0]?.entry ?? null;
    if (next !== this.head) {
      this.head = next;
      this.emit();
    }
  }
}

export const DEFAULT_TOAST_DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 4000,
  error: 5000, // errors usually carry a next step, so give time to read it
};

export class ToastStore extends Store {
  private toasts: Toast[] = [];
  private nextId = 1;

  constructor(private readonly max = 3) {
    super();
  }

  getToasts = (): Toast[] => this.toasts;

  show(options: ToastOptions): number {
    const toast: Toast = {
      ...options,
      id: this.nextId++,
      durationMs: options.durationMs ?? DEFAULT_TOAST_DURATION[options.kind],
    };
    // Repeating the same message (e.g. tapping a failing action twice) restarts
    // it rather than stacking duplicates.
    const others = this.toasts.filter(
      (t) => !(t.kind === toast.kind && t.title === toast.title && t.message === toast.message)
    );
    this.toasts = [...others, toast].slice(-this.max);
    this.emit();
    return toast.id;
  }

  dismiss(id: number) {
    if (!this.toasts.some((t) => t.id === id)) return;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }
}
