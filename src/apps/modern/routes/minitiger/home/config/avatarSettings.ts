export type MinitigerAvatarShape = 'square' | 'circle';

export interface MinitigerAvatarSettings {
    enabled: boolean;
    image: string;
    shape: MinitigerAvatarShape;
}

export interface MinitigerGalleryAvatarReference {
    id: string;
    revision: number;
}

export const MINITIGER_GALLERY_AVATAR_PREFIX = 'minitiger-gallery:';

export const DEFAULT_MINITIGER_AVATAR_SETTINGS: MinitigerAvatarSettings = {
    enabled: false,
    image: '',
    shape: 'square'
};

const SAFE_GALLERY_ID = /^mtavatar_[A-Za-z0-9_-]{1,48}$/;

export const createMinitigerGalleryAvatarReference = (
    id: string,
    revision: number
) => (
    `${MINITIGER_GALLERY_AVATAR_PREFIX}${id}:${Math.max(0, Math.round(revision))}`
);

export const parseMinitigerGalleryAvatarReference = (
    value: string
): MinitigerGalleryAvatarReference | null => {
    if (!value.startsWith(MINITIGER_GALLERY_AVATAR_PREFIX)) {
        return null;
    }

    const payload = value.slice(
        MINITIGER_GALLERY_AVATAR_PREFIX.length
    );
    const separator = payload.lastIndexOf(':');

    if (separator <= 0) {
        return null;
    }

    const id = payload.slice(0, separator);
    const revision = Number(payload.slice(separator + 1));

    if (
        !SAFE_GALLERY_ID.test(id)
        || !Number.isFinite(revision)
        || revision <= 0
    ) {
        return null;
    }

    return {
        id,
        revision: Math.round(revision)
    };
};

const normalizeImageValue = (value: unknown) => {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();

    if (!trimmed || trimmed.length > 220000) {
        return '';
    }

    if (
        trimmed.startsWith('data:image/')
        || parseMinitigerGalleryAvatarReference(trimmed)
    ) {
        return trimmed;
    }

    return '';
};

export const normalizeMinitigerAvatarSettings = (
    value: unknown
): MinitigerAvatarSettings => {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_MINITIGER_AVATAR_SETTINGS };
    }

    const source = value as Partial<MinitigerAvatarSettings>;
    const image = normalizeImageValue(source.image);

    return {
        // A configured Minitiger avatar is always active. Removing the
        // image/reference is the explicit way to return to Jellyfin's avatar.
        enabled: Boolean(image),
        image,
        shape:
            source.shape === 'circle'
                ? 'circle'
                : 'square'
    };
};
