import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import { getMinitigerAccessToken } from '../apiAuth';
import {
    DEFAULT_MINITIGER_AVATAR_GALLERY,
    type MinitigerAvatarGalleryConfig,
    type MinitigerAvatarGalleryItem,
    normalizeMinitigerAvatarGallery
} from '../config/avatarGallery';
import {
    broadcastMinitigerServerPreference,
    readMinitigerServerPreference
} from '../serverPreferences';
import {
    deleteMinitigerVirtualServerMedia,
    getMinitigerVirtualServerMediaUrl,
    uploadMinitigerVirtualServerMedia
} from '../virtualServerSync';

const SERVER_PREF_KEY = 'avatarGallery';
const STORAGE_PREFIX = 'Minitiger.AvatarGallery.v1';
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const TARGET_SIZE = 512;
const ALLOWED_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
]);

const createGalleryUpload = (
    file: File
): Promise<Blob> => new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.has(file.type)) {
        reject(new Error('Bitte PNG, JPG oder WebP verwenden.'));
        return;
    }

    if (file.size > MAX_INPUT_BYTES) {
        reject(new Error('Das Bild darf maximal 8 MB groß sein.'));
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    image.onerror = () => {
        cleanup();
        reject(new Error('Das Bild konnte nicht gelesen werden.'));
    };

    image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        if (!width || !height) {
            cleanup();
            reject(new Error('Das Bild hat keine gültigen Abmessungen.'));
            return;
        }

        const size = Math.min(width, height);
        const x = Math.max(0, Math.round((width - size) / 2));
        const y = Math.max(0, Math.round((height - size) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        const context = canvas.getContext('2d');

        if (!context) {
            cleanup();
            reject(new Error('Das Bild konnte nicht verarbeitet werden.'));
            return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            image,
            x,
            y,
            size,
            size,
            0,
            0,
            TARGET_SIZE,
            TARGET_SIZE
        );

        canvas.toBlob(blob => {
            cleanup();

            if (!blob) {
                reject(new Error('Das Avatar-Bild konnte nicht komprimiert werden.'));
                return;
            }

            resolve(blob);
        }, 'image/webp', 0.86);
    };

    image.src = objectUrl;
});

const makeAvatarId = () => (
    `mtavatar_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
);

const getFileLabel = (file: File) => {
    const raw = file.name.replace(/\.[^.]+$/, '').trim();
    return raw.slice(0, 60) || 'Avatar';
};

const readSharedAvatarGallery = async (
    apiClient: NonNullable<ReturnType<typeof useApi>['__legacyApiClient__']>
): Promise<MinitigerAvatarGalleryConfig | null> => {
    try {
        const token = getMinitigerAccessToken(apiClient);
        const response = await fetch(
            apiClient.getUrl(
                'Minitiger/Profiles/AvatarGallery',
                token ? { ApiKey: token } : {}
            ),
            { method: 'GET' }
        );

        if (!response.ok) {
            return null;
        }

        return normalizeMinitigerAvatarGallery(
            await response.json()
        );
    } catch (error) {
        console.warn(
            '[Minitiger Avatar] Gemeinsame Avatar-Galerie konnte nicht geladen werden.',
            error
        );
        return null;
    }
};

const useMinitigerAvatarGallery = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const userId = user?.Id ?? '';
    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    const storageKey = useMemo(() => [
        STORAGE_PREFIX,
        apiClient?.serverId() ?? 'server',
        userId || 'user'
    ].join(':'), [ apiClient, userId ]);

    const activeStorageKey = useRef(storageKey);

    const readLocal = useCallback(() => {
        try {
            const raw = window.localStorage.getItem(
                activeStorageKey.current
            );

            return raw
                ? normalizeMinitigerAvatarGallery(JSON.parse(raw))
                : { ...DEFAULT_MINITIGER_AVATAR_GALLERY, items: [] };
        } catch {
            return { ...DEFAULT_MINITIGER_AVATAR_GALLERY, items: [] };
        }
    }, []);

    const [ config, setConfig ] = useState<MinitigerAvatarGalleryConfig>(
        () => readLocal()
    );
    const configRef = useRef(config);
    const [ loading, setLoading ] = useState(false);

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    const saveLocal = useCallback((
        next: MinitigerAvatarGalleryConfig
    ) => {
        configRef.current = next;
        setConfig(next);
        try {
            window.localStorage.setItem(
                activeStorageKey.current,
                JSON.stringify(next)
            );
        } catch {
            // Server copy remains authoritative.
        }
    }, []);

    useEffect(() => {
        if (activeStorageKey.current !== storageKey) {
            activeStorageKey.current = storageKey;
            setConfig(readLocal());
        }
    }, [ readLocal, storageKey ]);

    const refresh = useCallback(async () => {
        if (!apiClient || !userId) {
            return;
        }

        setLoading(true);
        try {
            const serverValue =
                await readMinitigerServerPreference<MinitigerAvatarGalleryConfig>(
                    apiClient,
                    userId,
                    SERVER_PREF_KEY
                );

            const normalizedServerValue =
                serverValue
                    ? normalizeMinitigerAvatarGallery(serverValue)
                    : null;

            if (
                normalizedServerValue
                && normalizedServerValue.items.length > 0
            ) {
                saveLocal(normalizedServerValue);
                return;
            }

            const sharedGallery =
                await readSharedAvatarGallery(apiClient);

            if (
                sharedGallery
                && sharedGallery.items.length > 0
            ) {
                saveLocal(sharedGallery);
                return;
            }

            if (normalizedServerValue) {
                saveLocal(normalizedServerValue);
            }
        } finally {
            setLoading(false);
        }
    }, [ apiClient, saveLocal, userId ]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const publish = useCallback(async (
        nextValue: MinitigerAvatarGalleryConfig
    ) => {
        if (!apiClient || !isAdmin) {
            throw new Error('Nur Administratoren dürfen die Avatar-Galerie ändern.');
        }

        const normalized = normalizeMinitigerAvatarGallery(nextValue);
        saveLocal(normalized);

        await broadcastMinitigerServerPreference(
            apiClient,
            SERVER_PREF_KEY,
            normalized
        );
    }, [ apiClient, isAdmin, saveLocal ]);

    const uploadAvatarMedia = useCallback(async (
        file: File
    ): Promise<MinitigerAvatarGalleryItem> => {
        if (!apiClient || !isAdmin) {
            throw new Error('Nur Administratoren dürfen Avatare hochladen.');
        }

        const id = makeAvatarId();
        const blob = await createGalleryUpload(file);
        const uploaded = await uploadMinitigerVirtualServerMedia(
            apiClient,
            id,
            'image',
            blob,
            `${id}.webp`
        );

        return {
            id,
            name: getFileLabel(file),
            revision: uploaded.revision
        };
    }, [ apiClient, isAdmin ]);

    const uploadAvatar = useCallback(async (file: File) => {
        const item = await uploadAvatarMedia(file);

        await publish({
            items: [ ...configRef.current.items, item ]
        });

        return item;
    }, [ publish, uploadAvatarMedia ]);

    const uploadAvatars = useCallback(async (files: File[]) => {
        if (!files.length) {
            return [] as MinitigerAvatarGalleryItem[];
        }

        const baseItems = [ ...configRef.current.items ];
        const added: MinitigerAvatarGalleryItem[] = [];

        try {
            for (const file of files) {
                added.push(
                    await uploadAvatarMedia(file)
                );
            }
        } catch (error) {
            /*
             * Keep already uploaded media reachable even if a later file
             * fails. Publish once instead of broadcasting after every file.
             */
            if (added.length) {
                await publish({
                    items: [ ...baseItems, ...added ]
                });
            }

            throw error;
        }

        if (added.length) {
            await publish({
                items: [ ...baseItems, ...added ]
            });
        }

        return added;
    }, [ publish, uploadAvatarMedia ]);

    const removeAvatar = useCallback(async (id: string) => {
        if (!apiClient || !isAdmin) {
            throw new Error('Nur Administratoren dürfen Avatare löschen.');
        }

        await deleteMinitigerVirtualServerMedia(
            apiClient,
            id,
            'image'
        );

        await publish({
            items: configRef.current.items.filter(
                item => item.id !== id
            )
        });
    }, [ apiClient, isAdmin, publish ]);

    const getAvatarUrl = useCallback((
        item: MinitigerAvatarGalleryItem
    ) => getMinitigerVirtualServerMediaUrl(
        apiClient,
        item.id,
        'image',
        item.revision
    ), [apiClient]);

    return {
        config,
        loading,
        isAdmin,
        refresh,
        uploadAvatar,
        uploadAvatars,
        removeAvatar,
        getAvatarUrl
    };
};

export default useMinitigerAvatarGallery;
// MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND

// MINITIGER_PATCH_MARKER: PHASE_18_17_4A_SHARED_AVATAR_GALLERY_FALLBACK
