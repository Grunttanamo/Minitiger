import React, { useMemo, useState } from 'react';

interface Props {
    text?: string | null;
    fallback?: string;
    limit?: number;
    className?: string;
}

const MinitigerExpandableOverview = ({
    text,
    fallback = 'Keine Beschreibung hinterlegt.',
    limit = 500,
    className = 'minitigerDetailsOverview'
}: Props) => {
    const value =
        String(
            text
            ?? ''
        ).trim()
        || fallback;

    const [
        expanded,
        setExpanded
    ] = useState(false);

    const isLong =
        value.length > limit;

    const visible =
        useMemo(
            () => (
                isLong
                && !expanded
                    ? `${value.slice(0, limit).trimEnd()}…`
                    : value
            ),
            [
                expanded,
                isLong,
                limit,
                value
            ]
        );

    return (
        <div className='minitigerExpandableOverview'>
            <p className={className}>
                {visible}
            </p>

            {isLong && (
                <button
                    type='button'
                    className='minitigerOverviewToggle'
                    onClick={() =>
                        setExpanded(value => !value)
                    }
                >
                    {
                        expanded
                            ? 'Weniger anzeigen'
                            : 'Mehr anzeigen'
                    }
                </button>
            )}
        </div>
    );
};

export default MinitigerExpandableOverview;
