import { DEFAULT_TOAST_DURATION, DialogQueue, ToastStore } from '../../src/components/feedback/feedback-queue';

describe('DialogQueue', () => {
  it('shows one dialog at a time, in request order', async () => {
    const q = new DialogQueue();
    const first = q.enqueue({ kind: 'confirm', title: 'First' });
    const second = q.enqueue({ kind: 'alert', title: 'Second' });

    const a = q.getCurrent()!;
    expect(a.request.title).toBe('First');

    q.resolve(a.id, true);
    await expect(first).resolves.toBe(true);

    const b = q.getCurrent()!;
    expect(b.request.title).toBe('Second');
    q.resolve(b.id, false);
    await expect(second).resolves.toBe(false);

    expect(q.getCurrent()).toBeNull();
  });

  it('ignores a stale id so a double tap cannot settle the next dialog', async () => {
    const q = new DialogQueue();
    const first = q.enqueue({ kind: 'confirm', title: 'First' });
    const second = q.enqueue({ kind: 'confirm', title: 'Second' });
    const firstId = q.getCurrent()!.id;

    q.resolve(firstId, true);
    q.resolve(firstId, true); // second tap on the already-closed dialog

    await expect(first).resolves.toBe(true);
    expect(q.getCurrent()!.request.title).toBe('Second');

    let settled = false;
    void second.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it('keeps the same snapshot reference until the head changes', () => {
    const q = new DialogQueue();
    void q.enqueue({ kind: 'confirm', title: 'First' });
    const head = q.getCurrent();
    void q.enqueue({ kind: 'confirm', title: 'Second' });
    expect(q.getCurrent()).toBe(head);
  });

  it('notifies subscribers only when the visible dialog changes', () => {
    const q = new DialogQueue();
    const listener = jest.fn();
    q.subscribe(listener);

    void q.enqueue({ kind: 'confirm', title: 'First' });
    void q.enqueue({ kind: 'confirm', title: 'Second' });
    expect(listener).toHaveBeenCalledTimes(1);

    q.resolve(q.getCurrent()!.id, true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('supports chaining a new dialog from inside a settled one', async () => {
    const q = new DialogQueue();
    const chained = q.enqueue({ kind: 'confirm', title: 'Delete?' }).then((ok) =>
      ok ? q.enqueue({ kind: 'alert', title: 'Failed' }) : false
    );
    q.resolve(q.getCurrent()!.id, true);
    await Promise.resolve();
    await Promise.resolve();
    expect(q.getCurrent()!.request.title).toBe('Failed');
    q.resolve(q.getCurrent()!.id, true);
    await expect(chained).resolves.toBe(true);
  });
});

describe('ToastStore', () => {
  it('applies the per-kind default duration', () => {
    const s = new ToastStore();
    s.show({ kind: 'error', title: 'Oops' });
    expect(s.getToasts()[0].durationMs).toBe(DEFAULT_TOAST_DURATION.error);
  });

  it('keeps only the newest toasts beyond the cap', () => {
    const s = new ToastStore(2);
    s.show({ kind: 'info', title: 'A' });
    s.show({ kind: 'info', title: 'B' });
    s.show({ kind: 'info', title: 'C' });
    expect(s.getToasts().map((t) => t.title)).toEqual(['B', 'C']);
  });

  it('replaces an identical toast instead of stacking it', () => {
    const s = new ToastStore();
    const firstId = s.show({ kind: 'error', title: 'Could not delete', message: 'Try again.' });
    const secondId = s.show({ kind: 'error', title: 'Could not delete', message: 'Try again.' });
    expect(s.getToasts()).toHaveLength(1);
    expect(s.getToasts()[0].id).toBe(secondId);
    expect(secondId).not.toBe(firstId);
  });

  it('dismisses by id and ignores unknown ids', () => {
    const s = new ToastStore();
    const listener = jest.fn();
    s.subscribe(listener);
    const id = s.show({ kind: 'success', title: 'Saved' });
    s.dismiss(999);
    expect(listener).toHaveBeenCalledTimes(1);
    s.dismiss(id);
    expect(s.getToasts()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
