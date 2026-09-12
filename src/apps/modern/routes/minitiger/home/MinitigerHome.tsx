import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import React from 'react';
import { Link } from 'react-router-dom';

import { useNextUp } from 'apps/legacy/features/libraries/api/useNextUp';
import { useResumeItems } from 'apps/legacy/features/libraries/api/useResumeItems';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import { useGetItems } from 'hooks/useFetchItems';
import type { ItemDto } from 'types/base/models/item-dto';

import MinitigerHero from './components/MinitigerHero';
import MinitigerMediaRow from './components/MinitigerMediaRow';
import { getItemRoute } from './routingUtils';
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

const MinitigerHome = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        data: userViewsData,
        isPending: librariesPending,
        isError: librariesError
    } = useUserViews({
        userId: user?.Id
    });

    const {
        data: resumeData,
        isPending: resumePending,
        isError: resumeError
    } = useResumeItems({
        limit: 18,
        fields: [
            ItemFields.PrimaryImageAspectRatio
        ],
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false
    });

    const {
        data: nextUpData,
        isPending: nextUpPending,
        isError: nextUpError
    } = useNextUp({
        limit: 18,
        fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.DateCreated
        ],
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false,
        enableResumable: false
    });

    const {
        data: watchlistData,
        isPending: watchlistPending,
        isError: watchlistError
    } = useGetItems({
        recursive: true,
        limit: 18,
        isFavorite: true,
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false,
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
        sortBy: [ ItemSortBy.SortName ],
        sortOrder: [ SortOrder.Ascending ]
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
    const resumeItems = (resumeData?.Items ?? []) as ItemDto[];
    const nextUpItems = (nextUpData?.Items ?? []) as ItemDto[];
    const watchlistItems = watchlistData?.Items ?? [];
    const recentItems = recentItemsData?.Items ?? [];

    return (
        <main className='minitigerHome'>
            <MinitigerHero />

            <div className='minitigerHomeContent'>
                <section className='minitigerSection minitigerLibrarySection'>
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

                    {!librariesPending
                        && !librariesError
                        && libraries.length > 0
                        && (
                            <div className='minitigerLibraryGrid'>
                                {libraries.map((library) => (
                                    <Link
                                        key={library.Id ?? library.Name}
                                        className='minitigerLibraryCard'
                                        to={getItemRoute(
                                            library as ItemDto,
                                            {
                                                context:
                                                    library.CollectionType
                                            }
                                        )}
                                    >
                                        <div className='minitigerLibraryGlow' />

                                        <div className='minitigerLibraryIcon'>
                                            {getLibraryIcon(
                                                library.CollectionType
                                            )}
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

                <MinitigerMediaRow
                    title='Fortsetzen'
                    items={resumeItems}
                    apiClient={apiClient}
                    pending={resumePending}
                    error={resumeError}
                    variant='landscape'
                    showProgress
                />

                <MinitigerMediaRow
                    title='Als Nächstes'
                    items={nextUpItems}
                    apiClient={apiClient}
                    pending={nextUpPending}
                    error={nextUpError}
                    variant='landscape'
                />

                <MinitigerMediaRow
                    title='Watchliste'
                    items={watchlistItems}
                    apiClient={apiClient}
                    pending={watchlistPending}
                    error={watchlistError}
                    variant='poster'
                />

                <MinitigerMediaRow
                    title='Neu hinzugefügt'
                    items={recentItems}
                    apiClient={apiClient}
                    pending={recentPending}
                    error={recentError}
                    variant='poster'
                    emptyText='Keine neuen Medien gefunden.'
                />

                <footer className='minitigerDevFooter'>
                    🐯 Minitiger Native Home · Phase 4
                </footer>
            </div>
        </main>
    );
};

export default MinitigerHome;
