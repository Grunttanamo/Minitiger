import React, { useState } from 'react';

import useMinitigerAvatarGallery from '../hooks/useMinitigerAvatarGallery';

const MinitigerAvatarGallerySettings = () => {
    const {
        config,
        loading,
        uploadAvatars,
        removeAvatar,
        getAvatarUrl
    } = useMinitigerAvatarGallery();

    const [ message, setMessage ] = useState('');

    return (
        <>
            <h3>Avatar-Galerie</h3>
            <p className='minitigerSettingsIntro'>
                Auswahl-Avatare, die normale Nutzer direkt in ihrem Profil übernehmen können.
                Die Bilder werden einmal serverseitig über Minitiger Virtual Sync gespeichert.
            </p>

            <section className='minitigerSettingsCard'>
                <h4>Avatare bereitstellen</h4>

                <div className='minitigerBackupButtons'>
                    <label>
                        Avatare hochladen
                        <input
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            multiple
                            disabled={loading}
                            onChange={event => {
                                const input = event.currentTarget;
                                const files = Array.from(input.files ?? []);
                                input.value = '';

                                if (!files.length) {
                                    return;
                                }

                                setMessage(
                                    `${files.length} Avatar${files.length === 1 ? '' : 'e'} werden hochgeladen …`
                                );

                                void uploadAvatars(files)
                                    .then(added => {
                                        setMessage(
                                            `${added.length} Avatar${added.length === 1 ? '' : 'e'} zur Galerie hinzugefügt.`
                                        );
                                    })
                                    .catch(error => {
                                        setMessage(
                                            error instanceof Error
                                                ? error.message
                                                : 'Avatare konnten nicht hochgeladen werden.'
                                        );
                                    });
                            }}
                        />
                    </label>
                </div>

                <p className='minitigerSettingsHint'>
                    Mehrfachauswahl ist möglich. PNG, JPG oder WebP bis 8 MB pro Bild. Jedes Bild wird auf 512 × 512 zugeschnitten und
                    als WebP auf dem Server gespeichert. Es gibt kein festes Minitiger-Limit für die Anzahl.
                </p>

                {message && (
                    <p className='minitigerSettingsHint'>
                        {message}
                    </p>
                )}
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Bereitgestellte Avatare · {config.items.length}</h4>

                {config.items.length === 0 ? (
                    <p className='minitigerSettingsHint'>
                        Noch keine Auswahl-Avatare hochgeladen.
                    </p>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                            gap: '0.75rem'
                        }}
                    >
                        {config.items.map(item => (
                            <article
                                key={item.id}
                                style={{
                                    padding: '0.55rem',
                                    border: '1px solid rgba(255,255,255,0.09)',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.025)'
                                }}
                            >
                                <img
                                    src={getAvatarUrl(item)}
                                    alt={item.name}
                                    style={{
                                        width: '100%',
                                        aspectRatio: '1',
                                        display: 'block',
                                        objectFit: 'cover',
                                        borderRadius: '7px',
                                        marginBottom: '0.45rem'
                                    }}
                                />

                                <strong
                                    style={{
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontSize: '0.8rem',
                                        marginBottom: '0.4rem'
                                    }}
                                    title={item.name}
                                >
                                    {item.name}
                                </strong>

                                <button
                                    type='button'
                                    disabled={loading}
                                    onClick={() => {
                                        setMessage('Avatar wird entfernt …');
                                        void removeAvatar(item.id)
                                            .then(() => {
                                                setMessage('Avatar wurde entfernt.');
                                            })
                                            .catch(error => {
                                                setMessage(
                                                    error instanceof Error
                                                        ? error.message
                                                        : 'Avatar konnte nicht entfernt werden.'
                                                );
                                            });
                                    }}
                                    style={{ width: '100%' }}
                                >
                                    Entfernen
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
};

export default MinitigerAvatarGallerySettings;
