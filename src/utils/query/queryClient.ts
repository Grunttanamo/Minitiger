import { QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

// TODO: Move this file to lib/query

/** HTTP status code for unauthorized requests. */
const HTTP_UNAUTHORIZED = 401;
/** Maximum garbage collection time. Set to 24 hours for persistence. */
const MAX_GC_TIME = 24 * 60 * 60 * 1000;
/** Maximum stale time. Set to 1 minute for query reuse. */
const MAX_STALENESS = 60 * 1000;
/** Maximum number of retries for failed queries. */
const MAX_RETRIES = 2;

// NOTE: queryClient needs to be defined before the QueryCache so that it can be used in the onError callback.
// eslint-disable-next-line prefer-const
export let queryClient: QueryClient;

/** Query cache for handling query errors and side effects. */
const queryCache = new QueryCache({
    onError: (error, { queryKey }) => {
        if (!queryClient) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestError = error as any;
        const status = requestError?.response?.status || requestError?.status || requestError?.statusCode;
        if (status === HTTP_UNAUTHORIZED) {
            try {
                // If a query fails due to authorization, cancel it and remove it from the cache to prevent showing
                // unauthorized data.
                void queryClient.cancelQueries({ queryKey });
                queryClient.setQueryData(queryKey, null);
            } catch (e) {
                console.warn('[QueryCache] failed to remove unauthorized data', e);
            }
        }
    }
});

queryClient = new QueryClient({
    queryCache,
    defaultOptions: {
        mutations: {
            networkMode: 'always' // network connection is not required if running on localhost
        },
        queries: {
            gcTime: MAX_GC_TIME,
            networkMode: 'always', // network connection is not required if running on localhost
            staleTime: MAX_STALENESS,
            retry: (failureCount, error) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const requestError = error as any;
                const status = requestError?.response?.status || requestError?.status || requestError?.statusCode;
                // Don't retry if unauthorized
                if (status === HTTP_UNAUTHORIZED) return false;
                return failureCount < MAX_RETRIES;
            }
        }
    }
});

/** Create an IndexedDB persister for react-query-persist-client. Uses idb-keyval for simplicity. */
const createIDBPersister = (idbValidKey: IDBValidKey = 'query-cache') => ({
    persistClient: async (client: PersistedClient) => {
        try {
            await set(idbValidKey, client);
        } catch (error) {
            const isDataCloneError =
                error instanceof DOMException
                && error.name === 'DataCloneError';

            if (!isDataCloneError) {
                throw error;
            }

            const isCloneable = (value: unknown) => {
                try {
                    window.structuredClone(value);
                    return true;
                } catch {
                    return false;
                }
            };

            const queries = client.clientState.queries.filter(isCloneable);
            const mutations = client.clientState.mutations.filter(isCloneable);

            const safeClient: PersistedClient = {
                ...client,
                clientState: {
                    ...client.clientState,
                    queries,
                    mutations
                }
            };

            console.warn(
                '[QueryCache] Nicht-klonbare Cache-Einträge wurden nicht in IndexedDB persistiert.',
                {
                    skippedQueries:
                        client.clientState.queries.length - queries.length,
                    skippedMutations:
                        client.clientState.mutations.length - mutations.length
                }
            );

            await set(idbValidKey, safeClient);
        }
    },
    restoreClient: () => {
        return get<PersistedClient>(idbValidKey);
    },
    removeClient: async () => {
        await del(idbValidKey);
    }
} satisfies Persister);

export const persister = createIDBPersister('jellyfin-query-cache');

// MINITIGER_PATCH_MARKER: PHASE_18_12_2_TEST_USER_RECOVERY_IDB_STABILITY
