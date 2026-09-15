import {
    CUSTOM_ROW_IDS,
    type MinitigerCustomRowId
} from './customRows';

export const HOME_SECTION_IDS = [
    'libraries',
    'resume',
    'nextUp',
    'watchlist',
    'recent'
] as const;

export type HomeSectionId = typeof HOME_SECTION_IDS[number];

export const SYSTEM_HOME_ROW_IDS = [
    'resume',
    'nextUp',
    'watchlist',
    'recent'
] as const;

export type SystemHomeRowId =
    typeof SYSTEM_HOME_ROW_IDS[number];

export const VIRTUAL_HOME_ROW_IDS = [
    'virtual1',
    'virtual2',
    'virtual3'
] as const;

export type VirtualHomeRowId =
    typeof VIRTUAL_HOME_ROW_IDS[number];

export type HomeRowId =
    | SystemHomeRowId
    | MinitigerCustomRowId
    | VirtualHomeRowId;

export const DEFAULT_HOME_ROW_ORDER: HomeRowId[] = [
    ...SYSTEM_HOME_ROW_IDS,
    ...VIRTUAL_HOME_ROW_IDS,
    ...CUSTOM_ROW_IDS
];

export type MinitigerCardSize = 'compact' | 'normal' | 'large';

export type BannerRotationSeconds = 0 | 8 | 12 | 20 | 30;

export type BannerItemLimit = 0 | 5 | 10 | 15 | 20 | 30 | 50 | 100;

export type PlayedIndicatorShape =
    | 'round'
    | 'circle'
    | 'square'
    | 'triangle';

export interface MinitigerHomeSettings {
    accentColor: string;
    primaryHoverColor: string;
    secondaryColor: string;
    secondaryHoverColor: string;
    libraryBarColor: string;
    libraryBarTextColor: string;
    bannerMetaColor: string;
    glowColor: string;
    arrowColor: string;
    genreTagColor: string;
    glowStrength: number;
    glowSize: number;
    bannerEnabled: boolean;
    bannerRotationSeconds: BannerRotationSeconds;
    bannerItemLimit: BannerItemLimit;
    cardSize: MinitigerCardSize;
    rowGap: number;
    libraryCardWidth: number;
    showLibraryNames: boolean;
    showAudioFlags: boolean;
    showFskBadges: boolean;
    showPlayedIndicators: boolean;
    playedIndicatorSize: number;
    playedIndicatorFontSize: number;
    playedIndicatorShape: PlayedIndicatorShape;
    trailerDebugEnabled: boolean;
    youtubeTrailersEnabled: boolean;
    sideRowTitlesEnabled: boolean;
    hoverEnabled: boolean;
    glowEnabled: boolean;
    previewEnabled: boolean;

    /**
     * Legacy Phase-1..11 ordering for the five original sections.
     * Kept for migration/backups. Native rendering now uses homeRowOrder.
     */
    sectionOrder: HomeSectionId[];

    /**
     * Unified row order below the fixed Media Libraries row.
     * Contains system, custom and virtual rows.
     */
    homeRowOrder: HomeRowId[];

    visibleSections: Record<HomeSectionId, boolean>;
}

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
    libraries: 'Medien-Bibliotheken',
    resume: 'Weiterschauen',
    nextUp: 'Als Nächstes',
    watchlist: 'Watchlist',
    recent: 'Erneut ansehen'
};

export const HOME_ROW_LABELS: Record<SystemHomeRowId, string> = {
    resume: 'Weiterschauen',
    nextUp: 'Als Nächstes',
    watchlist: 'Watchlist',
    recent: 'Erneut ansehen'
};

export const ACCENT_PRESETS = [
    '#ffbf00',
    '#ffe152',
    '#ff6b35',
    '#ff4d8d',
    '#c56cff',
    '#6f8cff',
    '#32c8ff',
    '#36d399',
    '#d4e157'
];

export const DEFAULT_HOME_SETTINGS: MinitigerHomeSettings = {
    accentColor: '#ffbf00',
    primaryHoverColor: '#ffe152',
    secondaryColor: '#34373e',
    secondaryHoverColor: '#50545e',
    libraryBarColor: '#ffbf00',
    libraryBarTextColor: '#000000',
    bannerMetaColor: '#ffbf00',
    glowColor: '#ffbf00',
    arrowColor: '#ffbf00',
    genreTagColor: '#ffbf00',
    glowStrength: 100,
    glowSize: 20,
    bannerEnabled: true,
    bannerRotationSeconds: 12,
    bannerItemLimit: 10,
    cardSize: 'normal',
    rowGap: 40,
    libraryCardWidth: 280,
    showLibraryNames: false,
    showAudioFlags: true,
    showFskBadges: true,
    showPlayedIndicators: true,
    playedIndicatorSize: 40,
    playedIndicatorFontSize: 15,
    playedIndicatorShape: 'round',
    trailerDebugEnabled: true,
    youtubeTrailersEnabled: true,
    sideRowTitlesEnabled: false,
    hoverEnabled: true,
    glowEnabled: true,
    previewEnabled: true,
    sectionOrder: [ ...HOME_SECTION_IDS ],
    homeRowOrder: [ ...DEFAULT_HOME_ROW_ORDER ],
    visibleSections: {
        libraries: true,
        resume: true,
        nextUp: true,
        watchlist: true,
        recent: true
    }
};

const isHomeSectionId = (value: unknown): value is HomeSectionId =>
    typeof value === 'string'
    && HOME_SECTION_IDS.includes(value as HomeSectionId);

export const isSystemHomeRowId = (
    value: unknown
): value is SystemHomeRowId =>
    typeof value === 'string'
    && SYSTEM_HOME_ROW_IDS.includes(
        value as SystemHomeRowId
    );

export const isVirtualHomeRowId = (
    value: unknown
): value is VirtualHomeRowId =>
    typeof value === 'string'
    && VIRTUAL_HOME_ROW_IDS.includes(
        value as VirtualHomeRowId
    );

export const isCustomHomeRowId = (
    value: unknown
): value is MinitigerCustomRowId => {
    if (typeof value !== 'string') {
        return false;
    }

    const match = /^custom(\d+)$/.exec(value);

    if (!match) {
        return false;
    }

    const number = Number(match[1]);

    return Number.isInteger(number)
        && number >= 1
        && number <= 30;
};

export const isHomeRowId = (
    value: unknown
): value is HomeRowId => (
    isSystemHomeRowId(value)
    || isVirtualHomeRowId(value)
    || isCustomHomeRowId(value)
);

const isHexColor = (value: unknown): value is string =>
    typeof value === 'string'
    && /^#[0-9a-f]{6}$/i.test(value);

const colorOr = (value: unknown, fallback: string) =>
    isHexColor(value) ? value : fallback;

const isCardSize = (value: unknown): value is MinitigerCardSize =>
    value === 'compact'
    || value === 'normal'
    || value === 'large';

const isRotationSeconds = (
    value: unknown
): value is BannerRotationSeconds =>
    value === 0
    || value === 8
    || value === 12
    || value === 20
    || value === 30;

const isPlayedIndicatorShape = (
    value: unknown
): value is PlayedIndicatorShape =>
    value === 'round'
    || value === 'circle'
    || value === 'square'
    || value === 'triangle';

const isBannerItemLimit = (
    value: unknown
): value is BannerItemLimit =>
    value === 0
    || value === 5
    || value === 10
    || value === 15
    || value === 20
    || value === 30
    || value === 50
    || value === 100;

const clampNumber = (
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

export const normalizeHomeSettings = (
    value: unknown
): MinitigerHomeSettings => {
    if (!value || typeof value !== 'object') {
        return {
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
        };
    }

    const source = value as Partial<MinitigerHomeSettings>;

    const incomingLegacyOrder = Array.isArray(source.sectionOrder)
        ? source.sectionOrder.filter(isHomeSectionId)
        : [];

    const legacyOrder = Array.from(new Set([
        ...incomingLegacyOrder,
        ...HOME_SECTION_IDS
    ])) as HomeSectionId[];

    const fallbackRowOrder = legacyOrder
        .filter((
            sectionId
        ): sectionId is SystemHomeRowId => (
            sectionId !== 'libraries'
            && isSystemHomeRowId(sectionId)
        ));

    const incomingRowOrder = Array.isArray(source.homeRowOrder)
        ? source.homeRowOrder.filter(isHomeRowId)
        : fallbackRowOrder;

    const homeRowOrder = Array.from(new Set([
        ...incomingRowOrder,
        ...DEFAULT_HOME_ROW_ORDER
    ])) as HomeRowId[];

    const incomingVisibility: Partial<
        Record<HomeSectionId, boolean>
    > = (
        source.visibleSections
        && typeof source.visibleSections === 'object'
    )
        ? source.visibleSections
        : {};

    const normalizedAccent = isHexColor(source.accentColor)
        ? (
            source.accentColor.toLowerCase() === '#e8a52c'
                ? '#ffbf00'
                : source.accentColor
        )
        : DEFAULT_HOME_SETTINGS.accentColor;

    const derivedLegacyOrder: HomeSectionId[] = [
        'libraries',
        ...homeRowOrder.filter(isSystemHomeRowId)
    ];

    return {
        accentColor: normalizedAccent,
        primaryHoverColor: colorOr(
            source.primaryHoverColor,
            DEFAULT_HOME_SETTINGS.primaryHoverColor
        ),
        secondaryColor: colorOr(
            source.secondaryColor,
            DEFAULT_HOME_SETTINGS.secondaryColor
        ),
        secondaryHoverColor: colorOr(
            source.secondaryHoverColor,
            DEFAULT_HOME_SETTINGS.secondaryHoverColor
        ),
        libraryBarColor: colorOr(
            source.libraryBarColor,
            normalizedAccent
        ),
        libraryBarTextColor: colorOr(
            source.libraryBarTextColor,
            DEFAULT_HOME_SETTINGS.libraryBarTextColor
        ),
        bannerMetaColor: colorOr(
            source.bannerMetaColor,
            normalizedAccent
        ),
        glowColor: colorOr(
            source.glowColor,
            normalizedAccent
        ),
        arrowColor: colorOr(
            source.arrowColor,
            normalizedAccent
        ),
        genreTagColor: colorOr(
            source.genreTagColor,
            normalizedAccent
        ),
        glowStrength: clampNumber(
            source.glowStrength,
            DEFAULT_HOME_SETTINGS.glowStrength,
            0,
            100
        ),
        glowSize: clampNumber(
            source.glowSize,
            DEFAULT_HOME_SETTINGS.glowSize,
            0,
            40
        ),
        bannerEnabled: source.bannerEnabled !== false,
        bannerRotationSeconds:
            isRotationSeconds(source.bannerRotationSeconds)
                ? source.bannerRotationSeconds
                : DEFAULT_HOME_SETTINGS.bannerRotationSeconds,
        bannerItemLimit:
            isBannerItemLimit(source.bannerItemLimit)
                ? source.bannerItemLimit
                : DEFAULT_HOME_SETTINGS.bannerItemLimit,
        cardSize: isCardSize(source.cardSize)
            ? source.cardSize
            : DEFAULT_HOME_SETTINGS.cardSize,
        rowGap: clampNumber(
            source.rowGap,
            DEFAULT_HOME_SETTINGS.rowGap,
            12,
            90
        ),
        libraryCardWidth: clampNumber(
            source.libraryCardWidth,
            DEFAULT_HOME_SETTINGS.libraryCardWidth,
            180,
            480
        ),
        showLibraryNames: source.showLibraryNames === true,
        showAudioFlags: source.showAudioFlags !== false,
        showFskBadges: source.showFskBadges !== false,
        showPlayedIndicators: source.showPlayedIndicators !== false,
        playedIndicatorSize: clampNumber(
            source.playedIndicatorSize,
            DEFAULT_HOME_SETTINGS.playedIndicatorSize,
            24,
            72
        ),
        playedIndicatorFontSize: clampNumber(
            source.playedIndicatorFontSize,
            DEFAULT_HOME_SETTINGS.playedIndicatorFontSize,
            10,
            30
        ),
        playedIndicatorShape:
            isPlayedIndicatorShape(source.playedIndicatorShape)
                ? source.playedIndicatorShape
                : DEFAULT_HOME_SETTINGS.playedIndicatorShape,
        trailerDebugEnabled: source.trailerDebugEnabled !== false,
        youtubeTrailersEnabled: source.youtubeTrailersEnabled !== false,
        sideRowTitlesEnabled: source.sideRowTitlesEnabled === true,
        hoverEnabled: source.hoverEnabled !== false,
        glowEnabled: source.glowEnabled !== false,
        previewEnabled: source.previewEnabled !== false,
        sectionOrder: derivedLegacyOrder,
        homeRowOrder,
        visibleSections: HOME_SECTION_IDS.reduce(
            (result, id) => ({
                ...result,
                [id]:
                    typeof incomingVisibility[id] === 'boolean'
                        ? incomingVisibility[id]
                        : DEFAULT_HOME_SETTINGS.visibleSections[id]
            }),
            {} as Record<HomeSectionId, boolean>
        )
    };
};

export const parseCardSize = (
    value: string
): MinitigerCardSize => {
    switch (value) {
        case 'compact':
        case 'large':
            return value;
        case 'normal':
        default:
            return 'normal';
    }
};

export const getContrastTextColor = (hex: string) => {
    const normalized = hex.replace('#', '');

    if (normalized.length !== 6) {
        return '#111111';
    }

    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    const luminance = (
        0.299 * red
        + 0.587 * green
        + 0.114 * blue
    );

    return luminance > 150 ? '#111111' : '#ffffff';
};
