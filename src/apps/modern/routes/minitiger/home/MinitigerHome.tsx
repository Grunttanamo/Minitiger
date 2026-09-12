import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import { useGetItems } from 'hooks/useFetchItems';

import './MinitigerHome.scss';

const getLibraryIcon = (collectionType?: string | null) => {
    switch (String(collectionType ?? '').toLowerCase()) {
        case 'movies':
            return '🎬';
        case 'tvshows':
            return '📺';
        case 'music':
            return '🎵';
        case 'books':
            return '📚';
        case 'homevideos':
            return '🎞️';
        case 'boxsets':
            return '💿';
        case 'playlists':
            return '🎧';
        default:
            return '🐯';
    }
};

const getLibraryTypeName = (collectionType?: string | null) => {
    switch (String(collectionType ?? '').toLowerCase()) {
        case 'movies':
            return 'Filme';
        case 'tvshows':
            return 'Serien';
        case 'music':
            return 'Musik';
        case 'books':
            return 'Bücher';
        case 'homevideos':
            return 'Videos';
        case 'boxsets':
            return 'Sammlungen';
        case 'playlists':
            return 'Playlists';
        default:
            return 'Bibliothek';
    }
};

const getMediaTypeName = (type?: string | null) => {
    switch (String(type ?? '').toLowerCase()) {
        case 'movie':
            return 'Film';
        case 'series':
            return 'Serie';
        case 'episode':
            return 'Episode';
        case 'audio':
            return 'Musik';
        case 'musicalbum':
            return 'Album';
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

interface PosterProps {
    imageUrl?: string;
}

const MinitigerPoster = ({ imageUrl }: PosterProps) => {
    const [ imageFailed, setImageFailed ] = useState(false);

    if (!imageUrl || imageFailed) {
        return (
            <div className='minitigerPosterFallback'>
                🐯
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt=''
            loading='lazy'
            onError={() => setImageFailed(true)}
        />
    );
};

const MinitigerHome = () => {
    const {
        user,
        __legacyApiClient__: legacyApiClient
    } = useApi();

    const {
        data: userViewsData,
        isPending: librariesPending,
        isError: librariesError
    } = useUserViews({
        userId: user?.Id
    });

    const {
        data: recentItemsData,
        isPending: recentPending,
        isError: recentError
    } = useGetItems({
        recursive: true,
        limit: 18,
        imageTypeLimit: 1,
        enableImageTypes: [ ImageType.Primary ],
        includeItemTypes: [
            BaseItemKind.Movie,
            BaseItemKind.Series,
            BaseItemKind.Episode,
            BaseItemKind.MusicVideo,
            BaseItemKind.Video,
            BaseItemKind.Audio,
            BaseItemKind.MusicAlbum,
            BaseItemKind.Book
        ],
        sortBy: [ ItemSortBy.DateCreated ],
        sortOrder: [ SortOrder.Descending ]
    });

    const libraries = userViewsData?.Items ?? [];
    const recentItems = recentItemsData?.Items ?? [];

    return (
        <main className='minitigerHome'>
            <section className='minitigerIntro'>
                <div className='minitigerIntroEyebrow'>
                    MINITIGER WEB
                </div>

                <h1>
                    Willkommen zurück{user?.Name ? `, ${user.Name}` : ''}.
                </h1>

                <p>
                    Native Jellyfin Web 12 Oberfläche
                </p>
            </section>

            <section className='minitigerSection'>
                <div className='minitigerSectionHeader'>
                    <div>
                        <span className='minitigerSectionAccent' />
                        <h2>Meine Medien</h2>
                    </div>

                    {!librariesPending && !librariesError && (
                        <span className='minitigerLibraryCount'>
                            {libraries.length} Bibliotheken
                        </span>
                    )}
                </div>

                {librariesPending && (
                    <div className='minitigerStatusCard'>
                        Bibliotheken werden geladen …
                    </div>
                )}

                {librariesError && (
                    <div className='minitigerStatusCard minitigerStatusError'>
                        Die Bibliotheken konnten nicht geladen werden.
                    </div>
                )}

                {!librariesPending && !librariesError && libraries.length === 0 && (
                    <div className='minitigerStatusCard'>
                        Keine Bibliotheken gefunden.
                    </div>
                )}

                {!librariesPending && !librariesError && libraries.length > 0 && (
                    <div className='minitigerLibraryGrid'>
                        {libraries.map((library) => (
                            <Link
                                key={library.Id ?? library.Name}
                                className='minitigerLibraryCard'
                                to={appRouter
                                    .getRouteUrl(
                                        library,
                                        { context: library.CollectionType }
                                    )
                                    .substring(1)}
                            >
                                <div className='minitigerLibraryGlow' />

                                <div className='minitigerLibraryIcon'>
                                    {getLibraryIcon(library.CollectionType)}
                                </div>

                                <div className='minitigerLibraryInfo'>
                                    <strong>
                                        {library.Name ?? 'Bibliothek'}
                                    </strong>

                                    <span>
                                        {getLibraryTypeName(
                                            library.CollectionType
                                        )}
                                    </span>
                                </div>

                                <div className='minitigerLibraryArrow'>
                                    ›
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className='minitigerSection minitigerMediaSection'>
                <div className='minitigerSectionHeader'>
                    <div>
                        <span className='minitigerSectionAccent' />
                        <h2>Neu hinzugefügt</h2>
                    </div>

                    {!recentPending && !recentError && recentItems.length > 0 && (
                        <span className='minitigerLibraryCount'>
                            {recentItems.length} Einträge
                        </span>
                    )}
                </div>

                {recentPending && (
                    <div className='minitigerStatusCard'>
                        Medien werden geladen …
                    </div>
                )}

                {recentError && (
                    <div className='minitigerStatusCard minitigerStatusError'>
                        Die Medien konnten nicht geladen werden.
                    </div>
                )}

                {!recentPending && !recentError && recentItems.length === 0 && (
                    <div className='minitigerStatusCard'>
                        Keine Medien gefunden.
                    </div>
                )}

                {!recentPending && !recentError && recentItems.length > 0 && (
                    <div className='minitigerMediaRow'>
                        {recentItems.map((item) => {
                            const imageUrl = item.Id
                                ? legacyApiClient?.getImageUrl(item.Id, {
                                    type: 'Primary',
                                    tag: item.ImageTags?.Primary,
                                    maxWidth: 420,
                                    quality: 90
                                }) || undefined
                                : undefined;

                            return (
                                <Link
                                    key={item.Id ?? item.Name}
                                    className='minitigerMediaCard'
                                    to={appRouter.getRouteUrl(item)}
                                >
                                    <div className='minitigerPoster'>
                                        <MinitigerPoster imageUrl={imageUrl} />
                                        <div className='minitigerPosterShade' />
                                    </div>

                                    <div className='minitigerMediaInfo'>
                                        <strong title={item.Name ?? undefined}>
                                            {item.Name ?? 'Unbekannt'}
                                        </strong>

                                        <span>
                                            {getMediaTypeName(item.Type)}
                                            {item.ProductionYear
                                                ? ` · ${item.ProductionYear}`
                                                : ''}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            <footer className='minitigerDevFooter'>
                🐯 Minitiger Native Home · Phase 2.1
            </footer>
        </main>
    );
};

export default MinitigerHome;
