import type { ApiClient } from 'jellyfin-apiclient';

import {
    getMinitigerAccessToken
} from './apiAuth';

const PREF_ID = 'minitiger';
const PREF_CLIENT = 'MinitigerWeb';

interface DisplayPreferencesLike {
    Id?: string | null;
    CustomPrefs?: Record<string, string> | null;
    [key: string]: unknown;
}

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

const getPreferences = async (
    apiClient: ApiClient,
    userId: string
): Promise<DisplayPreferencesLike | null> => {
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

export const readMinitigerServerPreference = async <T>(
    apiClient: ApiClient,
    userId: string,
    key: string
): Promise<T | null> => {
    try {
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
    const existing =
        await getPreferences(apiClient, userId)
        ?? {
            Id: PREF_ID,
            CustomPrefs: {}
        };

    const customPrefs = {
        ...(existing.CustomPrefs ?? {}),
        [key]: JSON.stringify(value)
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

    const results = await Promise.allSettled(
        ids.map(async userId => {
            let nextValue = value;

            if (
                userId !== sourceUserId
                && preserveObjectKeys.length > 0
                && value
                && typeof value === 'object'
                && !Array.isArray(value)
            ) {
                const existing =
                    await readMinitigerServerPreference<
                        Record<string, unknown>
                    >(
                        apiClient,
                        userId,
                        key
                    );

                if (
                    existing
                    && typeof existing === 'object'
                    && !Array.isArray(existing)
                ) {
                    const preserved = Object.fromEntries(
                        preserveObjectKeys
                            .filter(preserveKey =>
                                Object.prototype.hasOwnProperty.call(
                                    existing,
                                    preserveKey
                                )
                            )
                            .map(preserveKey => [
                                preserveKey,
                                existing[preserveKey]
                            ])
                    );

                    nextValue = {
                        ...(value as Record<string, unknown>),
                        ...preserved
                    };
                }
            }

            return writeMinitigerServerPreference(
                apiClient,
                userId,
                key,
                nextValue
            );
        })
    );

    const failed = results.filter(
        result => result.status === 'rejected'
    ).length;

    if (failed > 0) {
        console.warn(
            `[Minitiger ServerPrefs] ${failed}/${results.length} Benutzer konnten nicht synchronisiert werden.`
        );
    }
};
