import React, { useState } from 'react';

import useMinitigerAvatarSettings from '../hooks/useMinitigerAvatarSettings';

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const TARGET_SIZE = 384;
const MAX_DATA_URL_LENGTH = 180000;
const ALLOWED_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
]);

export const createAvatarSource = (
    file: Blob
): Promise<string> => new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.has(file.type)) {
        reject(new Error(
            'Bitte PNG, JPG oder WebP verwenden.'
        ));
        return;
    }

    if (file.size > MAX_INPUT_BYTES) {
        reject(new Error(
            'Das Bild darf maximal 8 MB groß sein.'
        ));
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
        cleanup();
        reject(new Error(
            'Das Bild konnte nicht gelesen werden.'
        ));
    };

    image.onload = () => {
        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;

        if (!sourceWidth || !sourceHeight) {
            cleanup();
            reject(new Error(
                'Das Bild hat keine gültigen Abmessungen.'
            ));
            return;
        }

        const sourceSize = Math.min(
            sourceWidth,
            sourceHeight
        );
        const sourceX = Math.max(
            0,
            Math.round(
                (sourceWidth - sourceSize) / 2
            )
        );
        const sourceY = Math.max(
            0,
            Math.round(
                (sourceHeight - sourceSize) / 2
            )
        );

        const canvas = document.createElement('canvas');
        canvas.width = TARGET_SIZE;
        canvas.height = TARGET_SIZE;

        const context = canvas.getContext('2d');

        if (!context) {
            cleanup();
            reject(new Error(
                'Das Bild konnte nicht verarbeitet werden.'
            ));
            return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            TARGET_SIZE,
            TARGET_SIZE
        );

        let result = '';

        for (const quality of [
            0.88,
            0.80,
            0.72,
            0.64,
            0.56
        ]) {
            result = canvas.toDataURL(
                'image/webp',
                quality
            );

            if (
                result.length
                <= MAX_DATA_URL_LENGTH
            ) {
                break;
            }
        }

        cleanup();

        if (
            !result
            || result.length > MAX_DATA_URL_LENGTH
        ) {
            reject(new Error(
                'Der Avatar ist nach der Optimierung noch zu groß. Bitte ein kleineres Bild verwenden.'
            ));
            return;
        }

        resolve(result);
    };

    image.src = objectUrl;
});

const MinitigerAvatarSettings = () => {
    const {
        settings,
        updateSettings
    } = useMinitigerAvatarSettings();

    const [ message, setMessage ] = useState('');

    const upload = async (
        file: File | undefined
    ) => {
        if (!file) {
            return;
        }

        try {
            setMessage('Avatar wird optimiert …');
            const source = await createAvatarSource(file);

            updateSettings({
                image: source,
                enabled: true
            });
            setMessage(
                'Avatar gespeichert und aktiviert.'
            );
        } catch (error) {
            const text =
                error instanceof Error
                    ? error.message
                    : 'Avatar konnte nicht verarbeitet werden.';

            setMessage(text);
        }
    };

    return (
        <section className='minitigerSettingsCard'>
            <h4>Custom Nutzer-Avatar</h4>

            <p className='minitigerSettingsHint'>
                Dein persönlicher Minitiger-Avatar. Das originale Jellyfin-Profilbild bleibt unverändert.
                Der Avatar folgt deinem Benutzer über die Minitiger-Einstellungen und wird auf diesem
                Gerät auch für die gemerkte Login-Kachel verwendet.
            </p>

            <label className='minitigerSettingsToggle'>
                <input
                    type='checkbox'
                    checked={settings.enabled}
                    disabled={!settings.image}
                    onChange={event =>
                        updateSettings({
                            enabled:
                                event.currentTarget.checked
                        })
                    }
                />
                <span>
                    <strong>Custom Avatar verwenden</strong>
                    <small>
                        Aus = überall wieder das normale Jellyfin-Profilbild verwenden.
                    </small>
                </span>
            </label>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    margin: '0.75rem 0'
                }}
            >
                <div
                    style={{
                        width: '6rem',
                        height: '6rem',
                        flex: '0 0 6rem',
                        overflow: 'hidden',
                        borderRadius:
                            settings.shape === 'circle'
                                ? '50%'
                                : '8px',
                        background:
                            'rgba(255,255,255,0.07)',
                        border:
                            '1px solid rgba(255,255,255,0.12)',
                        display: 'grid',
                        placeItems: 'center'
                    }}
                >
                    {settings.image ? (
                        <img
                            src={settings.image}
                            alt='Custom Avatar Vorschau'
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <span
                            aria-hidden='true'
                            style={{
                                fontSize: '2.4rem',
                                opacity: 0.6
                            }}
                        >
                            👤
                        </span>
                    )}
                </div>

                <div
                    className='minitigerBackupButtons'
                    style={{
                        margin: 0
                    }}
                >
                    <label>
                        Avatar hochladen
                        <input
                            type='file'
                            accept='image/png,image/jpeg,image/webp'
                            onChange={event => {
                                const file =
                                    event.currentTarget.files?.[0];

                                void upload(file);
                                event.currentTarget.value = '';
                            }}
                        />
                    </label>

                    {settings.image && (
                        <button
                            type='button'
                            onClick={() => {
                                updateSettings({
                                    image: '',
                                    enabled: false
                                });
                                setMessage(
                                    'Custom Avatar entfernt.'
                                );
                            }}
                        >
                            Avatar entfernen
                        </button>
                    )}
                </div>
            </div>

            <label className='minitigerSettingsField'>
                <span>Avatar-Form</span>
                <select
                    value={settings.shape}
                    onChange={event =>
                        updateSettings({
                            shape:
                                event.currentTarget.value
                                === 'circle'
                                    ? 'circle'
                                    : 'square'
                        })
                    }
                >
                    <option value='square'>
                        Quadratisch / Würfel
                    </option>
                    <option value='circle'>
                        Rund
                    </option>
                </select>
                <small>
                    Die Login-Kacheln bleiben unabhängig davon quadratisch.
                </small>
            </label>

            <p className='minitigerSettingsHint'>
                Das Bild wird lokal auf 384 × 384 zugeschnitten und als WebP komprimiert.
                Unterstützt: PNG, JPG und WebP bis 8 MB.
            </p>

            {message && (
                <p className='minitigerSettingsHint'>
                    {message}
                </p>
            )}
        </section>
    );
};

export default MinitigerAvatarSettings;
