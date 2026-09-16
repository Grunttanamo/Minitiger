import Stack from '@mui/material/Stack';
import React, { type FC } from 'react';
import { useLocation } from 'react-router-dom';

import { appRouter, PUBLIC_PATHS } from 'components/router/appRouter';
import BaseToolbar from 'components/toolbar/AppToolbar';
import ServerButton from 'components/toolbar/ServerButton';

import RemotePlayButton from './RemotePlayButton';
import SyncPlayButton from './SyncPlayButton';
import SearchButton from './SearchButton';

interface AppToolbarProps {
    isDrawerAvailable: boolean
    isDrawerOpen: boolean
    onDrawerButtonClick: (event: React.MouseEvent<HTMLElement>) => void
}

const AppToolbar: FC<AppToolbarProps> = ({
    isDrawerAvailable,
    isDrawerOpen,
    onDrawerButtonClick
}) => {
    const location = useLocation();

    if (location.pathname === '/video') return null;

    const isBackButtonAvailable = window.NativeShell && appRouter.canGoBack(location.pathname);
    const isPublicPath = PUBLIC_PATHS.includes(location.pathname);

    return (
        <BaseToolbar
            buttons={!isPublicPath && (
                <>
                    <button
                        type='button'
                        title='Minitiger Einstellungen'
                        aria-label='Minitiger Einstellungen'
                        onClick={() => {
                            window.dispatchEvent(
                                new CustomEvent(
                                    'minitiger:open-settings'
                                )
                            );
                        }}
                        style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            border: 0,
                            background: 'transparent',
                            color: 'inherit',
                            borderRadius: '50%',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            alignSelf: 'center',
                            margin: 0,
                            lineHeight: 1
                        }}
                    >
                        <span
                            aria-hidden='true'
                            style={{
                                display: 'block',
                                lineHeight: 1,
                                transform: 'translateY(1px)'
                            }}
                        >
                            ⚙
                        </span>
                    </button>
                    <SyncPlayButton />
                    <RemotePlayButton />
                    <SearchButton />
                </>
            )}
            isDrawerAvailable={isDrawerAvailable}
            isDrawerOpen={isDrawerOpen}
            onDrawerButtonClick={onDrawerButtonClick}
            isBackButtonAvailable={isBackButtonAvailable}
            isUserMenuAvailable={!isPublicPath}
            className='padded-left padded-right'
        >
            {!isDrawerAvailable && (
                <Stack
                    direction='row'
                    spacing={0.5}
                >
                    <ServerButton />

                </Stack>
            )}
        </BaseToolbar>
    );
};

export default AppToolbar;
