import type { ApiClient } from 'jellyfin-apiclient';

import { getMinitigerAccessToken } from './apiAuth';

export interface MinitigerBrandingOptions {
    LoginDisclaimer?: string | null;
    [key: string]: unknown;
}

type BrandingMutator = (
    current: MinitigerBrandingOptions
) => MinitigerBrandingOptions;

const writeQueues = new WeakMap<object, Promise<unknown>>();

export const readMinitigerBrandingConfiguration = async (
    apiClient: ApiClient
): Promise<MinitigerBrandingOptions> =>
    await apiClient.getJSON(
        apiClient.getUrl('Branding/Configuration')
    ) as MinitigerBrandingOptions;

export const updateMinitigerBrandingConfiguration = async (
    apiClient: ApiClient,
    mutate: BrandingMutator
): Promise<MinitigerBrandingOptions> => {
    const clientKey = apiClient as unknown as object;
    const previous =
        writeQueues.get(clientKey)
        ?? Promise.resolve();

    const run = previous
        .catch(() => undefined)
        .then(async () => {
            const token = getMinitigerAccessToken(apiClient);

            if (!token) {
                throw new Error(
                    'Admin-Anmeldung für die globale Branding-Konfiguration fehlt.'
                );
            }

            /*
             * Always re-read immediately before writing.
             * Login design and toolbar branding share LoginDisclaimer.
             * Reading the newest value here prevents one editor from
             * overwriting the other editor's marker with stale state.
             */
            const current =
                await readMinitigerBrandingConfiguration(
                    apiClient
                );
            const next = mutate(current);

            const response = await fetch(
                apiClient.getUrl(
                    'System/Configuration/Branding',
                    { ApiKey: token }
                ),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(next)
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Branding POST fehlgeschlagen: HTTP ${response.status}`
                );
            }

            return next;
        });

    /*
     * Keep the queue alive even if one write fails.
     * Callers still receive the real rejecting promise above.
     */
    writeQueues.set(
        clientKey,
        run.then(
            () => undefined,
            () => undefined
        )
    );

    return await run;
};

// MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND
