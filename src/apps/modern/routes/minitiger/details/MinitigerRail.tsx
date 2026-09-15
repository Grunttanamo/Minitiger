import React, {
    type PropsWithChildren,
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

interface Props extends PropsWithChildren {
    className?: string;
    ariaLabel?: string;
}

const MinitigerRail = ({
    className,
    ariaLabel,
    children
}: Props) => {
    const trackRef =
        useRef<HTMLDivElement>(null);

    const [
        hasOverflow,
        setHasOverflow
    ] = useState(false);

    const [
        canScrollLeft,
        setCanScrollLeft
    ] = useState(false);

    const [
        canScrollRight,
        setCanScrollRight
    ] = useState(false);

    const updateScrollState =
        useCallback(() => {
            const track =
                trackRef.current;

            if (!track) {
                setHasOverflow(false);
                setCanScrollLeft(false);
                setCanScrollRight(false);
                return;
            }

            const maxScroll =
                Math.max(
                    0,
                    track.scrollWidth
                    - track.clientWidth
                );

            const overflow =
                maxScroll > 4;

            setHasOverflow(
                overflow
            );

            setCanScrollLeft(
                overflow
                && track.scrollLeft > 4
            );

            setCanScrollRight(
                overflow
                && track.scrollLeft
                    < maxScroll - 4
            );
        }, []);

    useEffect(() => {
        const track =
            trackRef.current;

        if (!track) {
            return;
        }

        const onScroll = () =>
            updateScrollState();

        track.addEventListener(
            'scroll',
            onScroll,
            {
                passive: true
            }
        );

        const resizeObserver =
            new ResizeObserver(
                updateScrollState
            );

        resizeObserver.observe(
            track
        );

        Array.from(
            track.children
        ).forEach(child => {
            if (
                child
                instanceof HTMLElement
            ) {
                resizeObserver.observe(
                    child
                );
            }
        });

        const frame =
            window.requestAnimationFrame(
                updateScrollState
            );

        const timer =
            window.setTimeout(
                updateScrollState,
                120
            );

        window.addEventListener(
            'resize',
            updateScrollState
        );

        return () => {
            track.removeEventListener(
                'scroll',
                onScroll
            );

            resizeObserver.disconnect();

            window.cancelAnimationFrame(
                frame
            );

            window.clearTimeout(
                timer
            );

            window.removeEventListener(
                'resize',
                updateScrollState
            );
        };
    }, [
        children,
        updateScrollState
    ]);

    const scroll = useCallback((
        direction: -1 | 1
    ) => {
        const track =
            trackRef.current;

        if (!track) {
            return;
        }

        const distance =
            Math.max(
                320,
                Math.round(
                    track.clientWidth
                    * 0.78
                )
            );

        track.scrollBy({
            left:
                direction
                * distance,
            behavior: 'smooth'
        });

        window.setTimeout(
            updateScrollState,
            360
        );
    }, [
        updateScrollState
    ]);

    return (
        <div
            className={[
                'minitigerRail',
                hasOverflow
                    ? 'hasOverflow'
                    : ''
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div
                ref={trackRef}
                className={[
                    'minitigerRailTrack',
                    className
                ].filter(Boolean).join(' ')}
                aria-label={ariaLabel}
            >
                {children}
            </div>

            {hasOverflow && (
                <div
                    className='minitigerRailControls'
                    aria-label={
                        ariaLabel
                            ? `${ariaLabel} Navigation`
                            : 'Reihen-Navigation'
                    }
                >
                    <button
                        type='button'
                        className='minitigerRailArrow isLeft'
                        aria-label='Nach links'
                        disabled={!canScrollLeft}
                        onClick={() =>
                            scroll(-1)
                        }
                    >
                        ‹
                    </button>

                    <button
                        type='button'
                        className='minitigerRailArrow isRight'
                        aria-label='Nach rechts'
                        disabled={!canScrollRight}
                        onClick={() =>
                            scroll(1)
                        }
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
};

export default MinitigerRail;
