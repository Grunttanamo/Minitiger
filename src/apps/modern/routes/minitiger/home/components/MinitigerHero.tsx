import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';
import { Link } from 'react-router-dom';

import { playbackManager } from 'components/playback/playbackmanager';
import { appRouter } from 'components/router/appRouter';
import { useApi } from 'hooks/useApi';
import { useGetItems, useToggleFavoriteMutation } from 'hooks/useFetchItems';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    getBackdropImageUrl,
    getLogoImageUrl,
    getMediaTypeName,
    shortOverview
} from '../mediaUtils';

const AUTO_ROTATE_MS = 12000;

const MinitigerHero = () => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        data: candidateResult,
        isPending,
        isError
    } = useGetItems({
        recursive: true,
        limit: 10,
        imageTypeLimit: 3,
        enableImageTypes: [
            ImageType.Backdrop,
            ImageType.Primary,
            ImageType.Logo
        ],
        enableTotalRecordCount: false,
        includeItemTypes: [
            BaseItemKind.Movie,
            BaseItemKind.Series,
            BaseItemKind.MusicVideo
        ],
        sortBy: [ ItemSortBy.Random ]
    });

    const candidates = useMemo(
        () => (candidateResult?.Items ?? [])
            .filter(item =>
                Boolean(
                    item.Id
                    && (
                        item.BackdropImageTags?.length
                        || item.ImageTags?.Primary
                    )
                )
            ),
        [ candidateResult?.Items ]
    );

    const [ activeIndex, setActiveIndex ] = useState(0);
    const [ paused, setPaused ] = useState(false);
    const [ backdropFailed, setBackdropFailed ] = useState(false);
    const [ logoFailed, setLogoFailed ] = useState(false);
    const [ favorite, setFavorite ] = useState(false);

    const activeCandidate = candidates[activeIndex];
    const {
        data: detailedItem
    } = useItem(activeCandidate?.Id ?? undefined);

    const heroItem = (detailedItem ?? activeCandidate) as ItemDto | undefined;
    const favoriteMutation = useToggleFavoriteMutation();

    useEffect(() => {
        if (activeIndex >= candidates.length) {
            setActiveIndex(0);
        }
    }, [ activeIndex, candidates.length ]);

    useEffect(() => {
        setBackdropFailed(false);
        setLogoFailed(false);
        setFavorite(Boolean(heroItem?.UserData?.IsFavorite));
    }, [ heroItem?.Id, heroItem?.UserData?.IsFavorite ]);

    const showPrevious = useCallback(() => {
        if (!candidates.length) {
            return;
        }

        setActiveIndex(index =>
            (index - 1 + candidates.length) % candidates.length
        );
    }, [ candidates.length ]);

    const showNext = useCallback(() => {
        if (!candidates.length) {
            return;
        }

        setActiveIndex(index =>
            (index + 1) % candidates.length
        );
    }, [ candidates.length ]);

    useEffect(() => {
        if (paused || candidates.length <= 1) {
            return;
        }

        const timer = window.setInterval(showNext, AUTO_ROTATE_MS);

        return () => window.clearInterval(timer);
    }, [ candidates.length, paused, showNext ]);

    const handlePlay = useCallback(() => {
        if (!heroItem) {
            return;
        }

        const playbackPosition =
            heroItem.UserData?.PlaybackPositionTicks ?? 0;

        playbackManager.play({
            items: [ heroItem ],
            startPositionTicks: playbackPosition
        }).catch(error => {
            console.error('[Minitiger Hero] Wiedergabe fehlgeschlagen', error);
        });
    }, [ heroItem ]);

    const handleFavorite = useCallback(async () => {
        if (!heroItem?.Id || favoriteMutation.isPending) {
            return;
        }

        try {
            const newValue = await favoriteMutation.mutateAsync({
                itemId: heroItem.Id,
                isFavorite: favorite
            });

            setFavorite(Boolean(newValue));
        } catch (error) {
            console.error(
                '[Minitiger Hero] Watchlisten-Status konnte nicht geändert werden',
                error
            );
        }
    }, [ favorite, favoriteMutation, heroItem?.Id ]);

    if (isPending) {
        return (
            <section className='minitigerHero minitigerHeroLoading'>
                <div className='minitigerHeroLoadingText'>
                    🐯 Banner wird geladen …
                </div>
            </section>
        );
    }

    if (isError || !heroItem) {
        return (
            <section className='minitigerHero minitigerHeroFallback'>
                <div className='minitigerHeroFallbackInner'>
                    <span>🐯</span>
                    <strong>Minitiger Web</strong>
                </div>
            </section>
        );
    }

    const backdropUrl = getBackdropImageUrl(apiClient, heroItem);
    const logoUrl = getLogoImageUrl(apiClient, heroItem);
    const overview = shortOverview(heroItem.Overview);
    const playbackPosition =
        heroItem.UserData?.PlaybackPositionTicks ?? 0;

    const metadata = [
        heroItem.ProductionYear,
        getMediaTypeName(heroItem.Type),
        heroItem.OfficialRating
    ].filter(Boolean);

    return (
        <section
            className='minitigerHero'
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className='minitigerHeroBackdrop'>
                {backdropUrl && !backdropFailed && (
                    <img
                        key={`${heroItem.Id}-backdrop`}
                        src={backdropUrl}
                        alt=''
                        onError={() => setBackdropFailed(true)}
                    />
                )}
            </div>

            <div className='minitigerHeroShade' />

            <div className='minitigerHeroContent'>
                <div className='minitigerHeroLogoHost'>
                    {logoUrl && !logoFailed ? (
                        <img
                            key={`${heroItem.Id}-logo`}
                            className='minitigerHeroLogo'
                            src={logoUrl}
                            alt={heroItem.Name ?? ''}
                            onError={() => setLogoFailed(true)}
                        />
                    ) : (
                        <h1 className='minitigerHeroTitle'>
                            {heroItem.Name}
                        </h1>
                    )}
                </div>

                {metadata.length > 0 && (
                    <div className='minitigerHeroMeta'>
                        {metadata.join(' · ')}
                    </div>
                )}

                {overview && (
                    <p className='minitigerHeroOverview'>
                        {overview}
                    </p>
                )}

                <div className='minitigerHeroActions'>
                    <button
                        type='button'
                        className='minitigerHeroButton minitigerHeroPlay'
                        onClick={handlePlay}
                    >
                        <span aria-hidden='true'>
                            {playbackPosition > 0 ? '▶' : '▶'}
                        </span>
                        <span>
                            {playbackPosition > 0 ? 'Fortsetzen' : 'Abspielen'}
                        </span>
                    </button>

                    <button
                        type='button'
                        className={[
                            'minitigerHeroButton',
                            'minitigerHeroFavorite',
                            favorite ? 'minitigerHeroFavoriteOn' : ''
                        ].filter(Boolean).join(' ')}
                        onClick={handleFavorite}
                        disabled={favoriteMutation.isPending}
                    >
                        <span aria-hidden='true'>
                            {favorite ? '♥' : '♡'}
                        </span>
                        <span>Watchliste</span>
                    </button>

                    <Link
                        className='minitigerHeroButton minitigerHeroInfo'
                        to={appRouter.getRouteUrl(heroItem)}
                    >
                        <span aria-hidden='true'>ⓘ</span>
                        <span>Weitere Infos</span>
                    </Link>
                </div>
            </div>

            {candidates.length > 1 && (
                <div className='minitigerHeroNavigation'>
                    <button
                        type='button'
                        className='minitigerHeroArrow'
                        onClick={showPrevious}
                        aria-label='Vorheriger Banner'
                    >
                        ‹
                    </button>

                    <span className='minitigerHeroCounter'>
                        {activeIndex + 1}/{candidates.length}
                    </span>

                    <button
                        type='button'
                        className='minitigerHeroArrow'
                        onClick={showNext}
                        aria-label='Nächster Banner'
                    >
                        ›
                    </button>
                </div>
            )}
        </section>
    );
};

export default MinitigerHero;
