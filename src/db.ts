const DB_NAME = 'borderin';
const DB_VERSION = 3;
export const STORES = ['curse', 'rezervari', 'masini', 'setari', 'bilete', 'deconturi'] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        for (const s of STORES) {
          if (!req.result.objectStoreNames.contains(s)) {
            req.result.createObjectStore(s, { keyPath: 'id' });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  return wrap(db.transaction(store).objectStore(store).getAll() as IDBRequest<T[]>);
}

/** Rezolvă abia când tranzacția e încheiată (scrierea e durabilă), nu doar când cererea a reușit. */
function scrie(db: IDBDatabase, store: StoreName, op: (s: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    op(tx.objectStore(store));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  await scrie(await open(), store, (s) => s.put(value));
}

export async function remove(store: StoreName, id: string): Promise<void> {
  await scrie(await open(), store, (s) => s.delete(id));
}
