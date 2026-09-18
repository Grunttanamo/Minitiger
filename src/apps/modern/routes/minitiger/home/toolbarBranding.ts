import type { ApiClient } from 'jellyfin-apiclient';

import {
    readMinitigerBrandingConfiguration,
    updateMinitigerBrandingConfiguration
} from './brandingConfig';

export interface MinitigerToolbarBrandingConfig {
    enabled: boolean;
    image: string;
    size: number;
}

const CONFIG_PATTERN =
    /<!--\s*MINITIGER_TOOLBAR_BRANDING:([A-Za-z0-9+/=]+)\s*-->/;

const TOOLBAR_BRANDING_EVENT =
    'minitiger:toolbar-branding-changed';

const brandingCache =
    new WeakMap<object, MinitigerToolbarBrandingConfig | null>();

const brandingReads =
    new WeakMap<object, Promise<MinitigerToolbarBrandingConfig | null>>();

const DEFAULT_CONFIG: MinitigerToolbarBrandingConfig = {
    enabled: false,
    image: '',
    size: 44
};

const clampSize = (value: unknown) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return 44;
    }

    return Math.min(72, Math.max(24, Math.round(parsed)));
};

export const normalizeMinitigerToolbarBranding = (
    value: unknown
): MinitigerToolbarBrandingConfig => {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_CONFIG };
    }

    const source =
        value as Partial<MinitigerToolbarBrandingConfig>;

    return {
        enabled: source.enabled === true,
        image:
            typeof source.image === 'string'
            && source.image.startsWith('data:image/')
            && source.image.length <= 240000
                ? source.image
                : '',
        size: clampSize(source.size)
    };
};

const encodeConfig = (
    config: MinitigerToolbarBrandingConfig
) => {
    const bytes =
        new TextEncoder().encode(
            JSON.stringify(
                normalizeMinitigerToolbarBranding(
                    config
                )
            )
        );
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
};

const decodeConfig = (
    disclaimer: string
): MinitigerToolbarBrandingConfig | null => {
    const match = CONFIG_PATTERN.exec(disclaimer);

    if (!match) {
        return null;
    }

    try {
        const binary = atob(match[1]);
        const bytes = Uint8Array.from(
            binary,
            character => character.charCodeAt(0)
        );

        return normalizeMinitigerToolbarBranding(
            JSON.parse(
                new TextDecoder().decode(bytes)
            )
        );
    } catch (error) {
        console.warn(
            '[Minitiger Branding] Globale Toolbar-Konfiguration ist ungültig.',
            error
        );
        return null;
    }
};

const withConfigMarker = (
    disclaimer: string,
    config: MinitigerToolbarBrandingConfig
) => {
    const clean = disclaimer
        .replace(CONFIG_PATTERN, '')
        .trimEnd();
    const marker =
        `<!--MINITIGER_TOOLBAR_BRANDING:${encodeConfig(config)}-->`;

    return clean
        ? `${clean}\n${marker}`
        : marker;
};

const notifyToolbarBranding = (
    config: MinitigerToolbarBrandingConfig
) => {
    window.dispatchEvent(
        new CustomEvent<MinitigerToolbarBrandingConfig>(
            TOOLBAR_BRANDING_EVENT,
            {
                detail:
                    normalizeMinitigerToolbarBranding(
                        config
                    )
            }
        )
    );
};

export const subscribeMinitigerToolbarBranding = (
    listener: (
        config: MinitigerToolbarBrandingConfig
    ) => void
) => {
    const handler = (event: Event) => {
        const custom =
            event as CustomEvent<MinitigerToolbarBrandingConfig>;

        if (custom.detail) {
            listener(
                normalizeMinitigerToolbarBranding(
                    custom.detail
                )
            );
        }
    };

    window.addEventListener(
        TOOLBAR_BRANDING_EVENT,
        handler
    );

    return () => {
        window.removeEventListener(
            TOOLBAR_BRANDING_EVENT,
            handler
        );
    };
};

export const readMinitigerToolbarBranding = async (
    apiClient: ApiClient
): Promise<MinitigerToolbarBrandingConfig | null> => {
    const clientKey =
        apiClient as unknown as object;

    if (brandingCache.has(clientKey)) {
        return brandingCache.get(clientKey) ?? null;
    }

    const pending = brandingReads.get(clientKey);

    if (pending) {
        return await pending;
    }

    const request = (async () => {
        try {
            const branding =
                await readMinitigerBrandingConfiguration(
                    apiClient
                );
            const decoded = decodeConfig(
                branding.LoginDisclaimer ?? ''
            );

            brandingCache.set(
                clientKey,
                decoded
            );

            return decoded;
        } finally {
            brandingReads.delete(clientKey);
        }
    })();

    brandingReads.set(clientKey, request);

    return await request;
};

export const writeMinitigerToolbarBranding = async (
    apiClient: ApiClient,
    config: MinitigerToolbarBrandingConfig
) => {
    const normalized =
        normalizeMinitigerToolbarBranding(
            config
        );

    await updateMinitigerBrandingConfiguration(
        apiClient,
        branding => ({
            ...branding,
            LoginDisclaimer: withConfigMarker(
                branding.LoginDisclaimer ?? '',
                normalized
            )
        })
    );

    brandingCache.set(
        apiClient as unknown as object,
        normalized
    );
    notifyToolbarBranding(normalized);
};

export const getDefaultMinitigerToolbarBranding =
    (): MinitigerToolbarBrandingConfig => ({
        ...DEFAULT_CONFIG
    });

// MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND
