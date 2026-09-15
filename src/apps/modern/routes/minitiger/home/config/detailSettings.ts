export type MinitigerCastShape =
    | 'portrait'
    | 'square'
    | 'circle'
    | 'oval'
    | 'star'
    | 'landscape';

export interface MinitigerDetailSettings {
    posterWidth: number;
    seasonPosterWidth: number;
    contentWidth: number;
    mangaPosterWidth: number;
    mangaVolumeWidth: number;
    castWidth: number;
    castShape: MinitigerCastShape;
}

export const DEFAULT_DETAIL_SETTINGS: MinitigerDetailSettings = {
    posterWidth: 460,
    seasonPosterWidth: 260,
    contentWidth: 380,
    mangaPosterWidth: 460,
    mangaVolumeWidth: 260,
    castWidth: 148,
    castShape: 'portrait'
};

const clamp = (
    value: unknown,
    fallback: number,
    min: number,
    max: number
) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.min(
        max,
        Math.max(
            min,
            Math.round(numeric)
        )
    );
};

const parseCastShape = (
    value: unknown
): MinitigerCastShape => {
    if (
        value === 'square'
        || value === 'circle'
        || value === 'oval'
        || value === 'star'
        || value === 'landscape'
    ) {
        return value;
    }

    return 'portrait';
};

export const normalizeDetailSettings = (
    value: unknown
): MinitigerDetailSettings => {
    if (
        !value
        || typeof value !== 'object'
    ) {
        return {
            ...DEFAULT_DETAIL_SETTINGS
        };
    }

    const source =
        value as Partial<MinitigerDetailSettings>;

    return {
        posterWidth: clamp(
            source.posterWidth,
            DEFAULT_DETAIL_SETTINGS.posterWidth,
            260,
            620
        ),
        seasonPosterWidth: clamp(
            source.seasonPosterWidth,
            DEFAULT_DETAIL_SETTINGS.seasonPosterWidth,
            120,
            360
        ),
        contentWidth: clamp(
            source.contentWidth,
            DEFAULT_DETAIL_SETTINGS.contentWidth,
            240,
            620
        ),
        mangaPosterWidth: clamp(
            source.mangaPosterWidth,
            source.posterWidth ?? DEFAULT_DETAIL_SETTINGS.mangaPosterWidth,
            220,
            620
        ),
        mangaVolumeWidth: clamp(
            source.mangaVolumeWidth,
            source.seasonPosterWidth ?? DEFAULT_DETAIL_SETTINGS.mangaVolumeWidth,
            100,
            360
        ),
        castWidth: clamp(
            source.castWidth,
            DEFAULT_DETAIL_SETTINGS.castWidth,
            90,
            240
        ),
        castShape:
            parseCastShape(
                source.castShape
            )
    };
};
