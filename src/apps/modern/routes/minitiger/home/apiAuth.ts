import type { ApiClient } from 'jellyfin-apiclient';

export const getMinitigerAccessToken = (
    apiClient?: ApiClient
) => {
    if (!apiClient) {
        return undefined;
    }

    const compatibleClient =
        apiClient as unknown as {
            accessToken?: () => string | null | undefined;
            getAccessToken?: () => string | null | undefined;
        };

    const direct =
        compatibleClient.accessToken?.()
        ?? compatibleClient.getAccessToken?.();

    if (direct) {
        return direct;
    }

    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        const raw = window.localStorage.getItem(
            'jellyfin_credentials'
        );

        if (!raw) {
            return undefined;
        }

        const credentials = JSON.parse(raw) as {
            Servers?: Array<{
                Id?: string;
                AccessToken?: string;
            }>;
        };

        const serverId = apiClient.serverId?.();

        return credentials.Servers
            ?.find(server =>
                !serverId
                || server.Id === serverId
            )
            ?.AccessToken;
    } catch {
        return undefined;
    }
};
