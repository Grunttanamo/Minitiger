export type MinitigerLibraryDisplay =
    | 'poster'
    | 'landscape'
    | 'banner';

export type MinitigerAZMode =
    | 'auto'
    | 'top'
    | 'side';

export interface MinitigerLibrarySettings {
    seriesDisplay: MinitigerLibraryDisplay;
    movieDisplay: MinitigerLibraryDisplay;
    otherDisplay: MinitigerLibraryDisplay;
    posterSize: number;
    landscapeSize: number;
    azMode: MinitigerAZMode;
}

export const DEFAULT_LIBRARY_SETTINGS: MinitigerLibrarySettings = {
    seriesDisplay: 'poster',
    movieDisplay: 'poster',
    otherDisplay: 'poster',
    posterSize: 320,
    landscapeSize: 520,
    azMode: 'auto'
};

const parseDisplay = (
    value: unknown,
    fallback: MinitigerLibraryDisplay
): MinitigerLibraryDisplay => {
    if (
        value === 'poster'
        || value === 'landscape'
        || value === 'banner'
    ) {
        return value;
    }

    return fallback;
};

const parseAZMode = (
    value: unknown
): MinitigerAZMode => {
    if (value === 'top' || value === 'side') {
        return value;
    }

    return 'auto';
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

    return Math.min(max, Math.max(min, Math.round(numeric)));
};

export const normalizeLibrarySettings = (
    value: unknown
): MinitigerLibrarySettings => {
    if (!value || typeof value !== 'object') {
        return DEFAULT_LIBRARY_SETTINGS;
    }

    const source = value as Partial<MinitigerLibrarySettings>;

    return {
        seriesDisplay: parseDisplay(
            source.seriesDisplay,
            DEFAULT_LIBRARY_SETTINGS.seriesDisplay
        ),
        movieDisplay: parseDisplay(
            source.movieDisplay,
            DEFAULT_LIBRARY_SETTINGS.movieDisplay
        ),
        otherDisplay: parseDisplay(
            source.otherDisplay,
            DEFAULT_LIBRARY_SETTINGS.otherDisplay
        ),
        posterSize: clamp(
            source.posterSize,
            DEFAULT_LIBRARY_SETTINGS.posterSize,
            160,
            460
        ),
        landscapeSize: clamp(
            source.landscapeSize,
            DEFAULT_LIBRARY_SETTINGS.landscapeSize,
            260,
            760
        ),
        azMode: parseAZMode(source.azMode)
    };
};
