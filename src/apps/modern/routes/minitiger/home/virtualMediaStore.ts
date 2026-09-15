const DB_NAME = 'MinitigerVirtualMedia';
const DB_VERSION = 1;
const STORE_NAME = 'media';

interface StoredVirtualMedia {
    key: string;
    blob: Blob;
    updatedAt: number;
}

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB ist in diesem Client nicht verfügbar.'));
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, {
                keyPath: 'key'
            });
        }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(
        request.error ?? new Error('Virtueller Medienspeicher konnte nicht geöffnet werden.')
    );
});

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
) => {
    const database = await openDatabase();

    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, mode);
            const request = operation(transaction.objectStore(STORE_NAME));

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(
                request.error ?? new Error('Virtueller Medienspeicher: Operation fehlgeschlagen.')
            );
            transaction.onerror = () => reject(
                transaction.error ?? new Error('Virtueller Medienspeicher: Transaktion fehlgeschlagen.')
            );
        });
    } finally {
        database.close();
    }
};

export const getVirtualVideoStorageKey = (libraryId: string) =>
    `virtual-video-${libraryId}`;

export const putVirtualVideo = async (
    libraryId: string,
    file: Blob
) => {
    const key = getVirtualVideoStorageKey(libraryId);

    await runTransaction<IDBValidKey>(
        'readwrite',
        store => store.put({
            key,
            blob: file,
            updatedAt: Date.now()
        } satisfies StoredVirtualMedia)
    );

    return key;
};

export const getVirtualVideo = async (
    key: string
): Promise<Blob | null> => {
    if (!key) {
        return null;
    }

    const result = await runTransaction<StoredVirtualMedia | undefined>(
        'readonly',
        store => store.get(key)
    );

    return result?.blob ?? null;
};

export const deleteVirtualVideo = async (key: string) => {
    if (!key) {
        return;
    }

    await runTransaction<undefined>(
        'readwrite',
        store => store.delete(key) as IDBRequest<undefined>
    );
};
