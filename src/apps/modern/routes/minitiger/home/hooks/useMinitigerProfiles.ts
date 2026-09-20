import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import {
    DEFAULT_MINITIGER_PROFILES_CONFIG,
    MAX_MINITIGER_SUBPROFILES,
    normalizeMinitigerProfilesConfig,
    normalizeProfileAvatar,
    normalizeProfileAvatarImage,
    type MinitigerProfile,
    type MinitigerProfileAvatarId,
    type MinitigerProfilesConfig
} from '../config/profiles';
import {
    normalizeMinitigerAvatarSettings
} from '../config/avatarSettings';
import {
    deleteMinitigerServerProfile,
    getMinitigerHouseholdContext,
    syncMinitigerServerProfiles
} from '../profileIdentity';

const PROFILES_EVENT = 'minitiger:profiles-changed';
const PROFILE_SELECTION_EVENT =
    'minitiger:profile-selection-changed';
const PROFILE_SELECTION_REQUEST_EVENT =
    'minitiger:profile-selection-requested';
const CLOSE_SETTINGS_EVENT =
    'minitiger:close-settings';

const readJson = (
    storage: Storage,
    key: string
): unknown => {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const AVATAR_SETTINGS_PREFIX =
    'Minitiger.CustomAvatar.v1';
const AVATAR_SETTINGS_EVENT =
    'minitiger:avatar-settings-changed';

const readOwnerAvatarImage = (
    serverId: string,
    ownerId: string
) => {
    if (!serverId || !ownerId) {
        return '';
    }

    try {
        const raw = localStorage.getItem(
            `${AVATAR_SETTINGS_PREFIX}:${serverId}:${ownerId}`
        );

        if (!raw) {
            return '';
        }

        return normalizeMinitigerAvatarSettings(
            JSON.parse(raw)
        ).image;
    } catch {
        return '';
    }
};

const makeProfileId = () => (
    `profile-${Date.now().toString(36)}-${
        Math.random().toString(36).slice(2, 8)
    }`
);

const useMinitigerProfiles = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const serverId = (() => {
        try {
            return apiClient?.serverId?.() ?? 'server';
        } catch {
            return 'server';
        }
    })();

    const household = getMinitigerHouseholdContext(
        apiClient,
        user
    );

    const ownerId = household.ownerUserId;
    const ownerName = household.ownerUserName;

    const namespace = ownerId
        ? `${serverId}:${ownerId}`
        : '';

    const storageKey = namespace
        ? `minitiger.profiles.v1:${namespace}`
        : '';

    const selectionKey = namespace
        ? `minitiger.profile-selection.v1:${namespace}`
        : '';

    const readCurrentConfig = useCallback(() => {
        if (!storageKey) {
            return {
                ...DEFAULT_MINITIGER_PROFILES_CONFIG,
                profiles: []
            };
        }

        return normalizeMinitigerProfilesConfig(
            readJson(localStorage, storageKey)
        );
    }, [storageKey]);

    const readCurrentSelection = useCallback(() => {
        if (!selectionKey) {
            return null;
        }

        try {
            return sessionStorage.getItem(selectionKey);
        } catch {
            return null;
        }
    }, [selectionKey]);

    const [ config, setConfig ] =
        useState<MinitigerProfilesConfig>(
            () => readCurrentConfig()
        );
    const [
        selectedProfileId,
        setSelectedProfileId
    ] = useState<string | null>(
        () => readCurrentSelection()
    );
    const [
        loadedNamespace,
        setLoadedNamespace
    ] = useState(
        () => namespace
    );

    const isReady = Boolean(
        namespace
        && loadedNamespace === namespace
    );

    const [ ownerAvatarImage, setOwnerAvatarImage ] =
        useState(
            () => readOwnerAvatarImage(
                serverId,
                ownerId
            )
        );

    const loadConfig = useCallback(() => {
        setConfig(
            readCurrentConfig()
        );
    }, [readCurrentConfig]);

    const loadSelection = useCallback(() => {
        setSelectedProfileId(
            readCurrentSelection()
        );
    }, [readCurrentSelection]);

    useEffect(() => {
        /*
         * A profile namespace can become available only after useApi().user
         * updates. Until BOTH config and selection for that exact namespace
         * have been loaded, Home must not infer that "no subprofiles" means
         * the owner is active.
         *
         * This removes the one-render owner fallback that previously caused
         * TestNutzer -> Home -> Tanamo.
         */
        loadConfig();
        loadSelection();
        setLoadedNamespace(namespace);
    }, [
        loadConfig,
        loadSelection,
        namespace
    ]);

    useEffect(() => {
        const avatarStorageKey =
            ownerId
                ? `${AVATAR_SETTINGS_PREFIX}:${serverId}:${ownerId}`
                : '';

        const refreshOwnerAvatar = () => {
            setOwnerAvatarImage(
                readOwnerAvatarImage(
                    serverId,
                    ownerId
                )
            );
        };

        const onAvatarChanged = (event: Event) => {
            const custom =
                event as CustomEvent<{
                    userId?: string;
                }>;

            if (
                custom.detail?.userId === ownerId
            ) {
                refreshOwnerAvatar();
            }
        };

        const onStorage = (event: StorageEvent) => {
            if (
                avatarStorageKey
                && event.key === avatarStorageKey
            ) {
                refreshOwnerAvatar();
            }
        };

        refreshOwnerAvatar();

        window.addEventListener(
            AVATAR_SETTINGS_EVENT,
            onAvatarChanged
        );
        window.addEventListener(
            'storage',
            onStorage
        );

        return () => {
            window.removeEventListener(
                AVATAR_SETTINGS_EVENT,
                onAvatarChanged
            );
            window.removeEventListener(
                'storage',
                onStorage
            );
        };
    }, [
        ownerId,
        serverId
    ]);

    useEffect(() => {
        const onProfilesChanged = (event: Event) => {
            const custom = event as CustomEvent<string>;

            if (custom.detail === namespace) {
                loadConfig();
            }
        };

        const onSelectionChanged = (event: Event) => {
            const custom = event as CustomEvent<string>;

            if (custom.detail === namespace) {
                loadSelection();
            }
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === storageKey) {
                loadConfig();
            }
        };

        window.addEventListener(
            PROFILES_EVENT,
            onProfilesChanged
        );
        window.addEventListener(
            PROFILE_SELECTION_EVENT,
            onSelectionChanged
        );
        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener(
                PROFILES_EVENT,
                onProfilesChanged
            );
            window.removeEventListener(
                PROFILE_SELECTION_EVENT,
                onSelectionChanged
            );
            window.removeEventListener(
                'storage',
                onStorage
            );
        };
    }, [
        loadConfig,
        loadSelection,
        namespace,
        storageKey
    ]);

    const persistConfig = useCallback((
        next: MinitigerProfilesConfig
    ) => {
        if (!storageKey || !namespace) {
            return;
        }

        const normalized =
            normalizeMinitigerProfilesConfig(next);

        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify(normalized)
            );
        } catch (error) {
            console.warn(
                '[Minitiger Profiles] Speichern fehlgeschlagen',
                error
            );
            return;
        }

        setConfig(normalized);

        window.dispatchEvent(
            new CustomEvent(PROFILES_EVENT, {
                detail: namespace
            })
        );
    }, [
        namespace,
        storageKey
    ]);

    const ownerProfile = useMemo<MinitigerProfile>(() => ({
        id: 'owner',
        name: ownerName,
        avatar: 'tiger',
        avatarImage: ownerAvatarImage,
        createdAt: '',
        isOwner: true
    }), [
        ownerAvatarImage,
        ownerName
    ]);

    const profiles = useMemo<MinitigerProfile[]>(() => ([
        ownerProfile,
        ...config.profiles.map(profile => ({
            ...profile,
            isOwner: false
        }))
    ]), [
        config.profiles,
        ownerProfile
    ]);

    const hasSubprofiles = config.profiles.length > 0;

    useEffect(() => {
        if (
            !apiClient
            || !household.isOwnerIdentity
            || config.profiles.length === 0
        ) {
            return;
        }

        void syncMinitigerServerProfiles(
            apiClient,
            [
                ownerProfile,
                ...config.profiles.map(profile => ({
                    ...profile,
                    isOwner: false
                }))
            ]
        ).catch(error => {
            console.warn(
                '[Minitiger Profiles] Server-Profilabgleich fehlgeschlagen.',
                error
            );
        });
    }, [
        apiClient,
        config.profiles,
        household.isOwnerIdentity,
        ownerProfile
    ]);

    const activeProfile = useMemo(() => {
        if (!isReady) {
            return null;
        }

        if (!hasSubprofiles) {
            return ownerProfile;
        }

        if (!selectedProfileId) {
            return null;
        }

        return profiles.find(
            profile => profile.id === selectedProfileId
        ) ?? null;
    }, [
        hasSubprofiles,
        isReady,
        ownerProfile,
        profiles,
        selectedProfileId
    ]);

    const selectProfile = useCallback((
        profileId: string
    ) => {
        if (
            !selectionKey
            || !namespace
            || !profiles.some(profile =>
                profile.id === profileId
            )
        ) {
            return;
        }

        try {
            sessionStorage.setItem(
                selectionKey,
                profileId
            );
        } catch {
            return;
        }

        setSelectedProfileId(profileId);

        window.dispatchEvent(
            new CustomEvent(PROFILE_SELECTION_EVENT, {
                detail: namespace
            })
        );
    }, [
        namespace,
        profiles,
        selectionKey
    ]);

    const requestSelection = useCallback(() => {
        if (!selectionKey || !namespace) {
            return;
        }

        try {
            sessionStorage.removeItem(selectionKey);
        } catch {
            return;
        }

        setSelectedProfileId(null);

        window.dispatchEvent(
            new CustomEvent(PROFILE_SELECTION_EVENT, {
                detail: namespace
            })
        );

        window.dispatchEvent(
            new CustomEvent(CLOSE_SETTINGS_EVENT)
        );

        window.dispatchEvent(
            new CustomEvent(PROFILE_SELECTION_REQUEST_EVENT, {
                detail: namespace
            })
        );
    }, [
        namespace,
        selectionKey
    ]);

    const addProfile = useCallback((
        name: string,
        avatar: MinitigerProfileAvatarId,
        avatarImage = ''
    ) => {
        if (!household.isOwnerIdentity) {
            return false;
        }

        const cleanName = name.trim().slice(0, 28);

        if (
            !cleanName
            || config.profiles.length
                >= MAX_MINITIGER_SUBPROFILES
        ) {
            return false;
        }

        persistConfig({
            version: 1,
            profiles: [
                ...config.profiles,
                {
                    id: makeProfileId(),
                    name: cleanName,
                    avatar: normalizeProfileAvatar(avatar),
                    avatarImage:
                        normalizeProfileAvatarImage(
                            avatarImage
                        ),
                    createdAt: new Date().toISOString()
                }
            ]
        });

        return true;
    }, [
        config.profiles,
        household.isOwnerIdentity,
        persistConfig
    ]);

    const updateProfile = useCallback((
        profileId: string,
        patch: Partial<{
            name: string;
            avatar: MinitigerProfileAvatarId;
            avatarImage: string;
        }>
    ) => {
        if (!household.isOwnerIdentity) {
            return;
        }

        persistConfig({
            version: 1,
            profiles: config.profiles.map(profile => {
                if (profile.id !== profileId) {
                    return profile;
                }

                const nextName =
                    typeof patch.name === 'string'
                        ? patch.name.trim().slice(0, 28)
                        : profile.name;

                return {
                    ...profile,
                    name: nextName || profile.name,
                    avatar:
                        patch.avatar !== undefined
                            ? normalizeProfileAvatar(
                                patch.avatar
                            )
                            : profile.avatar,
                    avatarImage:
                        patch.avatarImage !== undefined
                            ? normalizeProfileAvatarImage(
                                patch.avatarImage
                            )
                            : profile.avatarImage
                };
            })
        });
    }, [
        config.profiles,
        household.isOwnerIdentity,
        persistConfig
    ]);

    const removeProfile = useCallback((
        profileId: string
    ) => {
        if (!household.isOwnerIdentity) {
            return;
        }

        persistConfig({
            version: 1,
            profiles: config.profiles.filter(
                profile => profile.id !== profileId
            )
        });

        if (apiClient) {
            void deleteMinitigerServerProfile(
                apiClient,
                profileId
            ).catch(error => {
                console.warn(
                    '[Minitiger Profiles] Technische Jellyfin-Identität konnte nicht entfernt werden.',
                    error
                );
            });
        }

        if (selectedProfileId === profileId) {
            requestSelection();
        }
    }, [
        apiClient,
        config.profiles,
        household.isOwnerIdentity,
        persistConfig,
        requestSelection,
        selectedProfileId
    ]);

    return {
        ownerProfile,
        subProfiles: config.profiles,
        profiles,
        activeProfile,
        hasSubprofiles,
        isReady,
        requiresSelection:
            isReady
            && hasSubprofiles
            && !activeProfile,
        canManageProfiles:
            household.isOwnerIdentity,
        canAddProfile:
            household.isOwnerIdentity
            && config.profiles.length
                < MAX_MINITIGER_SUBPROFILES,
        selectProfile,
        requestSelection,
        addProfile,
        updateProfile,
        removeProfile
    };
};

export type MinitigerProfilesController =
    ReturnType<typeof useMinitigerProfiles>;

export default useMinitigerProfiles;

// MINITIGER_PATCH_MARKER: PHASE_18_17_1_PROFILE_STORE

// MINITIGER_PATCH_MARKER: PHASE_18_17_2C_PROFILE_NAMESPACE_READY

// MINITIGER_PATCH_MARKER: PHASE_18_17_3_OWNER_CUSTOM_AVATAR_SYNC

// MINITIGER_PATCH_MARKER: PHASE_18_17_4_GLOBAL_PROFILE_SELECTION_REQUEST
