import type { ApiClient } from 'jellyfin-apiclient';

import type { ItemDto } from 'types/base/models/item-dto';

const safeImageUrl = (
    apiClient: ApiClient | undefined,
    itemId: string | null | undefined,
    options: Record<string, unknown>
) => {
    if (!apiClient || !itemId) {
        return undefined;
    }

    try {
        return apiClient.getImageUrl(itemId, options) || undefined;
    } catch {
        return undefined;
    }
};

export const getPrimaryImageUrl = (
    apiClient: ApiClient | undefined,
    item: ItemDto
) => {
    const tag = item.ImageTags?.Primary;

    if (!tag) {
        return undefined;
    }

    return safeImageUrl(apiClient, item.Id, {
        type: 'Primary',
        tag,
        maxWidth: 420,
        quality: 90
    });
};

export const getLandscapeImageUrl = (
    apiClient: ApiClient | undefined,
    item: ItemDto
) => {
    const thumbTag = item.ImageTags?.Thumb;

    if (thumbTag) {
        return safeImageUrl(apiClient, item.Id, {
            type: 'Thumb',
            tag: thumbTag,
            maxWidth: 720,
            quality: 90
        });
    }

    const backdropTag = item.BackdropImageTags?.[0];

    if (backdropTag) {
        return safeImageUrl(apiClient, item.Id, {
            type: 'Backdrop',
            tag: backdropTag,
            index: 0,
            maxWidth: 720,
            quality: 90
        });
    }

    return getPrimaryImageUrl(apiClient, item);
};

export const getBackdropImageUrl = (
    apiClient: ApiClient | undefined,
    item: ItemDto
) => {
    const backdropTag = item.BackdropImageTags?.[0];

    if (backdropTag) {
        return safeImageUrl(apiClient, item.Id, {
            type: 'Backdrop',
            tag: backdropTag,
            index: 0,
            maxWidth: 1920,
            quality: 92
        });
    }

    const primaryTag = item.ImageTags?.Primary;

    if (primaryTag) {
        return safeImageUrl(apiClient, item.Id, {
            type: 'Primary',
            tag: primaryTag,
            maxWidth: 1600,
            quality: 90
        });
    }

    return undefined;
};

export const getLogoImageUrl = (
    apiClient: ApiClient | undefined,
    item: ItemDto
) => {
    const logoTag = item.ImageTags?.Logo;

    if (!logoTag) {
        return undefined;
    }

    return safeImageUrl(apiClient, item.Id, {
        type: 'Logo',
        tag: logoTag,
        maxWidth: 800,
        quality: 92
    });
};

export const getMediaTypeName = (type?: string | null) => {
    switch (String(type ?? '').toLowerCase()) {
        case 'movie':
            return 'Film';
        case 'series':
            return 'Serie';
        case 'season':
            return 'Staffel';
        case 'episode':
            return 'Episode';
        case 'audio':
            return 'Musik';
        case 'musicalbum':
            return 'Album';
        case 'musicartist':
            return 'Künstler';
        case 'musicvideo':
            return 'Musikvideo';
        case 'book':
            return 'Buch';
        case 'video':
            return 'Video';
        default:
            return type ?? 'Medium';
    }
};

export const getEpisodeLabel = (item: ItemDto) => {
    if (item.Type !== 'Episode') {
        return '';
    }

    const season = item.ParentIndexNumber;
    const episode = item.IndexNumber;

    if (season != null && episode != null) {
        return `S${season} · E${episode}`;
    }

    if (episode != null) {
        return `Episode ${episode}`;
    }

    return 'Episode';
};

export const getCardTitle = (item: ItemDto) => {
    if (item.Type === 'Episode' && item.SeriesName) {
        return item.SeriesName;
    }

    return item.Name ?? 'Unbekannt';
};

export const getCardSubtitle = (item: ItemDto) => {
    if (item.Type === 'Episode') {
        const episodeLabel = getEpisodeLabel(item);
        const episodeName = item.Name ?? '';

        return [ episodeLabel, episodeName ]
            .filter(Boolean)
            .join(' · ');
    }

    return [
        getMediaTypeName(item.Type),
        item.ProductionYear
    ]
        .filter(Boolean)
        .join(' · ');
};

export const getPlaybackProgress = (item: ItemDto) => {
    const position = item.UserData?.PlaybackPositionTicks ?? 0;
    const runtime = item.RunTimeTicks ?? 0;

    if (!position || !runtime || runtime <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, (position / runtime) * 100));
};

export const shortOverview = (overview?: string | null, limit = 330) => {
    const value = String(overview ?? '').trim();

    if (value.length <= limit) {
        return value;
    }

    return `${value.slice(0, limit).trimEnd()}…`;
};

const LANGUAGE_NAMES: Record<string, string> = {
    de: 'Deutsch',
    deu: 'Deutsch',
    ger: 'Deutsch',
    en: 'Englisch',
    eng: 'Englisch',
    ja: 'Japanisch',
    jpn: 'Japanisch',
    ko: 'Koreanisch',
    kor: 'Koreanisch',
    zh: 'Chinesisch',
    zho: 'Chinesisch',
    chi: 'Chinesisch',
    fr: 'Französisch',
    fra: 'Französisch',
    fre: 'Französisch',
    es: 'Spanisch',
    spa: 'Spanisch',
    it: 'Italienisch',
    ita: 'Italienisch'
};

const normalizeLanguage = (value?: string | null) => {
    const code = String(value ?? '').trim().toLowerCase();

    if (!code || code === 'und' || code === 'unknown') {
        return null;
    }

    return LANGUAGE_NAMES[code] ?? code.toUpperCase();
};

export const getStreamLanguages = (
    item: ItemDto,
    type: 'Audio' | 'Subtitle'
) => {
    const values = (item.MediaStreams ?? [])
        .filter(stream =>
            String(stream.Type ?? '').toLowerCase()
            === type.toLowerCase()
        )
        .map(stream =>
            normalizeLanguage(
                stream.Language
                ?? stream.LocalizedLanguage
                ?? stream.Title
            )
        )
        .filter((value): value is string => Boolean(value));

    return Array.from(new Set(values));
};

export const getRatingLabel = (rating?: string | null) => {
    const value = String(rating ?? '').trim();

    if (!value) {
        return null;
    }

    const fskMatch = value.match(
        /(?:FSK[\s-]*)?(0|6|12|16|18)$/i
    );

    if (fskMatch) {
        return `FSK ${fskMatch[1]}`;
    }

    return value;
};

export const getRuntimeLabel = (ticks?: number | null) => {
    if (!ticks || ticks <= 0) {
        return null;
    }

    const totalMinutes = Math.round(ticks / 600_000_000);

    if (totalMinutes < 60) {
        return `${totalMinutes} Min.`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes
        ? `${hours} Std. ${minutes} Min.`
        : `${hours} Std.`;
};

