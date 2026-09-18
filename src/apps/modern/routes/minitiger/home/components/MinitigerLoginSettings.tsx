import React, { useEffect, useMemo, useState } from 'react';

import { useApi } from 'hooks/useApi';

import {
    readMinitigerBrandingConfiguration,
    updateMinitigerBrandingConfiguration,
    type MinitigerBrandingOptions
} from '../brandingConfig';
import './MinitigerLoginSettings.scss';

type MinitigerLoginLayout = 'classic' | 'cinematic' | 'minimal';

interface MinitigerLoginConfig {
    enabled: boolean;
    layout: MinitigerLoginLayout;
    backgroundImage: string;
    backgroundDim: number;
    backgroundBlur: number;
    logoImage: string;
    logoSize: number;
    accentColor: string;
}

const CONFIG_PATTERN = /<!--\s*MINITIGER_LOGIN_CONFIG:([A-Za-z0-9+/=]+)\s*-->/;

const DEFAULT_CONFIG: MinitigerLoginConfig = {
    enabled: false,
    layout: 'classic',
    backgroundImage: '',
    backgroundDim: 48,
    backgroundBlur: 3,
    logoImage: '',
    logoSize: 260,
    accentColor: '#ffbf00'
};

const ACCENT_COLORS = [
    '#ffbf00',
    '#ff6b35',
    '#ff4d8d',
    '#c56cff',
    '#6f8cff',
    '#32c8ff',
    '#36d399'
];

const clamp = (
    value: unknown,
    fallback: number,
    min: number,
    max: number
) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(parsed)));
};

const normalizeConfig = (value: unknown): MinitigerLoginConfig => {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_CONFIG };
    }

    const source = value as Partial<MinitigerLoginConfig>;
    const layout: MinitigerLoginLayout =
        source.layout === 'cinematic' || source.layout === 'minimal'
            ? source.layout
            : 'classic';

    return {
        enabled: source.enabled === true,
        layout,
        backgroundImage:
            typeof source.backgroundImage === 'string'
                ? source.backgroundImage
                : '',
        backgroundDim: clamp(
            source.backgroundDim,
            DEFAULT_CONFIG.backgroundDim,
            0,
            90
        ),
        backgroundBlur: clamp(
            source.backgroundBlur,
            DEFAULT_CONFIG.backgroundBlur,
            0,
            20
        ),
        logoImage:
            typeof source.logoImage === 'string'
                ? source.logoImage
                : '',
        logoSize: clamp(
            source.logoSize,
            DEFAULT_CONFIG.logoSize,
            100,
            520
        ),
        accentColor:
            typeof source.accentColor === 'string'
            && /^#[0-9a-f]{6}$/i.test(source.accentColor)
                ? source.accentColor
                : DEFAULT_CONFIG.accentColor
    };
};

const encodeConfig = (config: MinitigerLoginConfig) => {
    const bytes = new TextEncoder().encode(JSON.stringify(config));
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
};

const decodeConfig = (disclaimer: string) => {
    const match = CONFIG_PATTERN.exec(disclaimer);

    if (!match) {
        return { ...DEFAULT_CONFIG };
    }

    try {
        const binary = atob(match[1]);
        const bytes = Uint8Array.from(
            binary,
            character => character.charCodeAt(0)
        );
        const parsed = JSON.parse(
            new TextDecoder().decode(bytes)
        ) as unknown;

        return normalizeConfig(parsed);
    } catch (error) {
        console.warn(
            '[Minitiger Login] Gespeicherte Login-Konfiguration ist ungültig.',
            error
        );
        return { ...DEFAULT_CONFIG };
    }
};

const withConfigMarker = (
    disclaimer: string,
    config: MinitigerLoginConfig
) => {
    const clean = disclaimer
        .replace(CONFIG_PATTERN, '')
        .trimEnd();
    const marker = `<!--MINITIGER_LOGIN_CONFIG:${encodeConfig(config)}-->`;

    return clean ? `${clean}\n${marker}` : marker;
};

const imageToDataUrl = async (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality: number
) => {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();

        const scale = Math.min(
            1,
            maxWidth / image.naturalWidth,
            maxHeight / image.naturalHeight
        );
        const width = Math.max(
            1,
            Math.round(image.naturalWidth * scale)
        );
        const height = Math.max(
            1,
            Math.round(image.naturalHeight * scale)
        );
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas konnte nicht erstellt werden.');
        }

        context.drawImage(image, 0, 0, width, height);
        return canvas.toDataURL('image/webp', quality);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

const MinitigerLoginSettings = () => {
    const { __legacyApiClient__: apiClient } = useApi();
    const [ config, setConfig ] = useState<MinitigerLoginConfig>({
        ...DEFAULT_CONFIG
    });
    const [ branding, setBranding ] = useState<MinitigerBrandingOptions | null>(null);
    const [ message, setMessage ] = useState('Login-Konfiguration wird geladen …');
    const [ saving, setSaving ] = useState(false);

    useEffect(() => {
        if (!apiClient) {
            setMessage('Keine Jellyfin-Verbindung verfügbar.');
            return;
        }

        let cancelled = false;

        void readMinitigerBrandingConfiguration(
            apiClient
        ).then(options => {
            if (cancelled) {
                return;
            }

            setBranding(options);
            setConfig(
                decodeConfig(options.LoginDisclaimer ?? '')
            );
            setMessage('');
        }).catch((error: unknown) => {
            console.error(
                '[Minitiger Login] Branding-Konfiguration konnte nicht geladen werden.',
                error
            );
            if (!cancelled) {
                setMessage('Login-Konfiguration konnte nicht geladen werden.');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [apiClient]);

    const previewStyle = useMemo(() => ({
        '--mt-login-preview-accent': config.accentColor,
        '--mt-login-preview-dim': String(config.backgroundDim / 100),
        '--mt-login-preview-blur': `${config.backgroundBlur}px`
    } as React.CSSProperties), [config]);

    const update = (patch: Partial<MinitigerLoginConfig>) => {
        setConfig(current => normalizeConfig({
            ...current,
            ...patch
        }));
    };

    const uploadImage = async (
        file: File | undefined,
        kind: 'background' | 'logo'
    ) => {
        if (!file) {
            return;
        }

        const limit = kind === 'background'
            ? 12 * 1024 * 1024
            : 8 * 1024 * 1024;

        if (file.size > limit) {
            setMessage(
                kind === 'background'
                    ? 'Der Hintergrund darf maximal 12 MB groß sein.'
                    : 'Das Logo darf maximal 8 MB groß sein.'
            );
            return;
        }

        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
            setMessage('Bitte PNG, JPG oder WebP verwenden.');
            return;
        }

        try {
            setMessage('Bild wird optimiert …');
            const dataUrl = await imageToDataUrl(
                file,
                kind === 'background' ? 1600 : 640,
                kind === 'background' ? 900 : 320,
                kind === 'background' ? 0.76 : 0.9
            );

            update(
                kind === 'background'
                    ? { backgroundImage: dataUrl }
                    : { logoImage: dataUrl }
            );
            setMessage('Bild übernommen. Zum Aktivieren noch speichern.');
        } catch (error) {
            console.error('[Minitiger Login] Bildimport fehlgeschlagen.', error);
            setMessage('Bild konnte nicht verarbeitet werden.');
        }
    };

    const save = async () => {
        if (!apiClient || !branding) {
            setMessage('Login-Konfiguration ist noch nicht bereit.');
            return;
        }

        setSaving(true);
        setMessage('Globale Login-Konfiguration wird gespeichert …');

        try {
            /*
             * Re-read the newest Branding state inside the shared serialized
             * writer. This prevents Login settings from deleting a toolbar
             * logo marker that was written after this panel was opened.
             */
            const nextBranding =
                await updateMinitigerBrandingConfiguration(
                    apiClient,
                    current => ({
                        ...current,
                        LoginDisclaimer: withConfigMarker(
                            current.LoginDisclaimer ?? '',
                            config
                        )
                    })
                );

            setBranding(nextBranding);
            setMessage('Gespeichert. Die Änderung gilt global für den Login.');
        } catch (error) {
            console.error('[Minitiger Login] Speichern fehlgeschlagen.', error);
            setMessage('Speichern fehlgeschlagen.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <h3>Login</h3>
            <p className='minitigerSettingsIntro'>
                Globale Gestaltung der Jellyfin-Anmeldeseite. Die Anmeldung selbst,
                Quick Connect und Passwortprüfung bleiben vollständig bei Jellyfin.
            </p>

            <section className='minitigerSettingsCard'>
                <h4>Login-Design</h4>

                <label className='minitigerSettingsToggle'>
                    <input
                        type='checkbox'
                        checked={config.enabled}
                        onChange={event => update({
                            enabled: event.currentTarget.checked
                        })}
                    />
                    <span>
                        <strong>Minitiger-Login aktivieren</strong>
                        <small>Aus = originale Jellyfin-Anmeldeseite.</small>
                    </span>
                </label>

                <label className='minitigerSettingsField'>
                    <span>Layout</span>
                    <select
                        value={config.layout}
                        disabled={!config.enabled}
                        onChange={event => update({
                            layout: event.currentTarget.value as MinitigerLoginLayout
                        })}
                    >
                        <option value='classic'>Klassisch</option>
                        <option value='cinematic'>Cinematic</option>
                        <option value='minimal'>Minimal</option>
                    </select>
                </label>

                <div className='minitigerLoginAccentRow'>
                    <span>Akzentfarbe</span>
                    <div>
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color}
                                type='button'
                                className={
                                    config.accentColor.toLowerCase()
                                    === color.toLowerCase()
                                        ? 'isSelected'
                                        : ''
                                }
                                style={{ backgroundColor: color }}
                                onClick={() => update({ accentColor: color })}
                                aria-label={`Akzent ${color}`}
                            />
                        ))}
                        <input
                            type='color'
                            value={config.accentColor}
                            disabled={!config.enabled}
                            onChange={event => update({
                                accentColor: event.currentTarget.value
                            })}
                            aria-label='Eigene Akzentfarbe'
                        />
                    </div>
                </div>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Hintergrund</h4>

                <label className='minitigerLoginUpload'>
                    <span>Hintergrund hochladen</span>
                    <input
                        type='file'
                        accept='image/png,image/jpeg,image/webp'
                        disabled={!config.enabled}
                        onChange={event => {
                            void uploadImage(
                                event.currentTarget.files?.[0],
                                'background'
                            );
                            event.currentTarget.value = '';
                        }}
                    />
                </label>

                {config.backgroundImage && (
                    <button
                        type='button'
                        className='minitigerLoginRemoveMedia'
                        onClick={() => update({ backgroundImage: '' })}
                    >
                        Hintergrund entfernen
                    </button>
                )}

                <label className='minitigerRangeField'>
                    <span>Abdunklung</span>
                    <div>
                        <input
                            type='range'
                            min='0'
                            max='90'
                            step='1'
                            value={config.backgroundDim}
                            disabled={!config.enabled}
                            onChange={event => update({
                                backgroundDim: Number(event.currentTarget.value)
                            })}
                        />
                        <output>{config.backgroundDim}%</output>
                    </div>
                </label>

                <label className='minitigerRangeField'>
                    <span>Blur</span>
                    <div>
                        <input
                            type='range'
                            min='0'
                            max='20'
                            step='1'
                            value={config.backgroundBlur}
                            disabled={!config.enabled}
                            onChange={event => update({
                                backgroundBlur: Number(event.currentTarget.value)
                            })}
                        />
                        <output>{config.backgroundBlur}px</output>
                    </div>
                </label>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Logo</h4>

                <label className='minitigerLoginUpload'>
                    <span>Logo hochladen</span>
                    <input
                        type='file'
                        accept='image/png,image/jpeg,image/webp'
                        disabled={!config.enabled}
                        onChange={event => {
                            void uploadImage(
                                event.currentTarget.files?.[0],
                                'logo'
                            );
                            event.currentTarget.value = '';
                        }}
                    />
                </label>

                {config.logoImage && (
                    <button
                        type='button'
                        className='minitigerLoginRemoveMedia'
                        onClick={() => update({ logoImage: '' })}
                    >
                        Logo entfernen
                    </button>
                )}

                <label className='minitigerRangeField'>
                    <span>Logo-Größe</span>
                    <div>
                        <input
                            type='range'
                            min='100'
                            max='520'
                            step='10'
                            value={config.logoSize}
                            disabled={!config.enabled}
                            onChange={event => update({
                                logoSize: Number(event.currentTarget.value)
                            })}
                        />
                        <output>{config.logoSize}px</output>
                    </div>
                </label>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Vorschau</h4>
                <div
                    className={`minitigerLoginPreview is-${config.layout}`}
                    style={previewStyle}
                >
                    {config.backgroundImage && (
                        <img
                            className='minitigerLoginPreviewBackground'
                            src={config.backgroundImage}
                            alt=''
                        />
                    )}
                    <div className='minitigerLoginPreviewShade' />
                    <div className='minitigerLoginPreviewContent'>
                        {config.logoImage ? (
                            <img
                                className='minitigerLoginPreviewLogo'
                                src={config.logoImage}
                                alt='Login-Logo Vorschau'
                                style={{
                                    width: `${Math.min(config.logoSize, 260)}px`
                                }}
                            />
                        ) : (
                            <strong>Minitiger</strong>
                        )}
                        <div className='minitigerLoginPreviewCard'>
                            <span>Benutzer</span>
                            <i />
                            <i />
                            <button type='button'>Anmelden</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Speichern</h4>
                <p className='minitigerSettingsHint'>
                    Die Konfiguration wird serverweit gespeichert. Auf der Login-Seite
                    erscheinen trotzdem ausschließlich Konten, die auf dem jeweiligen
                    Gerät bereits erfolgreich angemeldet wurden. Es werden keine
                    Passwörter gespeichert.
                </p>
                <button
                    type='button'
                    className='isPrimary'
                    disabled={saving || !branding}
                    onClick={() => void save()}
                >
                    {saving ? 'Speichert …' : 'Login-Konfiguration speichern'}
                </button>
                {message && (
                    <p className='minitigerSettingsHint minitigerLoginSettingsMessage'>
                        {message}
                    </p>
                )}
            </section>
        </>
    );
};

export default MinitigerLoginSettings;
/* MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND */
