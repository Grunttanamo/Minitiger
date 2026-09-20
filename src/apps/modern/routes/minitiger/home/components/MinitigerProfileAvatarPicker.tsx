import React, { useMemo, useState } from 'react';

import {
    createMinitigerGalleryAvatarReference
} from '../config/avatarSettings';
import {
    MINITIGER_PROFILE_AVATARS,
    type MinitigerProfileAvatarId
} from '../config/profiles';
import useMinitigerAvatarGallery from '../hooks/useMinitigerAvatarGallery';

interface MinitigerProfileAvatarPickerProps {
    currentImage?: string;
    currentFallback: MinitigerProfileAvatarId;
    onSelectImage: (reference: string) => void;
    onSelectFallback: (
        avatar: MinitigerProfileAvatarId
    ) => void;
    onClose: () => void;
}

const MinitigerProfileAvatarPicker = ({
    currentImage = '',
    currentFallback,
    onSelectImage,
    onSelectFallback,
    onClose
}: MinitigerProfileAvatarPickerProps) => {
    const gallery = useMinitigerAvatarGallery();
    const [ uploadMessage, setUploadMessage ] =
        useState('');

    const gallerySelections = useMemo(
        () => gallery.config.items.map(item => ({
            item,
            reference:
                createMinitigerGalleryAvatarReference(
                    item.id,
                    item.revision
                )
        })),
        [gallery.config.items]
    );

    return (
        <div
            className='minitigerProfileAvatarPickerBackdrop'
            role='presentation'
            onMouseDown={event => {
                if (
                    event.target
                    === event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                className='minitigerProfileAvatarPicker'
                role='dialog'
                aria-modal='true'
                aria-label='Profilavatar auswählen'
            >
                <div className='minitigerProfileAvatarPickerHeader'>
                    <div>
                        <h4>Avatar auswählen</h4>
                        <p>
                            Wähle ein Bild aus der
                            Minitiger-Avatar-Galerie oder
                            nutze eines der Symbole.
                        </p>
                    </div>

                    <button
                        type='button'
                        className='minitigerProfileAvatarPickerClose'
                        aria-label='Schließen'
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className='minitigerProfileAvatarPickerSection'>
                    <div className='minitigerProfileAvatarPickerTitleRow'>
                        <strong>Avatar-Galerie</strong>

                        {gallery.isAdmin && (
                            <label className='minitigerProfileAvatarUploadButton'>
                                + Bilder hochladen
                                <input
                                    type='file'
                                    accept='image/png,image/jpeg,image/webp'
                                    multiple
                                    disabled={gallery.loading}
                                    onChange={event => {
                                        const input =
                                            event.currentTarget;
                                        const files =
                                            Array.from(
                                                input.files ?? []
                                            );
                                        input.value = '';

                                        if (!files.length) {
                                            return;
                                        }

                                        setUploadMessage(
                                            'Bilder werden hochgeladen …'
                                        );

                                        void gallery
                                            .uploadAvatars(files)
                                            .then(added => {
                                                setUploadMessage(
                                                    `${added.length} Bild${added.length === 1 ? '' : 'er'} hinzugefügt.`
                                                );
                                            })
                                            .catch(error => {
                                                setUploadMessage(
                                                    error instanceof Error
                                                        ? error.message
                                                        : 'Upload fehlgeschlagen.'
                                                );
                                            });
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    {uploadMessage && (
                        <p className='minitigerProfileAvatarPickerMessage'>
                            {uploadMessage}
                        </p>
                    )}

                    {gallerySelections.length > 0 ? (
                        <div className='minitigerProfileImageGrid'>
                            {gallerySelections.map(({
                                item,
                                reference
                            }) => (
                                <button
                                    key={item.id}
                                    type='button'
                                    className={[
                                        'minitigerProfileImageChoice',
                                        currentImage === reference
                                            ? 'isSelected'
                                            : ''
                                    ].filter(Boolean).join(' ')}
                                    title={item.name}
                                    onClick={() => {
                                        onSelectImage(
                                            reference
                                        );
                                        onClose();
                                    }}
                                >
                                    <img
                                        src={gallery.getAvatarUrl(item)}
                                        alt={item.name}
                                        draggable={false}
                                    />
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className='minitigerProfileAvatarEmpty'>
                            Noch keine Bilder in der
                            Avatar-Galerie.
                        </div>
                    )}
                </div>

                <div className='minitigerProfileAvatarPickerSection'>
                    <strong>Symbole</strong>

                    <div className='minitigerProfileEmojiGrid'>
                        {MINITIGER_PROFILE_AVATARS.map(
                            avatar => (
                                <button
                                    key={avatar.id}
                                    type='button'
                                    className={[
                                        'minitigerProfileEmojiChoice',
                                        !currentImage
                                        && currentFallback === avatar.id
                                            ? 'isSelected'
                                            : ''
                                    ].filter(Boolean).join(' ')}
                                    title={avatar.label}
                                    onClick={() => {
                                        onSelectFallback(
                                            avatar.id
                                        );
                                        onClose();
                                    }}
                                >
                                    <span aria-hidden='true'>
                                        {avatar.emoji}
                                    </span>
                                    <small>
                                        {avatar.label}
                                    </small>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default MinitigerProfileAvatarPicker;

// MINITIGER_PATCH_MARKER: PHASE_18_17_3_PROFILE_AVATAR_PICKER
