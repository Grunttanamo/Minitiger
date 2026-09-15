import { useQuery } from '@tanstack/react-query';
import React, {
    useEffect,
    useMemo,
    useState
} from 'react';
import { Link } from 'react-router-dom';

import { clearBackdrop } from 'components/backdrop/backdrop';
import Page from 'components/Page';
import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import {
    useToggleFavoriteMutation,
    useTogglePlayedMutation
} from 'hooks/useFetchItems';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import useMinitigerDetailSettings from '../home/hooks/useMinitigerDetailSettings';
import useMinitigerHomeSettings from '../home/hooks/useMinitigerHomeSettings';
import useMinitigerThemeVariables from '../home/hooks/useMinitigerThemeVariables';
import {
    getBackdropImageUrl,
    getPrimaryImageUrl
} from '../home/mediaUtils';
import { getItemRoute } from '../home/routingUtils';

import MinitigerItemMenuButton from './MinitigerItemMenuButton';

import './MinitigerVideoDetails.scss';

interface Props {
    itemId: string;
}


interface VirtualFolderRootInfo {
    ItemId?: string;
    Locations?: string[];
}

const normalizeLibraryPath = (
    value?: string | null
) => String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

const getVolumeNumber = (
    item: ItemDto
) => {
    if (
        item.IndexNumber
        != null
    ) {
        return Number(
            item.IndexNumber
        );
    }

    const match =
        String(
            item.Name
            ?? ''
        ).match(
            /(\d{1,3})\s*$/
        );

    return match
        ? Number(
            match[1]
        )
        : null;
};

const sortVolumes = (
    values: ItemDto[]
) => (
    [ ...values ]
        .sort(
            (
                left,
                right
            ) => {
                const a =
                    getVolumeNumber(
                        left
                    );

                const b =
                    getVolumeNumber(
                        right
                    );

                if (
                    a != null
                    && b != null
                    && a !== b
                ) {
                    return a - b;
                }

                return String(
                    left.SortName
                    ?? left.Name
                    ?? ''
                ).localeCompare(
                    String(
                        right.SortName
                        ?? right.Name
                        ?? ''
                    ),
                    undefined,
                    {
                        numeric: true
                    }
                );
            }
        )
);

const MangaShell = ({
    children,
    backdrop,
    detailSettings
}: React.PropsWithChildren<{
    backdrop?: string;
    detailSettings: ReturnType<
        typeof useMinitigerDetailSettings
    >['settings'];
}>) => {
    const style = {
        '--mt-details-poster-width':
            `${detailSettings.mangaPosterWidth}px`,
        '--mt-details-season-width':
            `${detailSettings.mangaVolumeWidth}px`,
        '--mt-details-content-width':
            `${detailSettings.contentWidth}px`,
        '--mt-details-cast-width':
            `${detailSettings.castWidth}px`
    } as React.CSSProperties;

    return (
        <Page
            id='minitigerMangaDetailsPage'
            className='mainAnimatedPage minitigerVideoDetailsPage minitigerMangaDetailsPage'
            isBackButtonEnabled
            style={style}
        >
            <div
                className='minitigerDetailsBackdrop'
                style={
                    backdrop
                        ? {
                            backgroundImage:
                                `url("${backdrop}")`
                        }
                        : undefined
                }
            />
            <div className='minitigerDetailsShade' />
            <main className='minitigerDetailsSurface'>
                {children}
            </main>
        </Page>
    );
};

const MangaVolumeCards = ({
    volumes,
    apiClient
}: {
    volumes: ItemDto[];
    apiClient:
        ReturnType<typeof useApi>[
            '__legacyApiClient__'
        ];
}) => (
    <div
        className='minitigerMangaVolumeGrid'
        aria-label='Manga-Bände'
    >
        {volumes.map(volume => {
            const poster =
                getPrimaryImageUrl(
                    apiClient,
                    volume
                );

            return (
                <Link
                    key={
                        volume.Id
                        ?? volume.Name
                    }
                    to={getItemRoute(volume)}
                    className='minitigerMangaVolumeCard'
                >
                    <div>
                        <MinitigerItemMenuButton
                            apiClient={apiClient}
                            item={volume}
                            title='Band-Menü'
                        />

                        {poster ? (
                            <img
                                src={poster}
                                alt=''
                            />
                        ) : (
                            <span>
                                Kein Cover
                            </span>
                        )}
                    </div>

                    <strong>
                        {
                            volume.Name
                            ?? 'Band'
                        }
                    </strong>
                </Link>
            );
        })}
    </div>
);

export const MinitigerMangaSeriesDetails = ({
    itemId
}: Props) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        settings: homeSettings
    } = useMinitigerHomeSettings();

    const {
        settings: detailSettings
    } = useMinitigerDetailSettings();

    useMinitigerThemeVariables(
        homeSettings
    );

    const {
        data,
        isPending
    } = useItem(itemId);

    const item =
        data as
            ItemDto
            | undefined;

    const userId =
        apiClient?.getCurrentUserId()
        ?? '';

    const volumesQuery = useQuery({
        queryKey: [
            'Minitiger',
            'MangaSeries',
            itemId
        ],
        queryFn: async () => {
            if (
                !apiClient
                || !userId
            ) {
                return [] as ItemDto[];
            }

            const result =
                await apiClient.getItems(
                    userId,
                    {
                        ParentId:
                            itemId,
                        IncludeItemTypes:
                            'Book',
                        Recursive: true,
                        SortBy:
                            'SortName',
                        SortOrder:
                            'Ascending',
                        Limit: 2000,
                        Fields:
                            'Overview,IndexNumber,SortName,ProductionYear',
                        EnableTotalRecordCount:
                            false
                    }
                );

            return sortVolumes(
                (
                    result?.Items
                    ?? []
                ) as ItemDto[]
            );
        },
        enabled: Boolean(
            apiClient
            && userId
            && itemId
        ),
        staleTime:
            10 * 60_000
    });

    useEffect(() => {
        clearBackdrop();
    }, []);

    if (
        isPending
        || !item
    ) {
        return (
            <Page
                id='minitigerMangaSeriesLoading'
                className='mainAnimatedPage minitigerVideoDetailsPage'
                isBackButtonEnabled
            >
                <div className='minitigerDetailsLoading'>
                    Manga wird geladen …
                </div>
            </Page>
        );
    }

    const volumes =
        volumesQuery.data
        ?? [];

    const poster =
        getPrimaryImageUrl(
            apiClient,
            item
        )
        ?? (
            volumes[0]
                ? getPrimaryImageUrl(
                    apiClient,
                    volumes[0]
                )
                : undefined
        );

    const backdrop =
        getBackdropImageUrl(
            apiClient,
            item
        )
        ?? poster;

    const publishers = (item.Studios ?? [])
        .map(studio => studio.Name)
        .filter((name): name is string => Boolean(name));

    return (
        <MangaShell
            backdrop={backdrop}
            detailSettings={detailSettings}
        >
            <section className='minitigerDetailsHero'>
                <div className='minitigerDetailsPoster'>
                    {poster ? (
                        <img
                            src={poster}
                            alt=''
                        />
                    ) : (
                        <div className='minitigerDetailsPosterFallback'>
                            📚
                        </div>
                    )}
                </div>

                <div className='minitigerDetailsInfo'>
                    <div className='minitigerDetailsType'>
                        MANGA
                    </div>

                    <h1>
                        {
                            item.Name
                            ?? 'Manga'
                        }
                    </h1>

                    <div className='minitigerDetailsMeta'>
                        <span>
                            {
                                volumes.length
                            } Bände
                        </span>
                    </div>

                    {publishers.length > 0 && (
                        <div className='minitigerDetailsExtraMeta isPublisher'>
                            <div>
                                <strong>Verlag</strong>
                                <span>{publishers.join(' · ')}</span>
                            </div>
                        </div>
                    )}

                    <p className='minitigerDetailsOverview'>
                        {
                            item.Overview
                            || 'Für diese Manga-Reihe ist derzeit keine Beschreibung hinterlegt.'
                        }
                    </p>

                    <div className='minitigerDetailsActions'>
                        <MinitigerItemMenuButton
                            apiClient={apiClient}
                            item={item}
                            placement='action'
                            title='Manga-Menü'
                        />
                    </div>
                </div>
            </section>

            <section className='minitigerDetailsSection'>
                <div className='minitigerDetailsSectionHead'>
                    <div>
                        <h2>Bände</h2>
                        <span>
                            {volumes.length}
                        </span>
                    </div>
                </div>

                <MangaVolumeCards
                    volumes={volumes}
                    apiClient={apiClient}
                />
            </section>
        </MangaShell>
    );
};

export const MinitigerMangaVolumeDetails = ({
    itemId
}: Props) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        settings: homeSettings
    } = useMinitigerHomeSettings();

    const {
        settings: detailSettings
    } = useMinitigerDetailSettings();

    useMinitigerThemeVariables(
        homeSettings
    );

    const {
        data,
        isPending
    } = useItem(itemId);

    const item =
        data as
            ItemDto
            | undefined;

    const {
        data: parentData
    } = useItem(
        item?.ParentId
        ?? undefined
    );

    const parent =
        parentData as
            ItemDto
            | undefined;

    const parentType =
        String(parent?.Type ?? '').toLowerCase();

    const parentCollectionType =
        String(parent?.CollectionType ?? '').toLowerCase();

    const parentLooksLikeLibraryRoot =
        parentType === 'collectionfolder'
        || Boolean(parentCollectionType);

    const userId =
        apiClient?.getCurrentUserId()
        ?? '';

    const siblingVolumesQuery = useQuery({
        queryKey: [
            'Minitiger',
            'MangaVolumeSiblings',
            item?.ParentId ?? ''
        ],
        queryFn: async () => {
            if (
                !apiClient
                || !userId
                || !item?.ParentId
                || !parent
                || parentLooksLikeLibraryRoot
            ) {
                return [] as ItemDto[];
            }

            /* Jellyfin 12 does not always expose a physical Books/Comics
               library root as Type=CollectionFolder (or with CollectionType).
               Compare the parent against the server's configured virtual-folder
               ItemId/Locations as a second, authoritative root check. */
            const virtualFolderClient = apiClient as unknown as {
                getVirtualFolders?: () => Promise<VirtualFolderRootInfo[]>;
            };

            if (
                typeof virtualFolderClient.getVirtualFolders
                === 'function'
            ) {
                try {
                    const virtualFolders =
                        await virtualFolderClient.getVirtualFolders();

                    const parentId =
                        String(parent.Id ?? '');

                    const parentPath =
                        normalizeLibraryPath(parent.Path);

                    const parentIsConfiguredLibraryRoot =
                        virtualFolders.some(folder => {
                            const sameItemId =
                                Boolean(parentId)
                                && String(folder.ItemId ?? '')
                                    === parentId;

                            const sameLocation =
                                Boolean(parentPath)
                                && (folder.Locations ?? [])
                                    .some(location =>
                                        normalizeLibraryPath(location)
                                        === parentPath
                                    );

                            return sameItemId || sameLocation;
                        });

                    if (parentIsConfiguredLibraryRoot) {
                        return [] as ItemDto[];
                    }
                } catch {
                    // Best effort: keep the existing hierarchy checks as fallback.
                }
            }

            const result = await apiClient.getItems(
                userId,
                {
                    ParentId: item.ParentId,
                    IncludeItemTypes: 'Book',
                    Recursive: true,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    Limit: 2000,
                    Fields:
                        'Overview,IndexNumber,SortName,ProductionYear',
                    EnableTotalRecordCount: false
                }
            );

            return sortVolumes(
                (result?.Items ?? []) as ItemDto[]
            ).filter(volume =>
                volume.Id !== item.Id
            );
        },
        enabled: Boolean(
            apiClient
            && userId
            && item?.ParentId
            && parent
            && !parentLooksLikeLibraryRoot
        ),
        staleTime: 10 * 60_000
    });

    const favoriteMutation =
        useToggleFavoriteMutation();

    const playedMutation =
        useTogglePlayedMutation();

    const [
        favorite,
        setFavorite
    ] = useState(false);

    const [
        played,
        setPlayed
    ] = useState(false);

    useEffect(() => {
        setFavorite(
            Boolean(
                item?.UserData
                    ?.IsFavorite
            )
        );
        setPlayed(
            Boolean(
                item?.UserData
                    ?.Played
            )
        );
    }, [
        item?.Id,
        item?.UserData
            ?.IsFavorite,
        item?.UserData
            ?.Played
    ]);

    useEffect(() => {
        clearBackdrop();
    }, []);

    if (
        isPending
        || !item
    ) {
        return (
            <Page
                id='minitigerMangaVolumeLoading'
                className='mainAnimatedPage minitigerVideoDetailsPage'
                isBackButtonEnabled
            >
                <div className='minitigerDetailsLoading'>
                    Manga-Band wird geladen …
                </div>
            </Page>
        );
    }

    const poster =
        getPrimaryImageUrl(
            apiClient,
            item
        );

    const backdrop =
        getBackdropImageUrl(
            apiClient,
            parent
            ?? item
        )
        ?? poster;

    const volumeNumber =
        getVolumeNumber(
            item
        );

    const publishers = (item.Studios ?? [])
        .map(studio => studio.Name)
        .filter((name): name is string => Boolean(name));

    const read = () => {
        playbackManager.play({
            items: [ item ]
        }).catch(error => {
            console.error(
                '[Minitiger Manga] Lesen konnte nicht gestartet werden',
                error
            );
        });
    };

    const togglePlayed = async () => {
        if (
            !item.Id
            || playedMutation.isPending
        ) {
            return;
        }

        await playedMutation.mutateAsync({
            itemId:
                item.Id,
            isPlayed:
                played
        });

        setPlayed(
            !played
        );
    };

    const toggleFavorite = async () => {
        if (
            !item.Id
            || favoriteMutation.isPending
        ) {
            return;
        }

        await favoriteMutation.mutateAsync({
            itemId:
                item.Id,
            isFavorite:
                favorite
        });

        setFavorite(
            !favorite
        );
    };

    return (
        <MangaShell
            backdrop={backdrop}
            detailSettings={detailSettings}
        >
            <section className='minitigerDetailsHero'>
                <div className='minitigerDetailsPoster'>
                    {poster ? (
                        <img
                            src={poster}
                            alt=''
                        />
                    ) : (
                        <div className='minitigerDetailsPosterFallback'>
                            📚
                        </div>
                    )}
                </div>

                <div className='minitigerDetailsInfo'>
                    <div className='minitigerDetailsType'>
                        MANGA BAND
                    </div>

                    <h1>
                        {
                            item.Name
                            ?? 'Manga Band'
                        }
                    </h1>

                    <div className='minitigerDetailsMeta'>
                        {volumeNumber != null && (
                            <span>
                                Band {
                                    volumeNumber
                                }
                            </span>
                        )}

                        {item.ProductionYear && (
                            <span>
                                {
                                    item.ProductionYear
                                }
                            </span>
                        )}
                    </div>

                    {publishers.length > 0 && (
                        <div className='minitigerDetailsExtraMeta isPublisher'>
                            <div>
                                <strong>Verlag</strong>
                                <span>{publishers.join(' · ')}</span>
                            </div>
                        </div>
                    )}

                    <p className='minitigerDetailsOverview'>
                        {
                            item.Overview
                            || 'Für diesen Band ist derzeit keine Beschreibung hinterlegt.'
                        }
                    </p>

                    <div className='minitigerDetailsActions'>
                        <button
                            type='button'
                            className='isPrimary'
                            onClick={read}
                        >
                            ▶ Lesen
                        </button>

                        <button
                            type='button'
                            className={
                                played
                                    ? 'isActive'
                                    : ''
                            }
                            onClick={
                                togglePlayed
                            }
                        >
                            ✓
                        </button>

                        <button
                            type='button'
                            className={
                                favorite
                                    ? 'isActive'
                                    : ''
                            }
                            onClick={
                                toggleFavorite
                            }
                        >
                            {
                                favorite
                                    ? '♥'
                                    : '♡'
                            }
                        </button>

                        <MinitigerItemMenuButton
                            apiClient={apiClient}
                            item={item}
                            placement='action'
                            title='Band-Menü'
                        />
                    </div>
                </div>
            </section>

            {siblingVolumesQuery.data
                && siblingVolumesQuery.data.length > 0
                && (
                    <section className='minitigerDetailsSection'>
                        <div className='minitigerDetailsSectionHead'>
                            <div>
                                <h2>Weitere Bände</h2>
                                <span>
                                    {siblingVolumesQuery.data.length} Bände
                                </span>
                            </div>
                        </div>

                        <MangaVolumeCards
                            volumes={siblingVolumesQuery.data}
                            apiClient={apiClient}
                        />
                    </section>
                )}

        </MangaShell>
    );
};
