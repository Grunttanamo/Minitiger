export interface MinitigerAvatarGalleryItem {
    id: string;
    name: string;
    revision: number;
}

export interface MinitigerAvatarGalleryConfig {
    items: MinitigerAvatarGalleryItem[];
}

export const DEFAULT_MINITIGER_AVATAR_GALLERY: MinitigerAvatarGalleryConfig = {
    items: []
};

const SAFE_ID = /^mtavatar_[A-Za-z0-9_-]{1,48}$/;

export const normalizeMinitigerAvatarGallery = (
    value: unknown
): MinitigerAvatarGalleryConfig => {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_MINITIGER_AVATAR_GALLERY, items: [] };
    }

    const source = value as Partial<MinitigerAvatarGalleryConfig>;
    const rawItems = Array.isArray(source.items)
        ? source.items
        : [];

    const items = rawItems
        .filter((item): item is MinitigerAvatarGalleryItem => Boolean(
            item
            && typeof item === 'object'
            && typeof item.id === 'string'
            && SAFE_ID.test(item.id)
            && typeof item.name === 'string'
            && Number.isFinite(Number(item.revision))
        ))
        .map(item => ({
            id: item.id,
            name: item.name.trim().slice(0, 60) || 'Avatar',
            revision: Number(item.revision)
        }));

    return { items };
};
