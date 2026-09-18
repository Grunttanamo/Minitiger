import type { ApiClient } from 'jellyfin-apiclient';

import {
    getMinitigerAccessToken
} from './apiAuth';

const PREF_ID = 'minitiger';
const PREF_CLIENT = 'MinitigerWeb';
const BROADCAST_CONCURRENCY = 3;

interface DisplayPreferencesLike {
    Id?: string | null;
    CustomPrefs?: Record<string, string> | null;
    [key: string]: unknown;
}

type PreferenceUpdater = (
    currentValue: unknown
) => unknown;

const pendingReads =
    new WeakMap<object, Map<string, Promise<DisplayPreferencesLike | null>>>();

const writeQueues =
    new WeakMap<object, Map<string, Promise<unknown>>>();

const authenticatedUrl = (
    apiClient: ApiClient,
    path: string,
    params: Record<string, unknown> = {}
) => {
    const token = getMinitigerAccessToken(apiClient);

    return apiClient.getUrl(
        path,
        {
            ...params,
            ...(token ? { ApiKey: token } : {})
        }
    );
};

const getClientMap = <T>(
    store: WeakMap<object, Map<string, T>>,
    apiClient: ApiClient
) => {
    const key = apiClient as unknown as object;
    let map = store.get(key);

    if (!map) {
        map = new Map<string, T>();
        store.set(key, map);
    }

    return map;
};

const getPreferences = async (
    apiClient: ApiClient,
    userId: string
): Promise<DisplayPreferencesLike | null> => {
    const reads = getClientMap(
        pendingReads,
        apiClient
    );
    const existing = reads.get(userId);

    if (existing) {
        return await existing;
    }

    const request = (async () => {
        const response = await fetch(
            authenticatedUrl(
                apiClient,
                `DisplayPreferences/${PREF_ID}`,
                {
                    userId,
                    client: PREF_CLIENT
                }
            ),
            {
                method: 'GET'
            }
        );

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(
                `DisplayPreferences GET failed: ${response.status}`
            );
        }

        return await response.json() as DisplayPreferencesLike;
    })();

    reads.set(userId, request);

    try {
        return await request;
    } finally {
        if (reads.get(userId) === request) {
            reads.delete(userId);
        }
    }
};

const putPreferences = async (
    apiClient: ApiClient,
    userId: string,
    preferences: DisplayPreferencesLike
) => {
    const response = await fetch(
        authenticatedUrl(
            apiClient,
            `DisplayPreferences/${PREF_ID}`,
            {
                userId,
                client: PREF_CLIENT
            }
        ),
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        }
    );

    if (!response.ok) {
        throw new Error(
            `DisplayPreferences POST failed: ${response.status}`
        );
    }
};

const queueUserMutation = async <T>(
    apiClient: ApiClient,
    userId: string,
    task: () => Promise<T>
): Promise<T> => {
    const queues = getClientMap(
        writeQueues,
        apiClient
    );
    const previous =
        queues.get(userId)
        ?? Promise.resolve();

    const run = previous
        .catch(() => undefined)
        .then(task);

    queues.set(
        userId,
        run.then(
            () => undefined,
            () => undefined
        )
    );

    return await run;
};

const parsePreference = (
    preferences: DisplayPreferencesLike | null,
    key: string
): unknown => {
    const raw = preferences?.CustomPrefs?.[key];

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
};

const mutateMinitigerServerPreference = async (
    apiClient: ApiClient,
    userId: string,
    key: string,
    updater: PreferenceUpdater
) =>
    await queueUserMutation(
        apiClient,
        userId,
        async () => {
            const existing =
                await getPreferences(
                    apiClient,
                    userId
                )
                ?? {
                    Id: PREF_ID,
                    CustomPrefs: {}
                };

            const currentValue =
                parsePreference(
                    existing,
                    key
                );
            const nextValue =
                updater(currentValue);
            const nextRaw =
                JSON.stringify(nextValue);

            if (
                existing.CustomPrefs?.[key]
                === nextRaw
            ) {
                return;
            }

            const customPrefs = {
                ...(existing.CustomPrefs ?? {}),
                [key]: nextRaw
            };

            await putPreferences(
                apiClient,
                userId,
                {
                    ...existing,
                    Id: existing.Id ?? PREF_ID,
                    Client: PREF_CLIENT,
                    CustomPrefs: customPrefs
                }
            );
        }
    );

export const readMinitigerServerPreference = async <T>(
    apiClient: ApiClient,
    userId: string,
    key: string
): Promise<T | null> => {
    try {
        /*
         * A queued write for this user must finish first, otherwise a read
         * can immediately resurrect the value that existed before the write.
         */
        const queue =
            getClientMap(
                writeQueues,
                apiClient
            ).get(userId);

        if (queue) {
            await queue.catch(() => undefined);
        }

        const preferences = await getPreferences(
            apiClient,
            userId
        );

        const raw = preferences?.CustomPrefs?.[key];

        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as T;
    } catch (error) {
        console.warn(
            `[Minitiger ServerPrefs] ${key} konnte nicht gelesen werden`,
            error
        );
        return null;
    }
};

export const writeMinitigerServerPreference = async (
    apiClient: ApiClient,
    userId: string,
    key: string,
    value: unknown
) => {
    await mutateMinitigerServerPreference(
        apiClient,
        userId,
        key,
        () => value
    );
};

const runWithConcurrency = async (
    items: string[],
    worker: (item: string) => Promise<void>
) => {
    let nextIndex = 0;
    const results: PromiseSettledResult<void>[] = [];

    const runWorker = async () => {
        while (true) {
            const index = nextIndex;
            nextIndex += 1;

            if (index >= items.length) {
                return;
            }

            try {
                await worker(items[index]);
                results[index] = {
                    status: 'fulfilled',
                    value: undefined
                };
            } catch (reason) {
                results[index] = {
                    status: 'rejected',
                    reason
                };
            }
        }
    };

    const count = Math.min(
        BROADCAST_CONCURRENCY,
        items.length
    );

    await Promise.all(
        Array.from(
            { length: count },
            () => runWorker()
        )
    );

    return results;
};

export const broadcastMinitigerServerPreference = async (
    apiClient: ApiClient,
    key: string,
    value: unknown,
    preserveObjectKeys: readonly string[] = []
) => {
    let users: Array<{ Id?: string | null }> = [];

    try {
        users = await apiClient.getJSON(
            authenticatedUrl(
                apiClient,
                'Users'
            )
        ) as Array<{ Id?: string | null }>;
    } catch (error) {
        console.warn(
            '[Minitiger ServerPrefs] Benutzerliste konnte nicht geladen werden',
            error
        );

        const ownUserId = apiClient.getCurrentUserId();

        if (ownUserId) {
            await writeMinitigerServerPreference(
                apiClient,
                ownUserId,
                key,
                value
            );
        }

        return;
    }

    const ids = users
        .map(user => user.Id)
        .filter((id): id is string => Boolean(id));

    const sourceUserId =
        apiClient.getCurrentUserId();

    const results = await runWithConcurrency(
        ids,
        async userId => {
            await mutateMinitigerServerPreference(
                apiClient,
                userId,
                key,
                currentValue => {
                    if (
                        userId === sourceUserId
                        || preserveObjectKeys.length === 0
                        || !value
                        || typeof value !== 'object'
                        || Array.isArray(value)
                        || !currentValue
                        || typeof currentValue !== 'object'
                        || Array.isArray(currentValue)
                    ) {
                        return value;
                    }

                    const current =
                        currentValue as Record<string, unknown>;
                    const preserved =
                        Object.fromEntries(
                            preserveObjectKeys
                                .filter(preserveKey =>
                                    Object.prototype.hasOwnProperty.call(
                                        current,
                                        preserveKey
                                    )
                                )
                                .map(preserveKey => [
                                    preserveKey,
                                    current[preserveKey]
                                ])
                        );

                    return {
                        ...(value as Record<string, unknown>),
                        ...preserved
                    };
                }
            );
        }
    );

    const failed = results.filter(
        result => result?.status === 'rejected'
    ).length;

    if (failed > 0) {
        console.warn(
            `[Minitiger ServerPrefs] ${failed}/${results.length} Benutzer konnten nicht synchronisiert werden.`
        );
    }
};

// MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND
