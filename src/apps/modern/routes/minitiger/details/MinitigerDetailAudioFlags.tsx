import React from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import {
    getLanguageFlagUrl,
    getStreamLanguages
} from '../home/mediaUtils';

interface Props {
    item?: ItemDto;
    enabled: boolean;
    className?: string;
    maxFlags?: number;
}

const MinitigerDetailAudioFlags = ({
    item,
    enabled,
    className = '',
    maxFlags = 4
}: Props) => {
    if (!enabled || !item) {
        return null;
    }

    const flags = getStreamLanguages(item, 'Audio')
        .map(language => ({
            language,
            url: getLanguageFlagUrl(language)
        }))
        .filter(flag => Boolean(flag.url))
        .slice(0, maxFlags);

    if (flags.length === 0) {
        return null;
    }

    return (
        <div
            className={[
                'minitigerDetailAudioFlags',
                className
            ].filter(Boolean).join(' ')}
            aria-label='Audiosprachen'
        >
            {flags.map((flag, index) => (
                <img
                    key={`${flag.language}-${index}`}
                    src={flag.url ?? undefined}
                    alt={flag.language}
                    title={flag.language}
                    onError={event => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            ))}
        </div>
    );
};

export default MinitigerDetailAudioFlags;
