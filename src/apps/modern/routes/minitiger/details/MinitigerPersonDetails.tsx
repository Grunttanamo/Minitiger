import { useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { clearBackdrop } from 'components/backdrop/backdrop';
import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import MinitigerExpandableOverview from './MinitigerExpandableOverview';
import useMinitigerDetailSettings from '../home/hooks/useMinitigerDetailSettings';
import useMinitigerHomeSettings from '../home/hooks/useMinitigerHomeSettings';
import useMinitigerThemeVariables from '../home/hooks/useMinitigerThemeVariables';
import {
    getBackdropImageUrl,
    getLandscapeImageUrl,
    getPrimaryImageUrl
} from '../home/mediaUtils';
import { getItemRoute } from '../home/routingUtils';

import './MinitigerVideoDetails.scss';

interface Props {
    itemId: string;
}

const MinitigerPersonDetails = ({
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

    const person =
        data as ItemDto | undefined;

    const userId =
        apiClient?.getCurrentUserId()
        ?? '';

    const creditsQuery = useQuery({
        queryKey: [
            'Minitiger',
            'PersonDetails',
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
                        PersonIds: itemId,
                        Recursive: true,
                        IncludeItemTypes:
                            'Movie,Series,MusicVideo',
                        SortBy:
                            'ProductionYear,SortName',
                        SortOrder:
                            'Descending',
                        Limit: 300,
                        Fields:
                            'Overview,PrimaryImageAspectRatio',
                        EnableImageTypes:
                            'Primary,Backdrop,Thumb',
                        ImageTypeLimit: 2,
                        EnableTotalRecordCount: false
                    }
                );

            const values =
                (result?.Items ?? []) as ItemDto[];

            const seen =
                new Set<string>();

            return values.filter(item => {
                const key =
                    item.Id
                    ?? `${item.Type}-${item.Name}`;

                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            });
        },
        enabled: Boolean(
            apiClient
            && userId
            && itemId
        ),
        staleTime: 10 * 60_000
    });

    useEffect(() => {
        clearBackdrop();
    }, []);

    if (
        isPending
        || !person
    ) {
        return (
            <Page
                id='minitigerPersonDetailsLoading'
                className='mainAnimatedPage minitigerVideoDetailsPage'
                isBackButtonEnabled
            >
                <div className='minitigerDetailsLoading'>
                    Person wird geladen …
                </div>
            </Page>
        );
    }

    const poster =
        getPrimaryImageUrl(
            apiClient,
            person
        );

    const credits =
        creditsQuery.data
        ?? [];

    const backdrop =
        getBackdropImageUrl(
            apiClient,
            person
        )
        ?? (
            credits[0]
                ? getBackdropImageUrl(
                    apiClient,
                    credits[0]
                )
                : undefined
        )
        ?? poster;

    const style = {
        '--mt-details-poster-width':
            `${Math.min(
                detailSettings.posterWidth,
                360
            )}px`,
        '--mt-details-content-width':
            `${detailSettings.contentWidth}px`,
        '--mt-details-cast-width':
            `${detailSettings.castWidth}px`
    } as React.CSSProperties;

    return (
        <Page
            id='minitigerPersonDetailsPage'
            className='mainAnimatedPage minitigerVideoDetailsPage minitigerPersonDetailsPage'
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
                <section className='minitigerDetailsHero minitigerPersonHero'>
                    <div className='minitigerPersonPortrait'>
                        {poster ? (
                            <img
                                src={poster}
                                alt=''
                            />
                        ) : (
                            <div className='minitigerDetailsPosterFallback'>
                                👤
                            </div>
                        )}
                    </div>

                    <div className='minitigerDetailsInfo'>
                        <div className='minitigerDetailsType'>
                            PERSON
                        </div>

                        <h1>
                            {person.Name ?? 'Unbekannt'}
                        </h1>

                        <MinitigerExpandableOverview
                            text={person.Overview}
                            fallback='Für diese Person ist derzeit keine Beschreibung hinterlegt.'
                            limit={700}
                        />
                    </div>
                </section>

                {credits.length > 0 && (
                    <section className='minitigerDetailsSection'>
                        <div className='minitigerDetailsSectionHead'>
                            <div>
                                <h2>Bekannt aus</h2>
                                <span>{credits.length}</span>
                            </div>
                        </div>

                        <div className='minitigerPersonCreditsGrid'>
                            {credits.map(item => {
                                const type =
                                    String(
                                        item.Type
                                        ?? ''
                                    ).toLowerCase();

                                const landscape =
                                    type === 'musicvideo';

                                const image =
                                    landscape
                                        ? getLandscapeImageUrl(
                                            apiClient,
                                            item
                                        )
                                        : getPrimaryImageUrl(
                                            apiClient,
                                            item
                                        );

                                return (
                                    <Link
                                        key={item.Id ?? item.Name}
                                        to={getItemRoute(item)}
                                        className={
                                            landscape
                                                ? 'minitigerPersonCreditCard isLandscape'
                                                : 'minitigerPersonCreditCard'
                                        }
                                    >
                                        <div>
                                            {image ? (
                                                <img
                                                    src={image}
                                                    alt=''
                                                />
                                            ) : (
                                                <span>🐯</span>
                                            )}
                                        </div>

                                        <strong>
                                            {item.Name ?? 'Inhalt'}
                                        </strong>

                                        {item.ProductionYear && (
                                            <small>
                                                {item.ProductionYear}
                                            </small>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>
        </Page>
    );
};

export default MinitigerPersonDetails;
