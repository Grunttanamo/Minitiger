import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
    getMinitigerPendingMessages,
    markMinitigerAdminMessageRead,
    type MinitigerAdminMessage
} from 'apps/modern/routes/minitiger/home/adminMessages';
import { useApi } from 'hooks/useApi';
import {
    parseMinitigerGalleryAvatarReference
} from 'apps/modern/routes/minitiger/home/config/avatarSettings';
import {
    getMinitigerVirtualServerMediaUrl
} from 'apps/modern/routes/minitiger/home/virtualServerSync';

import './MinitigerAdminMessages.scss';

const POLL_INTERVAL_MS = 5000;

const MinitigerAdminMessageHost = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const [ messages, setMessages ] = useState<MinitigerAdminMessage[]>([]);
    const [ busyId, setBusyId ] = useState('');
    const [ error, setError ] = useState('');
    const [ fullscreenTarget, setFullscreenTarget ] = useState<Element | null>(null);
    const [ senderAvatarFailed, setSenderAvatarFailed ] = useState(false);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const syncFullscreenTarget = () => {
            setFullscreenTarget(document.fullscreenElement);
        };

        syncFullscreenTarget();
        document.addEventListener('fullscreenchange', syncFullscreenTarget);

        return () => {
            document.removeEventListener('fullscreenchange', syncFullscreenTarget);
        };
    }, []);

    useEffect(() => {
        setMessages([]);
        setBusyId('');
        setError('');

        if (!apiClient || !user?.Id) {
            return;
        }

        let active = true;
        let running = false;

        const refresh = async () => {
            if (running) {
                return;
            }

            running = true;

            try {
                const pending = await getMinitigerPendingMessages(apiClient);

                if (active) {
                    setMessages(pending);
                    setError('');
                }
            } catch (refreshError) {
                /*
                 * A missing/older Companion must never break normal Jellyfin
                 * navigation or playback. Stay completely silent until an
                 * actual message endpoint is available.
                 */
                console.debug(
                    '[Minitiger AdminMessages] Pending endpoint unavailable.',
                    refreshError
                );
            } finally {
                running = false;
            }
        };

        void refresh();

        const timer = window.setInterval(
            () => {
                void refresh();
            },
            POLL_INTERVAL_MS
        );

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [apiClient, user?.Id]);

    const activeMessage = messages[0];


    const senderAvatarUrl = useMemo(() => {
        const source =
            activeMessage?.senderAvatarImage?.trim()
            ?? '';

        if (!source) {
            return '';
        }

        if (source.startsWith('data:image/')) {
            return source;
        }

        const galleryReference =
            parseMinitigerGalleryAvatarReference(source);

        if (!galleryReference) {
            return '';
        }

        return getMinitigerVirtualServerMediaUrl(
            apiClient,
            galleryReference.id,
            'image',
            galleryReference.revision
        );
    }, [
        activeMessage?.senderAvatarImage,
        apiClient
    ]);

    useEffect(() => {
        setSenderAvatarFailed(false);
    }, [senderAvatarUrl]);

    const target = useMemo(() => {
        if (typeof document === 'undefined') {
            return null;
        }

        /*
         * Jellyfin keeps its own OSD inside the fullscreen container. Portaling
         * the Minitiger notice into the same top-layer element keeps it visible
         * while a video is already playing in fullscreen.
         */
        return fullscreenTarget ?? document.body;
    }, [fullscreenTarget]);

    if (!activeMessage || !target) {
        return null;
    }

    const markRead = async () => {
        if (!apiClient || busyId) {
            return;
        }

        setBusyId(activeMessage.id);
        setError('');

        try {
            await markMinitigerAdminMessageRead(
                apiClient,
                activeMessage.id
            );

            setMessages(current =>
                current.filter(message => message.id !== activeMessage.id)
            );
        } catch (readError) {
            setError(
                readError instanceof Error
                    ? readError.message
                    : String(readError)
            );
        } finally {
            setBusyId('');
        }
    };

    return createPortal(
        <div
            className='minitigerAdminMessageLayer'
            role='region'
            aria-live='assertive'
            aria-label='Nachricht vom Administrator'
        >
            <section className='minitigerAdminMessageToast'>
                <div className='minitigerAdminMessageToastHeader'>
                    <span className='minitigerAdminMessageToastIcon' aria-hidden='true'>
                        {senderAvatarUrl && !senderAvatarFailed ? (
                            <img
                                className='minitigerAdminMessageToastIconImage'
                                src={senderAvatarUrl}
                                alt=''
                                draggable={false}
                                onError={() =>
                                    setSenderAvatarFailed(true)
                                }
                            />
                        ) : (
                            '🐯'
                        )}
                    </span>

                    <div>
                        <small>Nachricht vom Administrator</small>
                        <h3>{activeMessage.title}</h3>
                    </div>
                </div>

                <p className='minitigerAdminMessageToastBody'>
                    {activeMessage.body}
                </p>

                <div className='minitigerAdminMessageToastFooter'>
                    <span>
                        Von {activeMessage.senderName || 'Administrator'}
                        {messages.length > 1
                            ? ` · ${messages.length} offene Nachrichten`
                            : ''}
                    </span>

                    <button
                        type='button'
                        disabled={busyId === activeMessage.id}
                        onClick={() => {
                            void markRead();
                        }}
                    >
                        {busyId === activeMessage.id
                            ? 'Wird bestätigt …'
                            : 'Gelesen'}
                    </button>
                </div>

                {error && (
                    <div className='minitigerAdminMessageToastError'>
                        {error}
                    </div>
                )}
            </section>
        </div>,
        target
    );
};

export default MinitigerAdminMessageHost;

// MINITIGER_PATCH_MARKER: PHASE_18_19_0_GLOBAL_ADMIN_MESSAGE_HOST
// MINITIGER_PATCH_MARKER: PHASE_18_19_1B_SENDER_AVATAR_FALLBACK

// MINITIGER_PATCH_MARKER: PHASE_18_19_1C_MINITIGER_CUSTOM_SENDER_AVATAR
