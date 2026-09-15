import React from 'react';

import type { CardOptions } from 'types/cardOptions';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    getLanguageFlagUrl,
    getRatingLabel,
    getStreamLanguages,
    supportsAudioFlags,
    supportsFskBadge
} from 'apps/modern/routes/minitiger/home/mediaUtils';

import './MinitigerNativeLibraryOverlay.scss';

interface MinitigerNativeOptions {
    showAudioFlags?: boolean;
    showFskBadges?: boolean;
    showPlayedIndicators?: boolean;
    showVirtualAssign?: boolean;
    isVirtuallyAssigned?: (
        itemId?: string | null
    ) => boolean;
    onVirtualAssign?: (
        item: ItemDto
    ) => void;
}

interface Props {
    item: ItemDto;
    cardOptions: CardOptions;
}

const getFskClassName = (
    value?: string | null
) => {
    const rating = String(value ?? '');

    if (rating.includes('18')) return 'fsk18';
    if (rating.includes('16')) return 'fsk16';
    if (rating.includes('12')) return 'fsk12';
    if (rating.includes('6')) return 'fsk6';
    if (rating.includes('0')) return 'fsk0';

    return '';
};

const MinitigerNativeLibraryOverlay = ({
    item,
    cardOptions
}: Props) => {
    if (
        !String(cardOptions.cardCssClass ?? '')
            .split(/\s+/)
            .includes('minitigerNativeLibraryCard')
    ) {
        return null;
    }

    const options = (
        cardOptions as CardOptions & {
            minitiger?: MinitigerNativeOptions;
        }
    ).minitiger;

    if (!options) {
        return null;
    }

    const audioFlags =
        options.showAudioFlags
        && supportsAudioFlags(item)
            ? getStreamLanguages(
                item,
                'Audio'
            )
                .map(language => ({
                    language,
                    url:
                        getLanguageFlagUrl(
                            language
                        )
                }))
                .filter(flag =>
                    Boolean(flag.url)
                )
                .slice(0, 4)
            : [];

    const ratingLabel =
        options.showFskBadges
        && supportsFskBadge(item)
            ? getRatingLabel(
                item.OfficialRating
            )
            : null;

    const played =
        Boolean(item.UserData?.Played);

    const unplayed =
        item.UserData?.UnplayedItemCount
        ?? 0;

    const canVirtualAssign = Boolean(
        options.showVirtualAssign
        && options.onVirtualAssign
        && item.Id
        && (
            String(item.Type ?? '').toLowerCase()
                === 'series'
            || String(item.Type ?? '').toLowerCase()
                === 'movie'
        )
    );

    return (
        <div className='minitigerNativeCardOverlay'>
            {canVirtualAssign && (
                <button
                    type='button'
                    className={[
                        'minitigerNativeVirtualAssign',
                        options.isVirtuallyAssigned?.(
                            item.Id
                        )
                            ? 'isAssigned'
                            : ''
                    ].filter(Boolean).join(' ')}
                    title='Virtuelle Bibliotheken verwalten'
                    aria-label='Virtuelle Bibliotheken verwalten'
                    onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        options.onVirtualAssign?.(item);
                    }}
                >
                    ⊞
                </button>
            )}

            {options.showPlayedIndicators
                && (played || unplayed > 0)
                && (
                    <div
                        className={[
                            'minitigerNativePlayedCorner',
                            played
                                ? 'isComplete'
                                : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <span className='minitigerPlayedCornerText'>{played ? '✓' : unplayed}</span>
                    </div>
                )}

            <div className='minitigerNativeBadgeRow'>
                <div className='minitigerNativeAudioFlags'>
                    {audioFlags.map((flag, index) => (
                        <img
                            key={`${flag.language}-${index}`}
                            className='minitigerNativeAudioFlag'
                            src={flag.url ?? undefined}
                            alt={flag.language}
                            title={flag.language}
                        />
                    ))}
                </div>

                {ratingLabel && (
                    <span
                        className={[
                            'minitigerNativeFsk',
                            getFskClassName(ratingLabel)
                        ].filter(Boolean).join(' ')}
                    >
                        {ratingLabel}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MinitigerNativeLibraryOverlay;
