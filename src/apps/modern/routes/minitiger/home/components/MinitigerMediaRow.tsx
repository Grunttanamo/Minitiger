import type { ApiClient } from 'jellyfin-apiclient';
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

import type { ItemDto } from 'types/base/models/item-dto';

import {
    getCardSubtitle,
    getCardTitle,
    getLandscapeImageUrl,
    getPlaybackProgress,
    getPrimaryImageUrl
} from '../mediaUtils';
import { getItemRoute } from '../routingUtils';
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
    const rowRef = useRef<HTMLDivElement>(null);

    const scrollRow = (direction: -1 | 1) => {
        const row = rowRef.current;

        if (!row) {
            return;
        }

        row.scrollBy({
            left: direction * Math.max(320, row.clientWidth * 0.78),
            behavior: 'smooth'
        });
    };

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

                <div className='minitigerSectionTools'>
                    {!pending && !error && items.length > 0 && (
                        <span className='minitigerLibraryCount'>
                            {items.length} Einträge
                        </span>
                    )}

                    {!pending && !error && items.length > 0 && (
                        <div className='minitigerRowArrows'>
                            <button
                                type='button'
                                onClick={() => scrollRow(-1)}
                                aria-label={`${title} nach links scrollen`}
                            >
                                ‹
                            </button>

                            <button
                                type='button'
                                onClick={() => scrollRow(1)}
                                aria-label={`${title} nach rechts scrollen`}
                            >
                                ›
                            </button>
                        </div>
                    )}
                </div>
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
                    ref={rowRef}
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
                                to={getItemRoute(item)}
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
