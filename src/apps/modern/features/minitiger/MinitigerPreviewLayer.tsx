import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import type { ApiClient } from 'jellyfin-apiclient';
import { useQueryClient } from '@tanstack/react-query';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import { useGetItems, useToggleFavoriteMutation } from 'hooks/useFetchItems';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    getBackdropImageUrl,
    getLandscapeImageUrl,
    getParentLandscapeImageUrl,
    getLogoImageUrl,
    getMediaTypeName,
    getPrimaryImageUrl,
    getRatingLabel,
    getRuntimeLabel,
    shortOverview
} from 'apps/modern/routes/minitiger/home/mediaUtils';
import {
    getItemRoute
} from 'apps/modern/routes/minitiger/home/routingUtils';
import {
    getMinitigerEpisodeCode,
    isMinitigerAvailableEpisode
} from 'apps/modern/routes/minitiger/details/episodeUtils';
import MinitigerInlineTrailer from 'apps/modern/routes/minitiger/home/components/MinitigerInlineTrailer';

import './MinitigerPreview.scss';

type PreviewKind = 'movie' | 'series' | 'manga';

interface PreviewTarget {
    item: ItemDto;
    kind: PreviewKind;
    rect: DOMRect;
    initialSeasonId?: string;
    seasonPreviewItem?: ItemDto;
}

interface MinitigerPreviewLayerProps {
    accentColor: string;
    accentTextColor: string;
    seriesPreviewEnabled?: boolean;
    moviePreviewEnabled?: boolean;
    mangaPreviewEnabled?: boolean;
    allowSeasonPreviews?: boolean;
    localTrailersEnabled?: boolean;
}

const HOVER_DELAY = 1050;
const CLOSE_DELAY = 340;
const SMALL_WIDTH = 430;

const previewItemCache = new Map<string, {
    timestamp: number;
    item: ItemDto;
}>();

const PREVIEW_CACHE_MS = 2 * 60_000;

const isSupportedItem = (
    item: ItemDto,
    card: Element,
    options: {
        series: boolean;
        movie: boolean;
        manga: boolean;
        season: boolean;
    }
): PreviewKind | null => {
    const type = String(item.Type ?? '').toLowerCase();
    const previewContext = String(
        card.getAttribute('data-minitiger-preview-context')
        ?? ''
    ).toLowerCase();

    const isMusicVideoLibrary = Boolean(
        previewContext === 'musicvideos'
        || card.closest(
            '.minitigerLibraryPage[data-collection-type="musicvideos"]'
        )
        || card.closest(
            '.minitigerNativeLibraryCardMusicvideos'
        )
    );

    if (isMusicVideoLibrary) {
        return null;
    }

    const isBooksLibrary = Boolean(
        previewContext === 'books'
        || card.closest('#booksPage')
        || card.closest(
            '.minitigerLibraryPage[data-collection-type="books"]'
        )
        || card.closest(
            '.minitigerNativeLibraryCardBooks'
        )
    );

    if (
        options.manga
        && (
            type === 'book'
            || (
                isBooksLibrary
                && (
                    type === 'folder'
                    || type === 'boxset'
                )
            )
        )
    ) {
        return 'manga';
    }

    if (type === 'series' && options.series) {
        return 'series';
    }

    if (
        type === 'season'
        && options.series
        && options.season
    ) {
        return 'series';
    }

    if (type === 'movie' && options.movie) {
        return 'movie';
    }

    return null;
};

const getCardItemId = (card: Element) => (
    card.getAttribute('data-minitiger-item-id')
    ?? card.getAttribute('data-id')
    ?? card.querySelector<HTMLElement>('[data-id]')
        ?.getAttribute('data-id')
    ?? ''
);

const getCandidateCard = (
    target: EventTarget | null
): Element | null => {
    if (!(target instanceof Element)) {
        return null;
    }

    /* Links inside a card are real navigation targets, not preview hover
       targets. Ignoring them also prevents the preview layer from sitting
       above the series/episode title while the pointer is on the link. */
    if (target.closest('[data-minitiger-no-preview="true"]')) {
        return null;
    }

    const customCard = target.closest(
        '.minitigerMediaCard[data-minitiger-item-id]'
    );

    if (customCard) {
        return customCard;
    }

    const nativeCard = target.closest(
        '.minitigerLibraryPage .card'
    );

    if (nativeCard) {
        return nativeCard;
    }

    return null;
};

const getSmallPosition = (rect: DOMRect) => {
    const viewportWidth =
        typeof window === 'undefined'
            ? 1920
            : window.innerWidth;

    const viewportHeight =
        typeof window === 'undefined'
            ? 1080
            : window.innerHeight;

    const width = Math.min(
        SMALL_WIDTH,
        Math.max(330, viewportWidth - 24)
    );

    const preferredLeft =
        rect.left + rect.width / 2 - width / 2;

    const left = Math.max(
        12,
        Math.min(
            preferredLeft,
            viewportWidth - width - 12
        )
    );

    const estimatedHeight = 455;

    let top = Math.max(
        12,
        rect.top + rect.height / 2 - 190
    );

    if (top + estimatedHeight > viewportHeight - 12) {
        top = Math.max(
            12,
            viewportHeight - estimatedHeight - 12
        );
    }

    return {
        left,
        top,
        width
    };
};

const MinitigerPreviewLayer = ({
    accentColor,
    accentTextColor,
    seriesPreviewEnabled = true,
    moviePreviewEnabled = true,
    mangaPreviewEnabled = true,
    allowSeasonPreviews = false,
    localTrailersEnabled = true
}: MinitigerPreviewLayerProps) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const queryClient = useQueryClient();
    const favoriteMutation = useToggleFavoriteMutation();

    const [
        preview,
        setPreview
    ] = useState<PreviewTarget | null>(null);

    const [
        expanded,
        setExpanded
    ] = useState<{
        item: ItemDto;
        kind: PreviewKind;
        initialSeasonId?: string;
    } | null>(null);

    const hoverTimer = useRef<number | null>(null);
    const closeTimer = useRef<number | null>(null);
    const hoverCard = useRef<Element | null>(null);
    const requestToken = useRef(0);

    const clearHoverTimer = useCallback(() => {
        if (hoverTimer.current != null) {
            window.clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
    }, []);

    const clearCloseTimer = useCallback(() => {
        if (closeTimer.current != null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const closeSmall = useCallback(() => {
        clearHoverTimer();
        clearCloseTimer();
        setPreview(null);
        hoverCard.current = null;
        requestToken.current += 1;
    }, [
        clearCloseTimer,
        clearHoverTimer
    ]);

    const scheduleClose = useCallback(() => {
        clearCloseTimer();

        closeTimer.current = window.setTimeout(() => {
            setPreview(null);
            hoverCard.current = null;
        }, CLOSE_DELAY);
    }, [clearCloseTimer]);

    const fetchItem = useCallback(async (
        client: ApiClient,
        card: Element,
        itemId: string,
        token: number
    ) => {
        const userId = client.getCurrentUserId();

        if (!userId) {
            return;
        }

        try {
            const cacheKey = `${client.serverId?.() ?? 'server'}:${itemId}`;
            const cached = previewItemCache.get(cacheKey);

            const item = (
                cached
                && Date.now() - cached.timestamp < PREVIEW_CACHE_MS
            )
                ? cached.item
                : await client.getItem(
                    userId,
                    itemId
                ) as ItemDto;

            if (!cached || cached.item !== item) {
                previewItemCache.set(cacheKey, {
                    timestamp: Date.now(),
                    item
                });
            }

            if (token !== requestToken.current) {
                return;
            }

            const kind = isSupportedItem(
                item,
                card,
                {
                    series: seriesPreviewEnabled,
                    movie: moviePreviewEnabled,
                    manga: mangaPreviewEnabled,
                    season: allowSeasonPreviews
                }
            );

            if (!kind || !card.isConnected) {
                return;
            }

            let previewItem = item;
            let initialSeasonId: string | undefined;
            let seasonPreviewItem: ItemDto | undefined;

            if (
                String(item.Type ?? '').toLowerCase()
                === 'season'
            ) {
                const seriesId = item.SeriesId;

                if (!seriesId || !item.Id) {
                    return;
                }

                const seriesCacheKey =
                    `${client.serverId?.() ?? 'server'}:${seriesId}`;
                const cachedSeries =
                    previewItemCache.get(seriesCacheKey);

                const seriesItem = (
                    cachedSeries
                    && Date.now() - cachedSeries.timestamp
                        < PREVIEW_CACHE_MS
                )
                    ? cachedSeries.item
                    : await client.getItem(
                        userId,
                        seriesId
                    ) as ItemDto;

                if (!cachedSeries || cachedSeries.item !== seriesItem) {
                    previewItemCache.set(seriesCacheKey, {
                        timestamp: Date.now(),
                        item: seriesItem
                    });
                }

                if (token !== requestToken.current) {
                    return;
                }

                previewItem = seriesItem;
                initialSeasonId = item.Id;
                seasonPreviewItem = item;
            }

            setPreview({
                item: previewItem,
                kind,
                rect: card.getBoundingClientRect(),
                initialSeasonId,
                seasonPreviewItem
            });
        } catch (error) {
            console.warn(
                '[Minitiger Preview] Item konnte nicht geladen werden',
                error
            );
        }
    }, [
        allowSeasonPreviews,
        mangaPreviewEnabled,
        moviePreviewEnabled,
        seriesPreviewEnabled
    ]);

    const schedulePreview = useCallback((
        card: Element
    ) => {
        if (!apiClient) {
            return;
        }

        const itemId = getCardItemId(card);

        if (!itemId) {
            return;
        }

        clearHoverTimer();
        clearCloseTimer();

        hoverCard.current = card;

        const token = requestToken.current + 1;
        requestToken.current = token;

        hoverTimer.current = window.setTimeout(() => {
            void fetchItem(
                apiClient,
                card,
                itemId,
                token
            );
        }, HOVER_DELAY);
    }, [
        apiClient,
        clearCloseTimer,
        clearHoverTimer,
        fetchItem
    ]);

    useEffect(() => {
        const onMouseOver = (event: MouseEvent) => {
            if (
                event.target instanceof Element
                && event.target.closest(
                    '[data-minitiger-no-preview="true"]'
                )
            ) {
                /* Title/action links must remain clickable, but entering one should
                   not tear down an already-open preview.  Cancelling only the
                   pending timer avoids the old hover-reset loop. */
                clearHoverTimer();
                return;
            }

            const card = getCandidateCard(event.target);

            if (!card) {
                return;
            }

            if (
                event.relatedTarget instanceof Node
                && card.contains(event.relatedTarget)
            ) {
                return;
            }

            schedulePreview(card);
        };

        const onMouseOut = (event: MouseEvent) => {
            const card = getCandidateCard(event.target);

            if (!card) {
                return;
            }

            if (
                event.relatedTarget instanceof Node
                && card.contains(event.relatedTarget)
            ) {
                return;
            }

            if (hoverCard.current === card) {
                clearHoverTimer();
                scheduleClose();
            }
        };

        const closeForNavigation = () => {
            closeSmall();
            setExpanded(null);
        };

        document.addEventListener(
            'mouseover',
            onMouseOver,
            true
        );

        document.addEventListener(
            'mouseout',
            onMouseOut,
            true
        );

        document.addEventListener(
            'scroll',
            closeSmall,
            true
        );

        window.addEventListener(
            'resize',
            closeSmall
        );

        window.addEventListener(
            'popstate',
            closeForNavigation
        );

        return () => {
            document.removeEventListener(
                'mouseover',
                onMouseOver,
                true
            );

            document.removeEventListener(
                'mouseout',
                onMouseOut,
                true
            );

            document.removeEventListener(
                'scroll',
                closeSmall,
                true
            );

            window.removeEventListener(
                'resize',
                closeSmall
            );

            window.removeEventListener(
                'popstate',
                closeForNavigation
            );

            clearHoverTimer();
            clearCloseTimer();
        };
    }, [
        clearCloseTimer,
        clearHoverTimer,
        closeSmall,
        scheduleClose,
        schedulePreview
    ]);

    useEffect(() => {
        if (!expanded) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setExpanded(null);
            }
        };

        document.addEventListener(
            'keydown',
            onKeyDown
        );

        return () => {
            document.removeEventListener(
                'keydown',
                onKeyDown
            );
        };
    }, [expanded]);

    const playItem = useCallback((
        item: ItemDto
    ) => {
        playbackManager.play({
            items: [ item ],
            startPositionTicks:
                item.UserData?.PlaybackPositionTicks ?? 0
        }).catch(error => {
            console.error(
                '[Minitiger Preview] Wiedergabe fehlgeschlagen',
                error
            );
        });
    }, []);

    const toggleFavorite = useCallback(async (
        item: ItemDto
    ) => {
        if (!item.Id || favoriteMutation.isPending) {
            return;
        }

        try {
            await favoriteMutation.mutateAsync({
                itemId: item.Id,
                isFavorite:
                    Boolean(item.UserData?.IsFavorite)
            });

            await queryClient.invalidateQueries({
                queryKey: [ 'Items' ]
            });

            const nextValue =
                !Boolean(item.UserData?.IsFavorite);

            const patchItem = (
                currentItem: ItemDto
            ): ItemDto => {
                if (!currentItem.UserData) {
                    return currentItem;
                }

                return {
                    ...currentItem,
                    UserData: {
                        ...currentItem.UserData,
                        IsFavorite: nextValue
                    }
                };
            };

            setPreview(current => {
                if (
                    !current
                    || current.item.Id !== item.Id
                ) {
                    return current;
                }

                return {
                    ...current,
                    item: patchItem(current.item)
                };
            });

            setExpanded(current => {
                if (
                    !current
                    || current.item.Id !== item.Id
                ) {
                    return current;
                }

                return {
                    ...current,
                    item: patchItem(current.item)
                };
            });
        } catch (error) {
            console.error(
                '[Minitiger Preview] Watchlist konnte nicht geändert werden',
                error
            );
        }
    }, [
        favoriteMutation,
        queryClient
    ]);

    if (
        typeof document === 'undefined'
        || !document.body
    ) {
        return null;
    }

    const sharedStyle = {
        '--mt-preview-accent': accentColor,
        '--mt-preview-accent-text': accentTextColor
    } as React.CSSProperties;

    const smallPortal = preview
        ? createPortal(
            <SmallPreview
                target={preview}
                apiClient={apiClient}
                style={sharedStyle}
                onKeepOpen={clearCloseTimer}
                onRequestClose={scheduleClose}
                onPlay={playItem}
                onToggleFavorite={toggleFavorite}
                onExpand={() => {
                    setExpanded({
                        item: preview.item,
                        kind: preview.kind,
                        initialSeasonId:
                            preview.initialSeasonId
                    });
                    setPreview(null);
                    clearCloseTimer();
                    clearHoverTimer();
                }}
            />,
            document.body
        )
        : null;

    const largePortal = expanded
        ? createPortal(
            <LargePreview
                target={expanded}
                apiClient={apiClient}
                style={sharedStyle}
                onClose={() => setExpanded(null)}
                onPlay={playItem}
                onToggleFavorite={toggleFavorite}
                localTrailersEnabled={
                    localTrailersEnabled
                }
            />,
            document.body
        )
        : null;

    return (
        <>
            {smallPortal}
            {largePortal}
        </>
    );
};

interface SmallPreviewProps {
    target: PreviewTarget;
    apiClient?: ApiClient;
    style: React.CSSProperties;
    onKeepOpen: () => void;
    onRequestClose: () => void;
    onPlay: (item: ItemDto) => void;
    onToggleFavorite: (item: ItemDto) => void;
    onExpand: () => void;
}

const SmallPreview = ({
    target,
    apiClient,
    style,
    onKeepOpen,
    onRequestClose,
    onPlay,
    onToggleFavorite,
    onExpand
}: SmallPreviewProps) => {
    const position = useMemo(
        () => getSmallPosition(target.rect),
        [target.rect]
    );

    const isSeasonPreview = Boolean(
        target.initialSeasonId
        && target.seasonPreviewItem
    );

    const imageUrl = target.kind === 'manga'
        ? getPrimaryImageUrl(apiClient, target.item)
        : target.seasonPreviewItem
            ? getParentLandscapeImageUrl(
                apiClient,
                target.seasonPreviewItem
            )
            : getBackdropImageUrl(apiClient, target.item);

    const rawMangaAspectRatio = Number(
        target.item.PrimaryImageAspectRatio
        ?? 0
    );

    const mangaAspectRatio = (
        Number.isFinite(rawMangaAspectRatio)
        && rawMangaAspectRatio > 0
    )
        ? rawMangaAspectRatio
        : 2 / 3;

    const logoUrl = isSeasonPreview
        ? undefined
        : getLogoImageUrl(
            apiClient,
            target.item
        );

    const rating = getRatingLabel(
        target.item.OfficialRating
    );

    const runtime = getRuntimeLabel(
        target.item.RunTimeTicks
    );

    const meta = [
        rating,
        target.kind === 'series'
            && target.item.ChildCount
            ? `${target.item.ChildCount} Staffeln`
            : null,
        target.kind === 'manga'
            && (
                target.item.ChildCount
                ?? target.item.RecursiveItemCount
            )
            ? `${
                target.item.ChildCount
                ?? target.item.RecursiveItemCount
            } Bände`
            : null,
        target.kind === 'movie'
            ? runtime
            : null,
        target.item.ProductionYear
    ].filter(Boolean);

    return (
        <aside
            className={[
                'minitigerHoverPreview',
                target.kind === 'manga'
                    ? 'isManga'
                    : ''
            ].filter(Boolean).join(' ')}
            style={{
                ...style,
                left: position.left,
                top: position.top,
                width: position.width
            }}
            onMouseEnter={onKeepOpen}
            onMouseLeave={onRequestClose}
        >
            <Link
                className='minitigerHoverPreviewHero'
                to={getItemRoute(target.item)}
                style={
                    target.kind === 'manga'
                        ? {
                            aspectRatio: `${mangaAspectRatio}`
                        }
                        : undefined
                }
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt=''
                    />
                ) : (
                    <div className='minitigerHoverPreviewFallback'>
                        {target.item.Name ?? 'Minitiger'}
                    </div>
                )}

                <div className='minitigerHoverPreviewHeroShade' />

                {!isSeasonPreview && (
                    logoUrl ? (
                        <img
                            className='minitigerHoverPreviewLogo'
                            src={logoUrl}
                            alt={target.item.Name ?? ''}
                        />
                    ) : (
                        <strong>
                            {target.item.Name ?? 'Unbekannt'}
                        </strong>
                    )
                )}
            </Link>

            <div className='minitigerHoverPreviewControls'>
                <div>
                    <button
                        type='button'
                        className='isPrimary'
                        title={
                            target.kind === 'manga'
                                ? 'Lesen'
                                : 'Abspielen'
                        }
                        onClick={() => onPlay(target.item)}
                    >
                        ▶
                    </button>

                    <button
                        type='button'
                        title='Watchlist'
                        onClick={() =>
                            onToggleFavorite(target.item)
                        }
                    >
                        {target.item.UserData?.IsFavorite
                            ? '♥'
                            : '♡'}
                    </button>
                </div>

                <button
                    type='button'
                    title='Große Vorschau öffnen'
                    onClick={onExpand}
                >
                   ⌄
                </button>
            </div>

            {meta.length > 0 && (
                <div className='minitigerHoverPreviewMeta'>
                    {meta.map((value, index) => (
                        <span key={`${value}-${index}`}>
                            {value}
                        </span>
                    ))}
                </div>
            )}

            <p>
                {shortOverview(
                    target.item.Overview,
                    260
                ) || 'Keine Beschreibung hinterlegt.'}
            </p>
        </aside>
    );
};

interface LargePreviewProps {
    target: {
        item: ItemDto;
        kind: PreviewKind;
        initialSeasonId?: string;
    };
    apiClient?: ApiClient;
    style: React.CSSProperties;
    onClose: () => void;
    onPlay: (item: ItemDto) => void;
    onToggleFavorite: (item: ItemDto) => void;
    localTrailersEnabled: boolean;
}

const LargePreview = ({
    target,
    apiClient,
    style,
    onClose,
    onPlay,
    onToggleFavorite,
    localTrailersEnabled
}: LargePreviewProps) => {
    const backdropUrl = target.kind === 'manga'
        ? getPrimaryImageUrl(apiClient, target.item)
        : getBackdropImageUrl(apiClient, target.item);

    const logoUrl = getLogoImageUrl(
        apiClient,
        target.item
    );

    const meta = [
        target.kind === 'manga'
            ? 'Manga'
            : getMediaTypeName(target.item.Type),
        getRatingLabel(target.item.OfficialRating),
        target.item.ProductionYear,
        target.kind === 'series'
            && target.item.ChildCount
            ? `${target.item.ChildCount} Staffeln`
            : null,
        target.kind === 'manga'
            && (
                target.item.ChildCount
                ?? target.item.RecursiveItemCount
            )
            ? `${
                target.item.ChildCount
                ?? target.item.RecursiveItemCount
            } Bände`
            : null,
        target.kind === 'movie'
            ? getRuntimeLabel(target.item.RunTimeTicks)
            : null
    ].filter(Boolean);

    return (
        <div
            className='minitigerLargePreviewBackdrop'
            style={style}
            role='presentation'
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className={[
                    'minitigerLargePreview',
                    target.kind === 'manga'
                        ? 'isManga'
                        : ''
                ].filter(Boolean).join(' ')}
                role='dialog'
                aria-modal='true'
                aria-label={
                    `Vorschau ${target.item.Name ?? ''}`
                }
            >
                <button
                    type='button'
                    className='minitigerLargePreviewClose'
                    onClick={onClose}
                    aria-label='Schließen'
                    title='Schließen'
                >
                    ×
                </button>

                <div className='minitigerLargePreviewHero'>
                    {backdropUrl ? (
                        <img
                            src={backdropUrl}
                            alt=''
                        />
                    ) : (
                        <div className='minitigerLargePreviewFallback' />
                    )}

                    {target.kind !== 'manga' && (
                        <MinitigerInlineTrailer
                            apiClient={apiClient}
                            item={target.item}
                            className='minitigerLargePreviewTrailerMedia'
                            delayMs={650}
                            allowLocal={localTrailersEnabled}
                        />
                    )}

                    <div className='minitigerLargePreviewShade' />

                    <div className='minitigerLargePreviewHeroContent'>
                        {logoUrl ? (
                            <img
                                className='minitigerLargePreviewLogo'
                                src={logoUrl}
                                alt={target.item.Name ?? ''}
                            />
                        ) : (
                            <h2>
                                {target.item.Name ?? 'Unbekannt'}
                            </h2>
                        )}

                        <div className='minitigerLargePreviewButtons'>
                            <button
                                type='button'
                                className='isPrimary'
                                onClick={() =>
                                    onPlay(target.item)
                                }
                            >
                                {target.kind === 'manga'
                                    ? '▶ Lesen'
                                    : '▶ Abspielen'}
                            </button>

                            <button
                                type='button'
                                onClick={() =>
                                    onToggleFavorite(
                                        target.item
                                    )
                                }
                            >
                                {target.item.UserData?.IsFavorite
                                    ? '♥ Watchlist'
                                    : '♡ Watchlist'}
                            </button>

                            <Link
                                to={getItemRoute(target.item)}
                                onClick={onClose}
                            >
                                Weitere Infos
                            </Link>
                        </div>
                    </div>
                </div>

                <div className='minitigerLargePreviewContent'>
                    {meta.length > 0 && (
                        <div className='minitigerLargePreviewMeta'>
                            {meta.map((value, index) => (
                                <span key={`${value}-${index}`}>
                                    {value}
                                </span>
                            ))}
                        </div>
                    )}

                    <p>
                        {shortOverview(
                            target.item.Overview,
                            820
                        ) || 'Keine Beschreibung hinterlegt.'}
                    </p>

                    {target.kind === 'series' && (
                        <SeriesPreviewSection
                            series={target.item}
                            apiClient={apiClient}
                            onPlay={onPlay}
                            onClose={onClose}
                            initialSeasonId={
                                target.initialSeasonId
                            }
                        />
                    )}

                    {target.kind === 'manga' && (
                        <MangaPreviewSection
                            manga={target.item}
                            apiClient={apiClient}
                            onClose={onClose}
                        />
                    )}
                </div>
            </section>
        </div>
    );
};



interface MangaPreviewSectionProps {
    manga: ItemDto;
    apiClient?: ApiClient;
    onClose: () => void;
}

const MangaPreviewSection = ({
    manga,
    apiClient,
    onClose
}: MangaPreviewSectionProps) => {
    const isSingleBook = String(manga.Type ?? '').toLowerCase() === 'book';
    const parentId = isSingleBook
        ? manga.ParentId ?? undefined
        : manga.Id ?? undefined;

    const {
        data,
        isPending
    } = useGetItems({
        parentId,
        recursive: false,
        limit: 100,
        includeItemTypes: [
            BaseItemKind.Book
        ],
        fields: [
            ItemFields.Overview,
            ItemFields.PrimaryImageAspectRatio
        ],
        enableImageTypes: [
            ImageType.Primary
        ],
        imageTypeLimit: 1,
        enableTotalRecordCount: false,
        sortBy: [ ItemSortBy.SortName ],
        sortOrder: [ SortOrder.Ascending ]
    });

    const volumes = useMemo(() => (
        [ ...(data?.Items ?? []) ]
            .filter(item => !isSingleBook || item.Id !== manga.Id)
    ), [data?.Items, isSingleBook, manga.Id]);

    if (!parentId) {
        return null;
    }

    return (
        <section className='minitigerMangaPreview'>
            <div className='minitigerMangaPreviewHeader'>
                <h3>{isSingleBook ? 'Weitere Bände' : 'Bände'}</h3>
                {!isPending && (
                    <span>{volumes.length} Bände</span>
                )}
            </div>

            {isPending ? (
                <div className='minitigerSeriesPreviewLoading'>
                    Bände werden geladen …
                </div>
            ) : volumes.length === 0 ? (
                <div className='minitigerLargePreviewHint'>
                    Keine weiteren Bände gefunden.
                </div>
            ) : (
                <div className='minitigerMangaVolumeRow'>
                    {volumes.map((volume, index) => {
                        const imageUrl = getPrimaryImageUrl(
                            apiClient,
                            volume
                        );

                        return (
                            <Link
                                key={volume.Id ?? volume.Name}
                                className='minitigerMangaVolumeCard'
                                to={getItemRoute(volume)}
                                onClick={onClose}
                            >
                                <div className='minitigerMangaVolumeImage'>
                                    {imageUrl ? (
                                        <img src={imageUrl} alt='' />
                                    ) : (
                                        <div className='minitigerMangaVolumeFallback'>
                                            📚
                                        </div>
                                    )}
                                </div>

                                <strong>
                                    {volume.Name ?? `Band ${index + 1}`}
                                </strong>

                                <span>
                                    {volume.IndexNumber != null
                                        ? `Band ${volume.IndexNumber}`
                                        : volume.ProductionYear ?? ''}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

interface SeriesPreviewSectionProps {
    series: ItemDto;
    apiClient?: ApiClient;
    onPlay: (item: ItemDto) => void;
    onClose: () => void;
    initialSeasonId?: string;
}

const ALL_SEASONS = '__minitiger_all_seasons__';
const EPISODE_BATCH_SIZE = 25;

const SeriesPreviewSection = ({
    series,
    apiClient,
    onPlay,
    onClose,
    initialSeasonId
}: SeriesPreviewSectionProps) => {
    const {
        data: seasonsData,
        isPending: seasonsPending
    } = useGetItems({
        parentId: series.Id ?? undefined,
        recursive: false,
        limit: 100,
        includeItemTypes: [
            BaseItemKind.Season
        ],
        enableTotalRecordCount: false
    });

    const seasons = useMemo(
        () => [ ...(seasonsData?.Items ?? []) ]
            .sort((left, right) => (
                (left.IndexNumber ?? 9999)
                - (right.IndexNumber ?? 9999)
            )),
        [seasonsData?.Items]
    );

    const [
        selectedSeasonId,
        setSelectedSeasonId
    ] = useState<string>('');

    const [
        visibleEpisodeCount,
        setVisibleEpisodeCount
    ] = useState(EPISODE_BATCH_SIZE);

    useEffect(() => {
        if (
            selectedSeasonId
            || seasons.length === 0
        ) {
            return;
        }

        const preferred = (
            initialSeasonId
                ? seasons.find(season =>
                    season.Id === initialSeasonId
                )
                : undefined
        ) ?? seasons.find(season =>
            season.IndexNumber === 1
        ) ?? seasons[0];

        if (preferred?.Id) {
            setSelectedSeasonId(preferred.Id);
        }
    }, [
        initialSeasonId,
        seasons,
        selectedSeasonId
    ]);

    useEffect(() => {
        setVisibleEpisodeCount(
            EPISODE_BATCH_SIZE
        );
    }, [selectedSeasonId]);

    const allSeasonsSelected =
        selectedSeasonId === ALL_SEASONS;

    const {
        data: episodesData,
        isPending: episodesPending,
        isFetching: episodesFetching
    } = useGetItems({
        parentId: allSeasonsSelected
            ? series.Id ?? undefined
            : selectedSeasonId || series.Id || undefined,
        recursive: allSeasonsSelected,
        limit: visibleEpisodeCount,
        includeItemTypes: [
            BaseItemKind.Episode
        ],
        fields: [
            ItemFields.Overview,
            ItemFields.PrimaryImageAspectRatio
        ],
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Thumb,
            ImageType.Backdrop
        ],
        imageTypeLimit: 1,
        enableTotalRecordCount: true,
        sortBy: allSeasonsSelected
            ? [
                ItemSortBy.ParentIndexNumber,
                ItemSortBy.IndexNumber
            ]
            : [ ItemSortBy.IndexNumber ],
        sortOrder: [ SortOrder.Ascending ]
    }, {
        keepPreviousData: true
    });

    const rawEpisodes =
        episodesData?.Items ?? [];

    const episodes = useMemo(
        () => [ ...rawEpisodes ]
            .filter(isMinitigerAvailableEpisode)
            .sort((left, right) => {
                const seasonDelta =
                    (left.ParentIndexNumber ?? 9999)
                    - (right.ParentIndexNumber ?? 9999);

                if (
                    allSeasonsSelected
                    && seasonDelta !== 0
                ) {
                    return seasonDelta;
                }

                return (
                    (left.IndexNumber ?? 9999)
                    - (right.IndexNumber ?? 9999)
                );
            }),
        [
            allSeasonsSelected,
            rawEpisodes
        ]
    );

    const totalEpisodeCount =
        episodesData?.TotalRecordCount
        ?? rawEpisodes.length;

    const selectedSeason =
        allSeasonsSelected
            ? undefined
            : seasons.find(season =>
                season.Id === selectedSeasonId
            );

    const effectiveTotalEpisodeCount =
        allSeasonsSelected
            ? totalEpisodeCount
            : (
                selectedSeason?.RecursiveItemCount
                ?? selectedSeason?.ChildCount
                ?? totalEpisodeCount
            );

    const loadedEpisodeCountForPaging =
        allSeasonsSelected
            ? rawEpisodes.length
            : episodes.length;

    const canLoadMore =
        loadedEpisodeCountForPaging >= visibleEpisodeCount
        && loadedEpisodeCountForPaging < effectiveTotalEpisodeCount;

    const getEpisodeSeasonNumber = (
        episode: ItemDto
    ) => (
        episode.ParentIndexNumber
        ?? seasons.find(season =>
            season.Id === episode.ParentId
        )?.IndexNumber
        ?? null
    );

    if (seasonsPending) {
        return (
            <div className='minitigerSeriesPreviewLoading'>
                Staffeln werden geladen …
            </div>
        );
    }

    if (seasons.length === 0) {
        return null;
    }

    return (
        <section className='minitigerSeriesPreview'>
            <div className='minitigerSeriesPreviewHeader'>
                <h3>Folgen</h3>

                <select
                    value={selectedSeasonId}
                    onChange={event =>
                        setSelectedSeasonId(
                            event.currentTarget.value
                        )
                    }
                    aria-label='Staffel auswählen'
                >
                    <option value={ALL_SEASONS}>
                        Alle
                    </option>

                    {seasons.map(season => (
                        <option
                            key={season.Id ?? season.Name}
                            value={season.Id ?? ''}
                        >
                            {season.Name
                                ?? (
                                    season.IndexNumber != null
                                        ? `Staffel ${season.IndexNumber}`
                                        : 'Staffel'
                                )}
                        </option>
                    ))}
                </select>
            </div>

            {episodesPending ? (
                <div className='minitigerSeriesPreviewLoading'>
                    Folgen werden geladen …
                </div>
            ) : (
                <>
                    <div className='minitigerSeriesEpisodeList'>
                        {episodes.map((episode, index) => {
                            const imageUrl =
                                getLandscapeImageUrl(
                                    apiClient,
                                    episode
                                );

                            const episodeLabel =
                                getMinitigerEpisodeCode(episode);

                            const runtime =
                                getRuntimeLabel(
                                    episode.RunTimeTicks
                                );

                            const seasonNumber =
                                getEpisodeSeasonNumber(
                                    episode
                                );

                            const previousSeasonNumber =
                                index > 0
                                    ? getEpisodeSeasonNumber(
                                        episodes[index - 1]
                                    )
                                    : null;

                            const showSeasonHeading =
                                allSeasonsSelected
                                && seasonNumber != null
                                && (
                                    index === 0
                                    || seasonNumber
                                        !== previousSeasonNumber
                                );

                            return (
                                <React.Fragment
                                    key={
                                        episode.Id
                                        ?? episode.Name
                                    }
                                >
                                    {showSeasonHeading && (
                                        <h4 className='minitigerSeriesSeasonHeading'>
                                            Staffel {seasonNumber}
                                        </h4>
                                    )}

                                    <article
                                        className='minitigerSeriesEpisodeCard'
                                    >
                                        <Link
                                            className='minitigerSeriesEpisodeLink'
                                            to={getItemRoute(episode)}
                                            onClick={onClose}
                                        >
                                            <div className='minitigerSeriesEpisodeNumber'>
                                                {
                                                    episode.IndexNumber
                                                    ?? index + 1
                                                }.
                                            </div>

                                            <div className='minitigerSeriesEpisodeImage'>
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt=''
                                                    />
                                                ) : (
                                                    <div className='minitigerSeriesEpisodeFallback' />
                                                )}

                                                <button
                                                    type='button'
                                                    className='minitigerSeriesEpisodePlay'
                                                    onClick={event => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        onPlay(episode);
                                                    }}
                                                    aria-label={
                                                        `${episode.Name ?? 'Episode'} abspielen`
                                                    }
                                                    title='Abspielen'
                                                >
                                                    ▶
                                                </button>
                                            </div>

                                            <div className='minitigerSeriesEpisodeText'>
                                                <div className='minitigerSeriesEpisodeTitleLine'>
                                                    <strong>
                                                        {episode.Name
                                                            ?? 'Episode'}
                                                    </strong>

                                                    {runtime && (
                                                        <span className='minitigerSeriesEpisodeRuntime'>
                                                            {runtime}
                                                        </span>
                                                    )}
                                                </div>

                                                {episodeLabel && (
                                                    <span className='minitigerSeriesEpisodeMeta'>
                                                        {episodeLabel}
                                                    </span>
                                                )}

                                                <p>
                                                    {shortOverview(
                                                        episode.Overview,
                                                        220
                                                    ) || 'Keine Beschreibung hinterlegt.'}
                                                </p>
                                            </div>
                                        </Link>
                                    </article>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {canLoadMore && (
                        <div className='minitigerSeriesLoadMore'>
                            <button
                                type='button'
                                disabled={episodesFetching}
                                onClick={() =>
                                    setVisibleEpisodeCount(
                                        current =>
                                            current
                                            + EPISODE_BATCH_SIZE
                                    )
                                }
                            >
                                {episodesFetching
                                    ? 'Wird geladen …'
                                    : 'Mehr anzeigen'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default MinitigerPreviewLayer;

// MINITIGER_PATCH_MARKER: PHASE_18_24_0_TEST_UI_PREVIEW_PAGING

// MINITIGER_PATCH_MARKER: PHASE_18_24_1_TEST_POLISH_ROW_CONFIGS

// MINITIGER_PATCH_MARKER: PHASE_18_24_2A_TEST_POLISH_FIX
