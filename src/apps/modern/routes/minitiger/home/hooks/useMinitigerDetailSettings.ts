import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import {
    DEFAULT_DETAIL_SETTINGS,
    type MinitigerDetailSettings,
    normalizeDetailSettings
} from '../config/detailSettings';

const STORAGE_PREFIX =
    'Minitiger.DetailSettings.v1';
const SYNC_EVENT =
    'minitiger:detail-settings-changed';

const readSettings = (
    storageKey: string
) => {
    try {
        const raw =
            window.localStorage.getItem(
                storageKey
            );

        if (!raw) {
            return DEFAULT_DETAIL_SETTINGS;
        }

        return normalizeDetailSettings(
            JSON.parse(raw)
        );
    } catch (error) {
        console.warn(
            '[Minitiger Detail Settings] Einstellungen konnten nicht gelesen werden',
            error
        );

        return DEFAULT_DETAIL_SETTINGS;
    }
};

const useMinitigerDetailSettings = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const storageKey = useMemo(
        () => [
            STORAGE_PREFIX,
            apiClient?.serverId()
            ?? 'server',
            user?.Id
            ?? 'user'
        ].join(':'),
        [
            apiClient,
            user?.Id
        ]
    );

    const activeStorageKey =
        useRef(storageKey);

    const [
        settings,
        setSettings
    ] = useState<MinitigerDetailSettings>(
        () => readSettings(storageKey)
    );

    useEffect(() => {
        if (
            activeStorageKey.current
            === storageKey
        ) {
            return;
        }

        activeStorageKey.current =
            storageKey;

        setSettings(
            readSettings(storageKey)
        );
    }, [storageKey]);

    useEffect(() => {
        const root = document.documentElement;

        root.dataset.minitigerDetailLayout =
            settings.layoutMode;
        root.dataset.minitigerShowStudios =
            settings.showStudios ? 'true' : 'false';
        root.dataset.minitigerShowGenres =
            settings.showGenres ? 'true' : 'false';
    }, [
        settings.layoutMode,
        settings.showGenres,
        settings.showStudios
    ]);

    useEffect(() => {
        const onSync = (event: Event) => {
            const custom =
                event as CustomEvent<MinitigerDetailSettings>;

            if (!custom.detail) {
                return;
            }

            setSettings(
                normalizeDetailSettings(custom.detail)
            );
        };

        window.addEventListener(
            SYNC_EVENT,
            onSync
        );

        return () => {
            window.removeEventListener(
                SYNC_EVENT,
                onSync
            );
        };
    }, []);

    const persist = useCallback((
        next: MinitigerDetailSettings
    ) => {
        const normalized =
            normalizeDetailSettings(next);

        setSettings(normalized);

        try {
            window.localStorage.setItem(
                activeStorageKey.current,
                JSON.stringify(normalized)
            );
        } catch (error) {
            console.warn(
                '[Minitiger Detail Settings] Einstellungen konnten nicht gespeichert werden',
                error
            );
        }

        window.setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent<MinitigerDetailSettings>(
                    SYNC_EVENT,
                    { detail: normalized }
                )
            );
        }, 0);
    }, []);

    const updateSettings =
        useCallback((
            patch:
                Partial<MinitigerDetailSettings>
        ) => {
            setSettings(current => {
                const next =
                    normalizeDetailSettings({
                        ...current,
                        ...patch
                    });

                try {
                    window.localStorage.setItem(
                        activeStorageKey.current,
                        JSON.stringify(next)
                    );
                } catch (error) {
                    console.warn(
                        '[Minitiger Detail Settings] Einstellungen konnten nicht gespeichert werden',
                        error
                    );
                }

                window.setTimeout(() => {
                    window.dispatchEvent(
                        new CustomEvent<MinitigerDetailSettings>(
                            SYNC_EVENT,
                            { detail: next }
                        )
                    );
                }, 0);

                return next;
            });
        }, []);

    const resetSettings =
        useCallback(() => {
            persist(
                DEFAULT_DETAIL_SETTINGS
            );
        }, [persist]);

    return {
        settings,
        updateSettings,
        resetSettings,
        replaceSettings: persist
    };
};

export default useMinitigerDetailSettings;

// MINITIGER_PATCH_MARKER: PHASE_18_18_1_SAFE_DETAIL_SETTINGS_SYNC
