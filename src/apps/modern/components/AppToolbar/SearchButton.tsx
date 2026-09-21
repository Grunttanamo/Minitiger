import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React, {
    type FC,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useNavigate } from 'react-router-dom';

import { playbackManager } from 'components/playback/playbackmanager';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    getLandscapeImageUrl,
    getPrimaryImageUrl
} from '../../routes/minitiger/home/mediaUtils';
import {
    getItemRoute
} from '../../routes/minitiger/home/routingUtils';

import './MinitigerSearch.scss';

type SearchGroupKey =
    | 'series'
    | 'movies'
    | 'books'
    | 'music'
    | 'musicVideos'
    | 'episodes';

type MusicSearchItem = ItemDto & {
    Album?: string | null;
    AlbumId?: string | null;
    AlbumArtist?: string | null;
    Artists?: string[] | null;
};

interface SearchGroups {
    series: ItemDto[];
    movies: ItemDto[];
    books: ItemDto[];
    music: ItemDto[];
    musicVideos: ItemDto[];
    episodes: ItemDto[];
}

const EMPTY_GROUPS: SearchGroups = {
    series: [],
    movies: [],
    books: [],
    music: [],
    musicVideos: [],
    episodes: []
};

const GROUPS: Array<{
    key: SearchGroupKey;
    title: string;
}> = [
    { key: 'series', title: 'Serien' },
    { key: 'movies', title: 'Filme' },
    { key: 'books', title: 'Manga / Bücher' },
    { key: 'music', title: 'Musik' },
    { key: 'musicVideos', title: 'Musikvideos' },
    { key: 'episodes', title: 'Folgen' }
];

const uniqueItems = (
    values: ItemDto[]
) => {
    const seen = new Set<string>();

    return values.filter(item => {
        const key = String(
            item.Id
            ?? `${item.Type}:${item.Name}`
        );

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const isUsableSearchItem = (
    item: ItemDto
) => {
    const extended =
        item as ItemDto & {
            IsVirtualItem?: boolean | null;
            LocationType?: string | null;
        };

    return !extended.IsVirtualItem
        && String(
            extended.LocationType
            ?? ''
        ).toLowerCase() !== 'virtual';
};

const getEpisodeCode = (
    item: ItemDto
) => {
    const season =
        item.ParentIndexNumber;
    const episode =
        item.IndexNumber;

    if (
        season != null
        && episode != null
    ) {
        return `S${season}:E${episode}`;
    }

    if (episode != null) {
        return `E${episode}`;
    }

    return 'Folge';
};

const getMusicKind = (
    item: ItemDto
) => {
    switch (
        String(
            item.Type
            ?? ''
        ).toLowerCase()
    ) {
        case 'musicartist':
            return 'Künstler';
        case 'musicalbum':
            return 'Album';
        case 'audio':
            return 'Titel';
        default:
            return 'Musik';
    }
};

const getResultMeta = (
    item: ItemDto
) => {
    const type =
        String(
            item.Type
            ?? ''
        ).toLowerCase();

    if (type === 'episode') {
        return [
            item.SeriesName,
            getEpisodeCode(item)
        ]
            .filter(Boolean)
            .join(' · ');
    }

    if (
        type === 'musicartist'
        || type === 'musicalbum'
        || type === 'audio'
    ) {
        const musicItem =
            item as MusicSearchItem;

        const artist =
            musicItem.AlbumArtists?.[0]?.Name
            ?? musicItem.ArtistItems?.[0]?.Name
            ?? musicItem.AlbumArtist
            ?? musicItem.Artists?.[0]
            ?? '';

        return [
            getMusicKind(item),
            type === 'audio'
                ? musicItem.Album
                : artist,
            item.ProductionYear
        ]
            .filter(Boolean)
            .join(' · ');
    }

    if (type === 'musicvideo') {
        const musicItem =
            item as MusicSearchItem;

        const artist =
            musicItem.ArtistItems?.[0]?.Name
            ?? musicItem.Artists?.[0]
            ?? '';

        return [
            'Musikvideo',
            artist,
            item.ProductionYear
        ]
            .filter(Boolean)
            .join(' · ');
    }

    if (type === 'book') {
        return [
            'Buch / Manga',
            item.ProductionYear
        ]
            .filter(Boolean)
            .join(' · ');
    }

    if (type === 'folder') {
        return 'Manga / Bücher';
    }

    if (type === 'series') {
        return [
            'Serie',
            item.ProductionYear
        ]
            .filter(Boolean)
            .join(' · ');
    }

    if (type === 'movie') {
        return [
            'Film',
            item.ProductionYear
        ]
            .filter(Boolean)
            .join(' · ');
    }

    return [
        item.Type,
        item.ProductionYear
    ]
        .filter(Boolean)
        .join(' · ');
};

const SearchButton: FC = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const navigate = useNavigate();
    const rootRef =
        useRef<HTMLDivElement>(null);
    const inputRef =
        useRef<HTMLInputElement>(null);
    const requestIdRef =
        useRef(0);

    const [
        open,
        setOpen
    ] = useState(false);
    const [
        query,
        setQuery
    ] = useState('');
    const [
        groups,
        setGroups
    ] = useState<SearchGroups>(
        EMPTY_GROUPS
    );
    const [
        loading,
        setLoading
    ] = useState(false);
    const [
        error,
        setError
    ] = useState('');

    const userId =
        user?.Id
        ?? apiClient?.getCurrentUserId()
        ?? '';

    const totalResults = useMemo(
        () => GROUPS.reduce(
            (
                total,
                group
            ) => (
                total
                + groups[group.key].length
            ),
            0
        ),
        [ groups ]
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        window.setTimeout(
            () => inputRef.current?.focus(),
            20
        );
    }, [ open ]);

    useEffect(() => {
        const onPointerDown = (
            event: MouseEvent
        ) => {
            if (
                rootRef.current
                && !rootRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
            }
        };

        const onKeyDown = (
            event: KeyboardEvent
        ) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            onPointerDown
        );
        document.addEventListener(
            'keydown',
            onKeyDown
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                onPointerDown
            );
            document.removeEventListener(
                'keydown',
                onKeyDown
            );
        };
    }, []);

    useEffect(() => {
        const term =
            query.trim();

        requestIdRef.current += 1;
        const requestId =
            requestIdRef.current;

        if (
            !open
            || term.length < 2
            || !apiClient
            || !userId
        ) {
            setGroups(
                EMPTY_GROUPS
            );
            setLoading(false);
            setError('');
            return;
        }

        setLoading(true);
        setError('');

        const timer =
            window.setTimeout(
                async () => {
                    const common = {
                        SearchTerm:
                            term,
                        Recursive:
                            true,
                        SortBy:
                            'SortName',
                        SortOrder:
                            'Ascending',
                        Fields:
                            'Overview,ProductionYear,ParentIndexNumber,IndexNumber,SeriesName,Album,AlbumId,Artists,AlbumArtists,ArtistItems',
                        ImageTypeLimit:
                            3,
                        EnableImageTypes:
                            'Primary,Thumb,Backdrop',
                        EnableTotalRecordCount:
                            false
                    };

                    const getItems = async (
                        includeItemTypes: string,
                        limit: number,
                        extra: Record<
                            string,
                            unknown
                        > = {}
                    ) => {
                        const result =
                            await apiClient.getItems(
                                userId,
                                {
                                    ...common,
                                    IncludeItemTypes:
                                        includeItemTypes,
                                    Limit:
                                        limit,
                                    ...extra
                                }
                            );

                        return (
                            result?.Items
                            ?? []
                        ) as ItemDto[];
                    };

                    try {
                        const [
                            series,
                            movies,
                            artists,
                            albums,
                            tracks,
                            musicVideos,
                            episodes,
                            books,
                            userViews
                        ] = await Promise.all([
                            getItems(
                                'Series',
                                10
                            ),
                            getItems(
                                'Movie',
                                10
                            ),
                            getItems(
                                'MusicArtist',
                                5
                            ),
                            getItems(
                                'MusicAlbum',
                                6
                            ),
                            getItems(
                                'Audio',
                                8
                            ),
                            getItems(
                                'MusicVideo',
                                10
                            ),
                            getItems(
                                'Episode',
                                14,
                                {
                                    IsMissing:
                                        false
                                }
                            ),
                            getItems(
                                'Book',
                                12
                            ),
                            apiClient.getUserViews(
                                {},
                                userId
                            )
                        ]);

                        const bookViews =
                            (
                                userViews?.Items
                                ?? []
                            ).filter(view => {
                                const collection =
                                    String(
                                        view.CollectionType
                                        ?? ''
                                    ).toLowerCase();

                                return (
                                    collection === 'books'
                                    || collection === 'book'
                                );
                            });

                        const folderResults =
                            (
                                await Promise.all(
                                    bookViews
                                        .filter(view =>
                                            Boolean(
                                                view.Id
                                            )
                                        )
                                        .map(view =>
                                            getItems(
                                                'Folder',
                                                12,
                                                {
                                                    ParentId:
                                                        view.Id
                                                }
                                            )
                                        )
                                )
                            ).flat();

                        if (
                            requestId
                            !== requestIdRef.current
                        ) {
                            return;
                        }

                        setGroups({
                            series:
                                uniqueItems(
                                    series.filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 10),
                            movies:
                                uniqueItems(
                                    movies.filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 10),
                            books:
                                uniqueItems(
                                    [
                                        ...folderResults,
                                        ...books
                                    ].filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 12),
                            music:
                                uniqueItems(
                                    [
                                        ...artists,
                                        ...albums,
                                        ...tracks
                                    ].filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 16),
                            musicVideos:
                                uniqueItems(
                                    musicVideos.filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 10),
                            episodes:
                                uniqueItems(
                                    episodes.filter(
                                        isUsableSearchItem
                                    )
                                ).slice(0, 14)
                        });
                        setLoading(false);
                    } catch (searchError) {
                        if (
                            requestId
                            !== requestIdRef.current
                        ) {
                            return;
                        }

                        console.error(
                            '[Minitiger Search] Suche fehlgeschlagen',
                            searchError
                        );

                        setGroups(
                            EMPTY_GROUPS
                        );
                        setLoading(false);
                        setError(
                            'Die Suche konnte gerade nicht geladen werden.'
                        );
                    }
                },
                280
            );

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        apiClient,
        open,
        query,
        userId
    ]);

    const closeSearch = () => {
        setOpen(false);
    };

    const clearSearch = () => {
        setQuery('');
        setGroups(
            EMPTY_GROUPS
        );
        setError('');
        inputRef.current?.focus();
    };

    const openResult = (
        item: ItemDto
    ) => {
        const type =
            String(
                item.Type
                ?? ''
            ).toLowerCase();

        closeSearch();

        if (type === 'audio') {
            playbackManager.play({
                items: [ item ]
            }).catch(playError => {
                console.error(
                    '[Minitiger Search] Musiktitel konnte nicht gestartet werden',
                    playError
                );
            });

            return;
        }

        navigate(
            getItemRoute(item)
        );
    };

    const getResultImage = (
        item: ItemDto
    ) => {
        const type =
            String(
                item.Type
                ?? ''
            ).toLowerCase();

        if (
            type === 'episode'
            || type === 'musicvideo'
        ) {
            return getLandscapeImageUrl(
                apiClient,
                item
            );
        }

        return getPrimaryImageUrl(
            apiClient,
            item
        );
    };

    return (
        <div
            ref={rootRef}
            className={`minitigerSearchRoot${open ? ' isOpen' : ''}`}
        >
            {!open && (
                <Tooltip
                    title={globalize.translate('Search')}
                >
                    <IconButton
                        size='large'
                        aria-label='Minitiger Suche'
                        color='inherit'
                        onClick={() =>
                            setOpen(true)
                        }
                    >
                        <SearchIcon />
                    </IconButton>
                </Tooltip>
            )}

            {open && (
                <div className='minitigerSearchExpanded'>
                    <div className='minitigerSearchInputShell'>
                        <SearchIcon
                            className='minitigerSearchInputIcon'
                        />

                        <input
                            ref={inputRef}
                            type='search'
                            value={query}
                            placeholder='Minitiger durchsuchen …'
                            aria-label='Minitiger durchsuchen'
                            autoComplete='off'
                            spellCheck={false}
                            onChange={event =>
                                setQuery(
                                    event.currentTarget.value
                                )
                            }
                        />

                        {query && (
                            <button
                                type='button'
                                className='minitigerSearchClear'
                                title='Suche leeren'
                                aria-label='Suche leeren'
                                onClick={clearSearch}
                            >
                                ×
                            </button>
                        )}

                        <IconButton
                            size='small'
                            color='inherit'
                            aria-label='Suche schließen'
                            title='Suche schließen'
                            onClick={closeSearch}
                        >
                            <CloseIcon
                                fontSize='small'
                            />
                        </IconButton>
                    </div>

                    <div className='minitigerSearchDropdown'>
                        {query.trim().length < 2 && (
                            <div className='minitigerSearchState'>
                                Mindestens 2 Zeichen eingeben …
                            </div>
                        )}

                        {query.trim().length >= 2
                            && loading
                            && (
                                <div className='minitigerSearchState'>
                                    Suche läuft …
                                </div>
                            )}

                        {query.trim().length >= 2
                            && !loading
                            && error
                            && (
                                <div className='minitigerSearchState isError'>
                                    {error}
                                </div>
                            )}

                        {query.trim().length >= 2
                            && !loading
                            && !error
                            && totalResults === 0
                            && (
                                <div className='minitigerSearchState'>
                                    Keine Treffer gefunden.
                                </div>
                            )}

                        {query.trim().length >= 2
                            && !loading
                            && !error
                            && totalResults > 0
                            && (
                            <div className='minitigerSearchResults'>
                                {GROUPS.map(group => {
                                    const items =
                                        groups[
                                            group.key
                                        ];

                                    if (
                                        items.length
                                        === 0
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <section
                                            key={group.key}
                                            className='minitigerSearchGroup'
                                        >
                                            <div className='minitigerSearchGroupTitle'>
                                                <span>
                                                    {group.title}
                                                </span>
                                                <small>
                                                    {items.length}
                                                </small>
                                            </div>

                                            <div className='minitigerSearchGroupItems'>
                                                {items.map(item => {
                                                    const image =
                                                        getResultImage(
                                                            item
                                                        );

                                                    return (
                                                        <button
                                                            key={
                                                                item.Id
                                                                ?? `${item.Type}-${item.Name}`
                                                            }
                                                            type='button'
                                                            className='minitigerSearchResult'
                                                            onClick={() =>
                                                                openResult(
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            <span className='minitigerSearchResultImage'>
                                                                {image ? (
                                                                    <img
                                                                        src={image}
                                                                        alt=''
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        🐯
                                                                    </span>
                                                                )}
                                                            </span>

                                                            <span className='minitigerSearchResultText'>
                                                                <strong>
                                                                    {
                                                                        item.Name
                                                                        ?? 'Unbenannt'
                                                                    }
                                                                </strong>
                                                                <small>
                                                                    {
                                                                        getResultMeta(
                                                                            item
                                                                        )
                                                                    }
                                                                </small>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// MINITIGER_PATCH_MARKER: PHASE_18_22_0_MINITIGER_SEARCH

export default SearchButton;
