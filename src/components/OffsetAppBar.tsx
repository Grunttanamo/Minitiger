import AppBar, { type AppBarProps } from '@mui/material/AppBar';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type FC,
    type PropsWithChildren
} from 'react';
import ResizeObserver from 'resize-observer-polyfill';

const DEFAULT_APP_BAR_HEIGHT = 64;
const DENSE_APP_BAR_HEIGHT = 48;

interface OffsetAppBarProps extends AppBarProps {
    dense?: boolean;
    elevation?: number;
    forceTransparent?: boolean;
}

const OffsetAppBar: FC<PropsWithChildren<OffsetAppBarProps>> = ({
    children,
    dense = false,
    elevation = 1,
    forceTransparent = false,
    ...props
}) => {
    const appBarRef = useRef<HTMLHtmlElement>(null);
    const [height, setHeight] = useState(
        dense ? DENSE_APP_BAR_HEIGHT : DEFAULT_APP_BAR_HEIGHT
    );
    const [
        nestedScrollTrigger,
        setNestedScrollTrigger
    ] = useState(false);

    const scrollTrigger = useScrollTrigger({
        disableHysteresis: true,
        threshold: 0
    });

    useLayoutEffect(() => {
        const el = appBarRef.current;
        if (!el) return;

        const updateHeight = () => {
            setHeight(Math.ceil(el.getBoundingClientRect().height || 0));
        };

        updateHeight();

        const observer = new ResizeObserver(entries => {
            window.requestAnimationFrame(() => {
                for (const entry of entries) {
                    setHeight(Math.ceil(entry.contentRect.height || 0));
                }
            });
        });
        observer.observe(el);
        window.addEventListener('resize', updateHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    useEffect(() => {
        const getScrollTop = (
            target?: EventTarget | null
        ) => {
            let scrollTop = Math.max(
                window.scrollY,
                document.documentElement.scrollTop,
                document.body.scrollTop
            );

            if (target instanceof HTMLElement) {
                scrollTop = Math.max(
                    scrollTop,
                    target.scrollTop
                );
            }

            document.querySelectorAll<HTMLElement>(
                '.mainAnimatedPage, .smoothScrollY, .scrollY, '
                + '.emby-scroller, [data-scrollable="true"]'
            ).forEach(element => {
                scrollTop = Math.max(
                    scrollTop,
                    element.scrollTop
                );
            });

            return scrollTop;
        };

        const update = (event?: Event) => {
            setNestedScrollTrigger(
                getScrollTop(event?.target) > 1
            );
        };

        update();

        document.addEventListener(
            'scroll',
            update,
            true
        );
        window.addEventListener(
            'resize',
            update
        );

        return () => {
            document.removeEventListener(
                'scroll',
                update,
                true
            );
            window.removeEventListener(
                'resize',
                update
            );
        };
    }, []);

    const raised = (
        scrollTrigger
        || nestedScrollTrigger
    ) && !forceTransparent;

    return (
        <>
            <AppBar
                {...props}
                ref={appBarRef}
                position='fixed'
                color={raised ? 'default' : 'transparent'}
                elevation={raised ? elevation : 0}
                sx={forceTransparent ? {
                    backgroundColor: 'transparent !important',
                    backgroundImage: 'none !important',
                    boxShadow: 'none !important'
                } : props.sx}
            >
                {children}
            </AppBar>
            <div
                aria-hidden='true'
                style={{
                    height,
                    width: '100%',
                    flexShrink: 0
                }}
            />
        </>
    );
};

export default OffsetAppBar;

// MINITIGER_PATCH_MARKER: PHASE_18_24_1_TEST_POLISH_ROW_CONFIGS
