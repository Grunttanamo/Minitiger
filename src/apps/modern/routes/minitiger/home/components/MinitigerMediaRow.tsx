import type { ApiClient } from 'jellyfin-apiclient';
import React from 'react';
import { Link } from 'react-router-dom';

import { appRouter } from 'components/router/appRouter';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    getCardSubtitle,
    getCardTitle,
    getLandscapeImageUrl,
    getPlaybackProgress,
    getPrimaryImageUrl
} from '../mediaUtils';
import MinitigerPoster from './MinitigerPoster';

interface MinitigerMediaRowProps {
    title: string;
    items: ItemDto[];
    apiClient?: ApiClient;
    pending?: boolean;
    error?: boolean;
    variant?: 'poster' | 'landscape';
    showProgress?: boolean;
    emptyText?: string;
}

const MinitigerMediaRow = ({
    title,
    items,
    apiClient,
    pending = false,
    error = false,
    variant = 'poster',
    showProgress = false,
    emptyText
}: MinitigerMediaRowProps) => {
    if (!pending && !error && items.length === 0 && !emptyText) {
        return null;
    }

    return (
        <section className='minitigerSection minitigerMediaSection'>
            <div className='minitigerSectionHeader'>
                <div>
                    <span className='minitigerSectionAccent' />
                    <h2>{title}</h2>
                </div>

                {!pending && !error && items.length > 0 && (
                    <span className='minitigerLibraryCount'>
                        {items.length} Einträge
                    </span>
                )}
            </div>

            {pending && (
                <div className='minitigerStatusCard'>
                    {title} wird geladen …
                </div>
            )}

            {error && (
                <div className='minitigerStatusCard minitigerStatusError'>
                    {title} konnte nicht geladen werden.
                </div>
            )}

            {!pending && !error && items.length === 0 && emptyText && (
                <div className='minitigerStatusCard'>
                    {emptyText}
                </div>
            )}

            {!pending && !error && items.length > 0 && (
                <div
                    className={[
                        'minitigerMediaRow',
                        variant === 'landscape'
                            ? 'minitigerMediaRowLandscape'
                            : ''
                    ].filter(Boolean).join(' ')}
                >
                    {items.map((item) => {
                        const imageUrl = variant === 'landscape'
                            ? getLandscapeImageUrl(apiClient, item)
                            : getPrimaryImageUrl(apiClient, item);

                        const progress = showProgress
                            ? getPlaybackProgress(item)
                            : 0;

                        return (
                            <Link
                                key={item.Id ?? item.Name}
                                className={[
                                    'minitigerMediaCard',
                                    variant === 'landscape'
                                        ? 'minitigerMediaCardLandscape'
                                        : ''
                                ].filter(Boolean).join(' ')}
                                to={appRouter.getRouteUrl(item)}
                            >
                                <div
                                    className={[
                                        'minitigerPoster',
                                        variant === 'landscape'
                                            ? 'minitigerPosterLandscape'
                                            : ''
                                    ].filter(Boolean).join(' ')}
                                >
                                    <MinitigerPoster imageUrl={imageUrl} />

                                    <div className='minitigerPosterShade' />

                                    {showProgress && progress > 0 && (
                                        <div className='minitigerProgressTrack'>
                                            <div
                                                className='minitigerProgressValue'
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className='minitigerMediaInfo'>
                                    <strong title={getCardTitle(item)}>
                                        {getCardTitle(item)}
                                    </strong>

                                    <span title={getCardSubtitle(item)}>
                                        {getCardSubtitle(item)}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default MinitigerMediaRow;
