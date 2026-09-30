/**
 * The recording that hasn't been confirmed yet, kept on the phone. Browser only.
 *
 * Re-recording is the one failure nobody forgives, so a finished recording is written to
 * IndexedDB the moment it exists and only removed once the server has confirmed the post.
 * Switching tabs, the browser discarding a backgrounded page, the app being closed or the
 * connection dropping all leave it here, and the record page picks it back up.
 *
 * One slot, not a queue: there is one waffle per person per week, so a second recording
 * replaces the first exactly as posting it would.
 *
 * Every call is best effort. A browser that refuses storage (some private modes) simply
 * gets the old in-memory behaviour rather than an error.
 */

export interface PendingWaffle {
  groupSlug: string;
  blob: Blob;
  thumbnail: Blob | null;
  durationSeconds: number;
  caption: string;
  /** True once Post was pressed, so coming back resumes the upload rather than asking again. */
  posting: boolean;
  savedAt: number;
}

const DB_NAME = 'waffle';
const STORE = 'pending';
const KEY = 'current';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = act(transaction.objectStore(STORE));
      transaction.oncomplete = () => {
        db.close();
        resolve(request.result as T);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    return null;
  }
}

export async function loadPending(): Promise<PendingWaffle | null> {
  const value = await run<PendingWaffle | undefined>('readonly', (store) => store.get(KEY));
  return value ?? null;
}

/** Whether it actually stuck, so the page knows if leaving is safe. */
export async function savePending(value: PendingWaffle): Promise<boolean> {
  return (await run('readwrite', (store) => store.put(value, KEY))) !== null;
}

export async function updatePending(changes: Partial<PendingWaffle>): Promise<void> {
  const current = await loadPending();
  if (current) await savePending({ ...current, ...changes });
}

export async function clearPending(): Promise<void> {
  await run('readwrite', (store) => store.delete(KEY));
}
