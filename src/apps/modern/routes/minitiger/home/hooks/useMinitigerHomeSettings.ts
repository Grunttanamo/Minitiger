import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import {
    DEFAULT_HOME_SETTINGS,
    type HomeRowId,
    type HomeSectionId,
    type MinitigerHomeSettings,
    normalizeHomeSettings
} from '../config/homeSettings';
import {
    broadcastMinitigerServerPreference,
    readMinitigerServerPreference,
    writeMinitigerServerPreference
} from '../serverPreferences';

const STORAGE_PREFIX = 'Minitiger.NativeHomeSettings.v1';
const SERVER_PREF_KEY = 'homeSettings';
const SYNC_EVENT = 'minitiger:home-settings-changed';

const cloneDefaults = (): MinitigerHomeSettings => ({
    ...DEFAULT_HOME_SETTINGS,
    sectionOrder: [
        ...DEFAULT_HOME_SETTINGS.sectionOrder
    ],
    homeRowOrder: [
        ...DEFAULT_HOME_SETTINGS.homeRowOrder
    ],
    visibleSections: {
        ...DEFAULT_HOME_SETTINGS.visibleSections
    }
});

const readSettings = (storageKey: string) => {
    try {
        const raw = window.localStorage.getItem(storageKey);

        if (!raw) {
            return cloneDefaults();
        }

        return normalizeHomeSettings(JSON.parse(raw));
    } catch (error) {
        console.warn(
            '[Minitiger Settings] Einstellungen konnten nicht gelesen werden',
            error
        );

        return cloneDefaults();
    }
};

const useMinitigerHomeSettings = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    const storageKey = useMemo(() => [
        STORAGE_PREFIX,
        apiClient?.serverId() ?? 'server',
        user?.Id ?? 'user'
    ].join(':'), [ apiClient, user?.Id ]);

    const activeStorageKey = useRef(storageKey);

    const [ settings, setSettingsState ] =
        useState<MinitigerHomeSettings>(
            () => readSettings(storageKey)
        );

    const serverSaveTimer = useRef<number | null>(null);
    const pendingServerValue = useRef<MinitigerHomeSettings | null>(null);

    useEffect(() => {
        if (activeStorageKey.current === storageKey) {
            return;
        }

        activeStorageKey.current = storageKey;
        setSettingsState(readSettings(storageKey));
    }, [ storageKey ]);

    useEffect(() => {
        const onSync = (event: Event) => {
            const custom = event as CustomEvent<MinitigerHomeSettings>;

            if (!custom.detail) {
                return;
            }

            setSettingsState(
                normalizeHomeSettings(custom.detail)
            );
        };

        window.addEventListener(SYNC_EVENT, onSync);

        return () => {
            window.removeEventListener(SYNC_EVENT, onSync);
        };
    }, []);

    useEffect(() => {
        const userId = user?.Id;

        if (!apiClient || !userId) {
            return;
        }

        let cancelled = false;

        void readMinitigerServerPreference<MinitigerHomeSettings>(
            apiClient,
            userId,
            SERVER_PREF_KEY
        ).then(serverValue => {
            if (cancelled) {
                return;
            }

            if (serverValue) {
                const normalized = normalizeHomeSettings(serverValue);
                setSettingsState(normalized);

                try {
                    window.localStorage.setItem(
                        activeStorageKey.current,
                        JSON.stringify(normalized)
                    );
                } catch {
                    // Server value remains authoritative for this load.
                }

                return;
            }

            if (isAdmin) {
                const localValue = readSettings(
                    activeStorageKey.current
                );

                void broadcastMinitigerServerPreference(
                    apiClient,
                    SERVER_PREF_KEY,
                    localValue
                );
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        apiClient,
        isAdmin,
        user?.Id
    ]);

    const saveToServer = useCallback((
        value: MinitigerHomeSettings
    ) => {
        const userId = user?.Id;

        if (!apiClient || !userId) {
            return;
        }

        pendingServerValue.current = value;

        if (serverSaveTimer.current != null) {
            window.clearTimeout(serverSaveTimer.current);
        }

        serverSaveTimer.current = window.setTimeout(() => {
            serverSaveTimer.current = null;

            const pending = pendingServerValue.current;
            pendingServerValue.current = null;

            if (!pending) {
                return;
            }

            if (isAdmin) {
                void broadcastMinitigerServerPreference(
                    apiClient,
                    SERVER_PREF_KEY,
                    pending
                );
            } else {
                void writeMinitigerServerPreference(
                    apiClient,
                    userId,
                    SERVER_PREF_KEY,
                    pending
                );
            }
        }, 450);
    }, [
        apiClient,
        isAdmin,
        user?.Id
    ]);

    useEffect(() => () => {
        if (serverSaveTimer.current != null) {
            window.clearTimeout(serverSaveTimer.current);
        }
    }, []);

    const saveLocal = useCallback((
        value: MinitigerHomeSettings,
        warning: string
    ) => {
        try {
            window.localStorage.setItem(
                activeStorageKey.current,
                JSON.stringify(value)
            );
        } catch (error) {
            console.warn(warning, error);
        }

        window.dispatchEvent(
            new CustomEvent<MinitigerHomeSettings>(
                SYNC_EVENT,
                { detail: value }
            )
        );

        saveToServer(value);
    }, [saveToServer]);

    const persist = useCallback((
        nextSettings: MinitigerHomeSettings
    ) => {
        const normalized =
            normalizeHomeSettings(nextSettings);

        setSettingsState(normalized);
        saveLocal(
            normalized,
            '[Minitiger Settings] Einstellungen konnten nicht gespeichert werden'
        );
    }, [saveLocal]);

    const updateSettings = useCallback((
        patch: Partial<MinitigerHomeSettings>
    ) => {
        setSettingsState(current => {
            const next = normalizeHomeSettings({
                ...current,
                ...patch
            });

            saveLocal(
                next,
                '[Minitiger Settings] Einstellungen konnten nicht gespeichert werden'
            );

            return next;
        });
    }, [saveLocal]);

    const toggleSection = useCallback((
        sectionId: HomeSectionId
    ) => {
        setSettingsState(current => {
            const next = normalizeHomeSettings({
                ...current,
                visibleSections: {
                    ...current.visibleSections,
                    [sectionId]:
                        !current.visibleSections[sectionId]
                }
            });

            saveLocal(
                next,
                '[Minitiger Settings] Einstellungen konnten nicht gespeichert werden'
            );

            return next;
        });
    }, [saveLocal]);

    const moveHomeRow = useCallback((
        rowId: HomeRowId,
        direction: -1 | 1
    ) => {
        setSettingsState(current => {
            const currentIndex =
                current.homeRowOrder.indexOf(rowId);
            const targetIndex =
                currentIndex + direction;

            if (
                currentIndex < 0
                || targetIndex < 0
                || targetIndex >= current.homeRowOrder.length
            ) {
                return current;
            }

            const nextOrder = [
                ...current.homeRowOrder
            ];

            const [ moved ] =
                nextOrder.splice(currentIndex, 1);

            nextOrder.splice(
                targetIndex,
                0,
                moved
            );

            const next = normalizeHomeSettings({
                ...current,
                homeRowOrder: nextOrder
            });

            saveLocal(
                next,
                '[Minitiger Settings] Einstellungen konnten nicht gespeichert werden'
            );

            return next;
        });
    }, [saveLocal]);

    const reorderHomeRows = useCallback((
        sourceId: HomeRowId,
        targetId: HomeRowId
    ) => {
        if (sourceId === targetId) {
            return;
        }

        setSettingsState(current => {
            const nextOrder = [
                ...current.homeRowOrder
            ];

            const sourceIndex =
                nextOrder.indexOf(sourceId);
            const targetIndex =
                nextOrder.indexOf(targetId);

            if (
                sourceIndex < 0
                || targetIndex < 0
            ) {
                return current;
            }

            const [ moved ] =
                nextOrder.splice(sourceIndex, 1);

            nextOrder.splice(
                targetIndex,
                0,
                moved
            );

            const next = normalizeHomeSettings({
                ...current,
                homeRowOrder: nextOrder
            });

            saveLocal(
                next,
                '[Minitiger Settings] Reihenfolge konnte nicht gespeichert werden'
            );

            return next;
        });
    }, [saveLocal]);

    /**
     * Legacy helper retained for older call sites. New UI uses
     * moveHomeRow so system/custom/virtual rows can share one order.
     */
    const moveSection = useCallback((
        sectionId: HomeSectionId,
        direction: -1 | 1
    ) => {
        if (sectionId === 'libraries') {
            return;
        }

        moveHomeRow(
            sectionId as HomeRowId,
            direction
        );
    }, [moveHomeRow]);

    const resetSettings = useCallback(() => {
        persist(cloneDefaults());
    }, [persist]);

    return {
        settings,
        updateSettings,
        toggleSection,
        moveSection,
        moveHomeRow,
        reorderHomeRows,
        resetSettings
    };
};

export default useMinitigerHomeSettings;
