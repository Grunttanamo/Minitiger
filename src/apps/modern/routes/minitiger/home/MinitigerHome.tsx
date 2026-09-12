import React from 'react';
import { Link } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';

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
    const { user } = useApi();

    const {
        data: userViewsData,
        isPending,
        isError
    } = useUserViews({
        userId: user?.Id
    });

    const libraries = userViewsData?.Items ?? [];

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

                    {!isPending && !isError && (
                        <span className='minitigerLibraryCount'>
                            {libraries.length} Bibliotheken
                        </span>
                    )}
                </div>

                {isPending && (
                    <div className='minitigerStatusCard'>
                        Bibliotheken werden geladen …
                    </div>
                )}

                {isError && (
                    <div className='minitigerStatusCard minitigerStatusError'>
                        Die Bibliotheken konnten nicht geladen werden.
                    </div>
                )}

                {!isPending && !isError && libraries.length === 0 && (
                    <div className='minitigerStatusCard'>
                        Keine Bibliotheken gefunden.
                    </div>
                )}

                {!isPending && !isError && libraries.length > 0 && (
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

            <footer className='minitigerDevFooter'>
                🐯 Minitiger Native Home · Phase 1
            </footer>
        </main>
    );
};

export default MinitigerHome;
