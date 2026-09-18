import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import React, {
    FunctionComponent,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { appHost } from 'components/apphost';
import confirm from 'components/confirm/confirm';
import UserPasswordForm from 'components/dashboard/users/UserPasswordForm';
import loading from 'components/loading/loading';
import Loading from 'components/loading/LoadingComponent';
import Page from 'components/Page';
import Button from 'elements/emby-button/Button';
import { useUser } from 'hooks/api/useUser';
import { useApi } from 'hooks/useApi';
import globalize from 'lib/globalize';
import { queryClient } from 'utils/query/queryClient';

import { createAvatarSource } from 'apps/modern/routes/minitiger/home/components/MinitigerAvatarSettings';
import {
    createMinitigerGalleryAvatarReference
} from 'apps/modern/routes/minitiger/home/config/avatarSettings';
import useMinitigerAvatarGallery from 'apps/modern/routes/minitiger/home/hooks/useMinitigerAvatarGallery';
import useMinitigerAvatarSettings from 'apps/modern/routes/minitiger/home/hooks/useMinitigerAvatarSettings';

const UserProfile: FunctionComponent = () => {
    const [ searchParams ] = useSearchParams();
    const userId = searchParams.get('userId') || undefined;
    const { data: user, isPending: isUserPending } = useUser({ userId });
    const {
        user: currentUser,
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        settings: avatarSettings,
        resolvedImage: resolvedAvatarImage,
        updateSettings: updateAvatarSettings,
        updateSettingsAsync: updateAvatarSettingsAsync
    } = useMinitigerAvatarSettings();

    const {
        config: gallery,
        loading: galleryLoading,
        getAvatarUrl
    } = useMinitigerAvatarGallery();

    const [ galleryOpen, setGalleryOpen ] = useState(false);
    const [ avatarMessage, setAvatarMessage ] = useState('');
    const fileInput = useRef<HTMLInputElement>(null);
    const fileMode = useRef<'minitiger' | 'jellyfin'>('minitiger');

    const libraryMenu = useMemo(
        async () => ((await import('../../../../scripts/libraryMenu')).default),
        []
    );

    const isOwnProfile = Boolean(
        user?.Id
        && currentUser?.Id === user.Id
    );

    useEffect(() => {
        if (user?.Name) {
            void libraryMenu.then(menu => menu.setTitle(user.Name));
        }
    }, [ libraryMenu, user?.Name ]);

    if (isUserPending || !user) {
        return <Loading />;
    }

    const jellyfinImage = (
        apiClient
        && user.Id
        && user.PrimaryImageTag
    )
        ? apiClient.getUserImageUrl(user.Id, {
            tag: user.PrimaryImageTag,
            type: 'Primary'
        })
        : 'assets/img/avatar.png';

    const useCustomAvatar = Boolean(
        isOwnProfile
        && resolvedAvatarImage
    );

    const displayedImage = useCustomAvatar
        ? resolvedAvatarImage
        : jellyfinImage;

    const openFilePicker = (
        mode: 'minitiger' | 'jellyfin'
    ) => {
        fileMode.current = mode;
        if (fileInput.current) {
            fileInput.current.value = '';
            fileInput.current.click();
        }
    };

    const handleFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        if (fileMode.current === 'minitiger') {
            try {
                setAvatarMessage('Avatar wird optimiert …');
                const source = await createAvatarSource(file);
                updateAvatarSettings({
                    image: source,
                    enabled: true
                });
                setAvatarMessage('Custom Avatar gespeichert.');
            } catch (error) {
                setAvatarMessage(
                    error instanceof Error
                        ? error.message
                        : 'Avatar konnte nicht verarbeitet werden.'
                );
            }
            return;
        }

        if (!user.Id) {
            return;
        }

        loading.show();
        try {
            await window.ApiClient.uploadUserImage(
                user.Id,
                ImageType.Primary,
                file
            );
            await queryClient.invalidateQueries({ queryKey: ['User'] });
        } finally {
            loading.hide();
        }
    };

    const deleteJellyfinImage = async () => {
        if (!user.Id) {
            return;
        }

        try {
            await confirm(
                globalize.translate('DeleteImageConfirmation'),
                globalize.translate('DeleteImage')
            );
        } catch {
            return;
        }

        loading.show();
        try {
            await window.ApiClient.deleteUserImage(
                user.Id,
                ImageType.Primary
            );
            await queryClient.invalidateQueries({ queryKey: ['User'] });
        } finally {
            loading.hide();
        }
    };

    const selectGalleryAvatar = async (
        item: (typeof gallery.items)[number]
    ) => {
        try {
            setAvatarMessage('Avatar wird übernommen …');

            await updateAvatarSettingsAsync({
                image:
                    createMinitigerGalleryAvatarReference(
                        item.id,
                        item.revision
                    )
            });

            setGalleryOpen(false);
            setAvatarMessage(`Avatar „${item.name}“ ausgewählt.`);
        } catch (error) {
            setAvatarMessage(
                error instanceof Error
                    ? error.message
                    : 'Avatar konnte nicht übernommen werden.'
            );
        }
    };

    const canEditOriginalImage = Boolean(
        !isOwnProfile
        && appHost.supports('fileinput')
        && (
            currentUser?.Policy?.IsAdministrator
            || user.Policy?.EnableUserPreferenceAccess
        )
    );

    return (
        <Page
            id='userProfilePage'
            title={globalize.translate('Profile')}
            className='mainAnimatedPage libraryPage userPreferencesPage userPasswordPage noSecondaryNavPage'
        >
            <div className='padded-left padded-right padded-bottom-page'>
                <div
                    className='readOnlyContent'
                    style={{
                        margin: '0 auto',
                        marginBottom: '1.8em',
                        padding: '0 1em',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}
                >
                    <div
                        className='imagePlaceHolder'
                        style={{
                            position: 'relative',
                            display: 'inline-block',
                            maxWidth: 200
                        }}
                    >
                        <input
                            ref={fileInput}
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            style={{ display: 'none' }}
                            onChange={event => {
                                const file = event.currentTarget.files?.[0];
                                void handleFile(file);
                            }}
                        />

                        <div
                            id='image'
                            style={{
                                width: 200,
                                height: 200,
                                backgroundImage: `url(${displayedImage})`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                borderRadius:
                                    useCustomAvatar
                                    && avatarSettings.shape === 'square'
                                        ? '10px'
                                        : '100%',
                                backgroundSize: 'cover'
                            }}
                        />
                    </div>

                    <div
                        style={{
                            verticalAlign: 'top',
                            margin: '1em 2em',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.55rem'
                        }}
                    >
                        <h2
                            className='username'
                            style={{ margin: 0, fontSize: 'xx-large' }}
                        >
                            {user.Name}
                        </h2>

                        {isOwnProfile ? (
                            <>
                                <Button
                                    type='button'
                                    className='raised button-submit'
                                    title={avatarSettings.image ? 'Avatar ändern' : 'Avatar hochladen'}
                                    onClick={() => openFilePicker('minitiger')}
                                />

                                {avatarSettings.image && (
                                    <Button
                                        type='button'
                                        className='raised'
                                        title='Bild löschen'
                                        onClick={() => {
                                            updateAvatarSettings({
                                                image: '',
                                                enabled: false
                                            });
                                            setAvatarMessage('Custom Avatar entfernt.');
                                        }}
                                    />
                                )}

                                <Button
                                    type='button'
                                    className='raised'
                                    title='Avatar auswählen'
                                    onClick={() => setGalleryOpen(true)}
                                />


                                <label
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.3rem',
                                        width: '100%',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Avatar-Form
                                    <select
                                        value={avatarSettings.shape}
                                        onChange={event =>
                                            updateAvatarSettings({
                                                shape:
                                                    event.currentTarget.value === 'circle'
                                                        ? 'circle'
                                                        : 'square'
                                            })
                                        }
                                    >
                                        <option value='square'>Quadratisch / Würfel</option>
                                        <option value='circle'>Rund</option>
                                    </select>
                                </label>

                                {avatarMessage && (
                                    <small style={{ maxWidth: 260, textAlign: 'center' }}>
                                        {avatarMessage}
                                    </small>
                                )}
                            </>
                        ) : canEditOriginalImage ? (
                            <>
                                <Button
                                    type='button'
                                    className='raised button-submit'
                                    title={user.PrimaryImageTag ? 'Bild ändern' : globalize.translate('ButtonAddImage')}
                                    onClick={() => openFilePicker('jellyfin')}
                                />

                                {user.PrimaryImageTag && (
                                    <Button
                                        type='button'
                                        className='raised'
                                        title={globalize.translate('DeleteImage')}
                                        onClick={() => void deleteJellyfinImage()}
                                    />
                                )}
                            </>
                        ) : null}
                    </div>
                </div>

                <UserPasswordForm user={user} />
            </div>

            {isOwnProfile && galleryOpen && (
                <div
                    role='presentation'
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) {
                            setGalleryOpen(false);
                        }
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 15000,
                        display: 'grid',
                        placeItems: 'center',
                        padding: '1rem',
                        background: 'rgba(0,0,0,0.72)',
                        backdropFilter: 'blur(5px)'
                    }}
                >
                    <section
                        aria-label='Avatar auswählen'
                        style={{
                            width: 'min(760px, calc(100vw - 2rem))',
                            maxHeight: 'min(720px, calc(100vh - 2rem))',
                            overflow: 'auto',
                            padding: '1rem',
                            borderRadius: '10px',
                            background: '#202020',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.55)'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                marginBottom: '0.8rem'
                            }}
                        >
                            <h2 style={{ margin: 0 }}>Avatar auswählen</h2>
                            <button
                                type='button'
                                onClick={() => setGalleryOpen(false)}
                                aria-label='Avatar-Auswahl schließen'
                            >
                                ×
                            </button>
                        </div>

                        {avatarMessage && (
                            <p style={{ margin: '0 0 0.75rem', opacity: 0.8 }}>
                                {avatarMessage}
                            </p>
                        )}

                        {galleryLoading ? (
                            <p>Avatar-Galerie wird geladen …</p>
                        ) : gallery.items.length === 0 ? (
                            <p>
                                Der Administrator hat noch keine Auswahl-Avatare bereitgestellt.
                            </p>
                        ) : (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '0.8rem'
                                }}
                            >
                                {gallery.items.map(item => (
                                    <button
                                        key={item.id}
                                        type='button'
                                        title={item.name}
                                        onClick={() => void selectGalleryAvatar(item)}
                                        style={{
                                            padding: '0.45rem',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'inherit',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <img
                                            src={getAvatarUrl(item)}
                                            alt={item.name}
                                            style={{
                                                width: '100%',
                                                aspectRatio: '1',
                                                objectFit: 'cover',
                                                display: 'block',
                                                borderRadius: '6px',
                                                marginBottom: '0.4rem'
                                            }}
                                        />
                                        <span>{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* MINITIGER_PATCH_MARKER: PHASE_18_12_0_TEST_USER_PROFILE_INTEGRATION */}
            {/* MINITIGER_PATCH_MARKER: PHASE_18_12_3_TEST_HOME_USER_POLISH */}
            {/* MINITIGER_PATCH_MARKER: PHASE_18_12_4_TEST_BANNER_AVATAR_GLOBAL */}
        </Page>
    );
};

export default UserProfile;
