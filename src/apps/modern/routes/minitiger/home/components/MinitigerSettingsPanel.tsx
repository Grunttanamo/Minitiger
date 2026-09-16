import React, { useEffect, useState } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import {
    type MinitigerCustomRow,
    type MinitigerCustomRowsConfig
} from '../config/customRows';
import {
    type MinitigerCastShape,
    type MinitigerDetailSettings
} from '../config/detailSettings';
import {
    type MinitigerAZMode,
    type MinitigerLibraryDisplay,
    type MinitigerLibrarySettings
} from '../config/librarySettings';
import {
    type MinitigerVirtualDisplay,
    type MinitigerVirtualLibrariesConfig
} from '../config/virtualLibraries';
import {
    ACCENT_PRESETS,
    getContrastTextColor,
    type BannerItemLimit,
    type BannerRotationSeconds,
    type HomeRowId,
    type HomeSectionId,
    type MinitigerCardSize,
    type MinitigerHomeSettings,
    type PlayedIndicatorShape,
    parseCardSize
} from '../config/homeSettings';
import type { MinitigerVirtualMediaKind } from '../virtualServerSync';
import MinitigerHomeBuilderSettings from './MinitigerHomeBuilderSettings';

interface MinitigerSettingsPanelProps {
    settings: MinitigerHomeSettings;
    librarySettings: MinitigerLibrarySettings;
    detailSettings: MinitigerDetailSettings;
    customConfig: MinitigerCustomRowsConfig;
    libraries: ItemDto[];
    onUpdate: (patch: Partial<MinitigerHomeSettings>) => void;
    onUpdateLibrarySettings: (
        patch: Partial<MinitigerLibrarySettings>
    ) => void;
    onUpdateDetailSettings: (
        patch: Partial<MinitigerDetailSettings>
    ) => void;
    onUpdateCustomRow: (
        rowKey: string,
        patch: Partial<Omit<MinitigerCustomRow, 'key'>>
    ) => void;
    onReplaceCustomConfig: (
        config: MinitigerCustomRowsConfig
    ) => void;
    onToggleSection: (sectionId: HomeSectionId) => void;
    onMoveHomeRow: (
        rowId: HomeRowId,
        direction: -1 | 1
    ) => void;
    onReorderHomeRows: (
        sourceId: HomeRowId,
        targetId: HomeRowId
    ) => void;
    onReset: () => void;
    onResetLibrarySettings: () => void;
    onResetDetailSettings: () => void;
    isAdmin?: boolean;
    virtualConfig?: MinitigerVirtualLibrariesConfig;
    onAddVirtualLibrary?: () => void;
    onUpdateVirtualLibrary?: (
        libraryId: string,
        patch: Partial<{
            name: string;
            image: string;
            logo: string;
            videoKey: string;
            imageRevision: number;
            logoRevision: number;
            videoRevision: number;
            display: MinitigerVirtualDisplay;
            enabled: boolean;
            showCaption: boolean;
        }>
    ) => void;
    onRemoveVirtualLibrary?: (libraryId: string) => void;
    onMoveVirtualLibrary?: (
        libraryId: string,
        direction: -1 | 1
    ) => void;
    onReplaceVirtualConfig?: (
        config: MinitigerVirtualLibrariesConfig
    ) => void;
    onUpdateVirtualRowTitle?: (
        rowId: 'virtual1' | 'virtual2' | 'virtual3',
        title: string
    ) => void;
    onToggleVirtualRow?: (
        rowId: 'virtual1' | 'virtual2' | 'virtual3'
    ) => void;
    onSetVirtualRowTitleVisible?: (
        rowId: 'virtual1' | 'virtual2' | 'virtual3',
        visible: boolean
    ) => void;
    onSetVirtualHomeCardWidth?: (
        width: number
    ) => void;
    onSetVirtualHomeGap?: (
        gap: number
    ) => void;
    onSetVirtualPagePosterWidth?: (
        width: number
    ) => void;
    onSetVirtualPageLandscapeWidth?: (
        width: number
    ) => void;
    onSetVirtualPageGap?: (
        gap: number
    ) => void;
    virtualSyncStatus?: 'loading' | 'migrating' | 'server' | 'local' | 'error';
    virtualSyncMessage?: string;
    onUploadVirtualMedia?: (
        libraryId: string,
        kind: MinitigerVirtualMediaKind,
        file: File
    ) => Promise<'server' | 'local'>;
    onRemoveVirtualMedia?: (
        libraryId: string,
        kinds: MinitigerVirtualMediaKind[]
    ) => Promise<void>;
    onPushVirtualConfigToServer?: () => Promise<void>;
    onResetCustomRows?: () => void;
    onClose: () => void;
}

type SettingsTab =
    | 'general'
    | 'home'
    | 'libraries'
    | 'details'
    | 'colors'
    | 'backup';

const ROTATION_OPTIONS: Array<{
    value: BannerRotationSeconds;
    label: string;
}> = [
    { value: 0, label: 'Aus' },
    { value: 8, label: '8 Sekunden' },
    { value: 12, label: '12 Sekunden' },
    { value: 20, label: '20 Sekunden' },
    { value: 30, label: '30 Sekunden' },
    { value: 45, label: '45 Sekunden' },
    { value: 60, label: '60 Sekunden' }
];

const BANNER_ITEM_LIMIT_OPTIONS: Array<{
    value: BannerItemLimit;
    label: string;
}> = [
    { value: 5, label: '5 Inhalte' },
    { value: 10, label: '10 Inhalte' },
    { value: 15, label: '15 Inhalte' },
    { value: 20, label: '20 Inhalte' },
    { value: 30, label: '30 Inhalte' },
    { value: 50, label: '50 Inhalte' },
    { value: 100, label: '100 Inhalte' },
    { value: 0, label: 'Alle Inhalte' }
];

const CARD_SIZE_OPTIONS: Array<{
    value: MinitigerCardSize;
    label: string;
}> = [
    { value: 'compact', label: 'Kompakt' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Groß' }
];

const DISPLAY_OPTIONS: Array<{
    value: MinitigerLibraryDisplay;
    label: string;
}> = [
    { value: 'poster', label: 'Poster' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'banner', label: 'Banner' }
];

const parseDisplay = (value: string): MinitigerLibraryDisplay => {
    if (value === 'landscape' || value === 'banner') {
        return value;
    }

    return 'poster';
};

const parseAZMode = (value: string): MinitigerAZMode => {
    if (value === 'top' || value === 'side') {
        return value;
    }

    return 'auto';
};

const ColorField = ({
    label,
    value,
    onChange,
    previewGlowStrength = 100,
    previewGlowSize = 16
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    previewGlowStrength?: number;
    previewGlowSize?: number;
}) => {
    const [ draft, setDraft ] = useState(
        value.toUpperCase()
    );

    useEffect(() => {
        setDraft(value.toUpperCase());
    }, [value]);

    const commitDraft = () => {
        if (/^#[0-9a-f]{6}$/i.test(draft)) {
            onChange(draft);
        } else {
            setDraft(value.toUpperCase());
        }
    };

    return (
        <label className='minitigerColorSetting'>
            <span>{label}</span>
            <div>
                <input
                    type='color'
                    value={value}
                    onChange={event => {
                        const next =
                            event.currentTarget.value;

                        setDraft(next.toUpperCase());
                        onChange(next);
                    }}
                />
                <input
                    type='text'
                    value={draft}
                    onChange={event =>
                        setDraft(
                            event.currentTarget.value
                                .toUpperCase()
                        )
                    }
                    onBlur={commitDraft}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            commitDraft();
                        }
                    }}
                />
            </div>
            <div
                className='minitigerColorPreview'
                style={{
                    '--minitiger-preview-color': value
                } as React.CSSProperties}
            >
                {label === 'Button 1 · Normal' && (
                    <span
                        className='minitigerColorExampleButton isPrimary'
                        style={{
                            backgroundColor: value,
                            borderColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        ▶ Hauptbutton
                    </span>
                )}

                {label === 'Button 1 · Hover' && (
                    <span
                        className='minitigerColorExampleButton isPrimary isHoverPreview'
                        style={{
                            backgroundColor: value,
                            borderColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        ▶ Hauptbutton · Hover
                    </span>
                )}

                {label === 'Button 2 · Normal' && (
                    <span
                        className='minitigerColorExampleButton isSecondary'
                        style={{
                            backgroundColor: value,
                            borderColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        ♡ Nebenbutton
                    </span>
                )}

                {label === 'Button 2 · Hover' && (
                    <span
                        className='minitigerColorExampleButton isSecondary isHoverPreview'
                        style={{
                            backgroundColor: value,
                            borderColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        ♡ Nebenbutton · Hover
                    </span>
                )}

                {label === 'Pfeile / Navigation' && (
                    <span className='minitigerColorExampleNavigation'>
                        <i style={{ backgroundColor: value, color: getContrastTextColor(value) }}>‹</i>
                        <b>3/10</b>
                        <i style={{ backgroundColor: value, color: getContrastTextColor(value) }}>›</i>
                    </span>
                )}

                {label === 'Genre-Tags' && (
                    <span
                        className='minitigerColorExampleGenre'
                        style={{
                            backgroundColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        Action
                    </span>
                )}

                {label === 'Bibliotheks-Leiste · Hintergrund' && (
                    <span
                        className='minitigerColorExampleLibraryBar'
                        style={{
                            backgroundColor: value,
                            color: getContrastTextColor(value)
                        }}
                    >
                        ANIME
                    </span>
                )}

                {label === 'Bibliotheks-Leiste · Text' && (
                    <span
                        className='minitigerColorExampleLibraryBar isTextPreview'
                        style={{ color: value }}
                    >
                        ANIME
                    </span>
                )}

                {label === 'Banner · Audio / Untertitel' && (
                    <span
                        className='minitigerColorExampleMeta'
                        style={{ color: value }}
                    >
                        Audio: Deutsch · Untertitel: Deutsch
                    </span>
                )}

                {label === 'Glow-Farbe' && (
                    <span className='minitigerColorExampleGlow'>
                        <i
                            className='isPoster'
                            style={{
                                boxShadow: `0 0 ${previewGlowSize}px color-mix(in srgb, ${value} ${previewGlowStrength}%, transparent)`
                            }}
                        />
                        <i
                            className='isLandscape'
                            style={{
                                boxShadow: `0 0 ${previewGlowSize}px color-mix(in srgb, ${value} ${previewGlowStrength}%, transparent)`
                            }}
                        />
                    </span>
                )}
            </div>
        </label>
    );
};

const MinitigerSettingsPanel = ({
    settings,
    librarySettings,
    detailSettings,
    customConfig,
    libraries,
    onUpdate: onUpdateRaw,
    onUpdateLibrarySettings: onUpdateLibrarySettingsRaw,
    onUpdateDetailSettings,
    onUpdateCustomRow,
    onReplaceCustomConfig,
    onToggleSection,
    onMoveHomeRow,
    onReorderHomeRows,
    onReset,
    onResetLibrarySettings,
    onResetDetailSettings,
    isAdmin = false,
    virtualConfig,
    onAddVirtualLibrary,
    onUpdateVirtualLibrary,
    onRemoveVirtualLibrary,
    onMoveVirtualLibrary,
    onReplaceVirtualConfig,
    onUpdateVirtualRowTitle,
    onToggleVirtualRow,
    onSetVirtualRowTitleVisible,
    onSetVirtualHomeCardWidth,
    onSetVirtualHomeGap,
    onSetVirtualPagePosterWidth,
    onSetVirtualPageLandscapeWidth,
    onSetVirtualPageGap,
    virtualSyncStatus = 'local',
    virtualSyncMessage = '',
    onUploadVirtualMedia,
    onRemoveVirtualMedia,
    onPushVirtualConfigToServer,
    onResetCustomRows,
    onClose
}: MinitigerSettingsPanelProps) => {
    const [ activeTab, setActiveTab ] = useState<SettingsTab>('general');
    const [ importMessage, setImportMessage ] = useState('');
    const [ virtualMediaMessage, setVirtualMediaMessage ] = useState('');

    const onUpdate = (
        patch: Partial<MinitigerHomeSettings>
    ) => {
        if (isAdmin) {
            onUpdateRaw(patch);
            return;
        }

        const allowed = new Set<keyof MinitigerHomeSettings>([
            'accentColor',
            'primaryHoverColor',
            'secondaryColor',
            'secondaryHoverColor',
            'libraryBarColor',
            'libraryBarTextColor',
            'bannerMetaColor',
            'glowColor',
            'arrowColor',
            'genreTagColor',
            'glowStrength',
            'glowSize',
            'bannerFskVisible',
            'showAudioFlags',
            'showFskBadges',
            'showPlayedIndicators',
            'playedIndicatorSize',
            'playedIndicatorFontSize',
            'playedIndicatorShape',
            'hoverEnabled',
            'glowEnabled',
            'previewEnabled'
        ]);

        const filtered = Object.fromEntries(
            Object.entries(patch).filter(([ key ]) =>
                allowed.has(
                    key as keyof MinitigerHomeSettings
                )
            )
        ) as Partial<MinitigerHomeSettings>;

        if (Object.keys(filtered).length > 0) {
            onUpdateRaw(filtered);
        }
    };

    const onUpdateLibrarySettings = (
        patch: Partial<MinitigerLibrarySettings>
    ) => {
        if (isAdmin) {
            onUpdateLibrarySettingsRaw(patch);
            return;
        }

        const filtered = Object.fromEntries(
            Object.entries(patch).filter(([ key ]) =>
                key === 'customNavigationEnabled'
                || key === 'azMode'
            )
        ) as Partial<MinitigerLibrarySettings>;

        if (Object.keys(filtered).length > 0) {
            onUpdateLibrarySettingsRaw(filtered);
        }
    };

    useEffect(() => {
        if (
            !isAdmin
            && activeTab !== 'general'
            && activeTab !== 'libraries'
            && activeTab !== 'colors'
        ) {
            setActiveTab('general');
        }
    }, [ activeTab, isAdmin ]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        const host = document.querySelector<HTMLElement>(
            '.minitigerAdminSettingsContent'
        );

        if (!host) {
            return;
        }

        const cleanup: Array<() => void> = [];

        host.querySelectorAll<HTMLElement>(
            '.minitigerSettingsCard'
        ).forEach(card => {
            const heading = card.querySelector<HTMLElement>(
                ':scope > h4'
            );

            if (!heading) {
                return;
            }

            heading.classList.add('minitigerSettingsCardToggle');
            heading.tabIndex = 0;
            heading.setAttribute('role', 'button');

            const syncExpanded = () => {
                heading.setAttribute(
                    'aria-expanded',
                    card.classList.contains('isCollapsed')
                        ? 'false'
                        : 'true'
                );
            };

            const toggle = () => {
                card.classList.toggle('isCollapsed');
                syncExpanded();
            };

            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggle();
                }
            };

            syncExpanded();
            heading.addEventListener('click', toggle);
            heading.addEventListener('keydown', onKeyDown);

            cleanup.push(() => {
                heading.removeEventListener('click', toggle);
                heading.removeEventListener('keydown', onKeyDown);
            });
        });

        return () => cleanup.forEach(dispose => dispose());
    }, [activeTab]);

    const downloadBackup = () => {
        const payload = {
            format: 'Minitiger.Native.Settings.Backup',
            version: 2,
            createdAt: new Date().toISOString(),
            home: settings,
            libraries: librarySettings,
            details: detailSettings,
            customRows: customConfig,
            virtualLibraries: virtualConfig ?? null
        };

        const blob = new Blob(
            [ JSON.stringify(payload, null, 2) ],
            { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Minitiger_Settings_Backup.json';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const importBackup = (file: File) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const parsed = JSON.parse(
                    String(reader.result ?? '{}')
                ) as {
                    home?: Partial<MinitigerHomeSettings>;
                    libraries?: Partial<MinitigerLibrarySettings>;
                    details?: Partial<MinitigerDetailSettings>;
                    customRows?: MinitigerCustomRowsConfig;
                    virtualLibraries?: MinitigerVirtualLibrariesConfig;
                };

                if (parsed.home) {
                    onUpdate(parsed.home);
                }

                if (parsed.libraries) {
                    onUpdateLibrarySettings(parsed.libraries);
                }

                if (parsed.details) {
                    onUpdateDetailSettings(
                        parsed.details
                    );
                }

                if (parsed.customRows) {
                    onReplaceCustomConfig(
                        parsed.customRows
                    );
                }

                if (
                    parsed.virtualLibraries
                    && onReplaceVirtualConfig
                ) {
                    onReplaceVirtualConfig(
                        parsed.virtualLibraries
                    );
                }

                setImportMessage(
                    'Backup erfolgreich importiert.'
                );
            } catch (error) {
                console.error(
                    '[Minitiger Settings] Import fehlgeschlagen',
                    error
                );
                setImportMessage(
                    'Import fehlgeschlagen – Datei ist kein gültiges Minitiger-Backup.'
                );
            }
        };

        reader.readAsText(file);
    };

    const tabButton = (
        id: SettingsTab,
        label: string
    ) => (
        <button
            type='button'
            className={activeTab === id ? 'isActive' : ''}
            onClick={() => setActiveTab(id)}
        >
            {label}
        </button>
    );

    return (
        <div
            className='minitigerSettingsOverlay'
            role='presentation'
            onMouseDown={event => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className='minitigerAdminSettings'
                aria-label='Minitiger Design Einstellungen'
            >
                <header className='minitigerAdminSettingsHeader'>
                    <div>
                        <h2>Minitiger Design - Einstellungen</h2>
                        <span>Native Jellyfin Web 12</span>
                    </div>

                    <button
                        type='button'
                        className='minitigerSettingsClose'
                        onClick={onClose}
                        aria-label='Einstellungen schließen'
                    >
                        ×
                    </button>
                </header>

                <div className='minitigerAdminSettingsBody'>
                    <nav className='minitigerAdminSettingsNav'>
                        {tabButton('general', 'General')}
                        {isAdmin && tabButton('home', 'Startseite')}
                        {tabButton('libraries', 'Bibliotheken')}
                        {isAdmin && tabButton('details', 'Detailpages')}
                        {tabButton('colors', 'Farben')}
                        {isAdmin && tabButton('backup', 'Backup & Import')}
                    </nav>

                    <main className='minitigerAdminSettingsContent'>
                        {activeTab === 'general' && (
                            <>
                                <h3>General</h3>
                                <p className='minitigerSettingsIntro'>
                                    {isAdmin
                                        ? 'Globale Standard-Einstellungen für die komplette Minitiger-Oberfläche.'
                                        : 'Persönliche kosmetische Einstellungen für deinen Minitiger-Account.'}
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Standard Einstellungen</h4>

                                    {[
                                        [
                                            'showAudioFlags',
                                            'Audioflaggen anzeigen',
                                            'Gilt für Home-Karten und wird später auch vollständig auf Detailpages gespiegelt.'
                                        ],
                                        [
                                            'showFskBadges',
                                            'FSK-Sticker anzeigen',
                                            'Blendet Altersfreigaben auf Minitiger-Karten ein oder aus.'
                                        ],
                                        [
                                            'showPlayedIndicators',
                                            'Gesehen-Haken / verbleibende Anzahl anzeigen',
                                            'Steuert Haken und Restfolgen-Indikator.'
                                        ],
                                        [
                                            'trailerDebugEnabled',
                                            'Trailer-Diagnose anzeigen',
                                            'Blendet den 🧪 Trailer-Debug-Button im Banner ein oder aus.'
                                        ],
                                        [
                                            'hoverEnabled',
                                            'Hover-Effekt aktivieren',
                                            'Steuert das leichte Anheben der Karten.'
                                        ],
                                        [
                                            'previewEnabled',
                                            'Mini-Vorschaukarten aktivieren',
                                            'Schaltet kleine und große Netflix-artige Vorschau global ein oder aus.'
                                        ],
                                        [
                                            'glowEnabled',
                                            'Glow-Effekt aktivieren',
                                            'Schaltet den Karten-Glow global ein oder aus.'
                                        ]
                                    ]
                                        .filter(([ key ]) =>
                                            isAdmin
                                            || key !== 'trailerDebugEnabled'
                                        )
                                        .map(([key, label, hint]) => (
                                        <label
                                            key={key}
                                            className='minitigerSettingsToggle'
                                        >
                                            <input
                                                type='checkbox'
                                                checked={Boolean(
                                                    settings[
                                                        key as keyof MinitigerHomeSettings
                                                    ]
                                                )}
                                                onChange={event =>
                                                    onUpdate({
                                                        [key]: event.currentTarget.checked
                                                    } as Partial<MinitigerHomeSettings>)
                                                }
                                            />
                                            <span>
                                                <strong>{label}</strong>
                                                <small>{hint}</small>
                                            </span>
                                        </label>
                                    ))}

                                    {!isAdmin && (
                                        <label className='minitigerSettingsToggle'>
                                            <input
                                                type='checkbox'
                                                checked={settings.bannerFskVisible}
                                                disabled={!settings.bannerEnabled}
                                                onChange={event =>
                                                    onUpdate({
                                                        bannerFskVisible:
                                                            event.currentTarget.checked
                                                    })
                                                }
                                            />
                                            <span>
                                                <strong>FSK-Sticker im Banner anzeigen</strong>
                                                <small>Persönliche kosmetische Option; der Banner selbst wird vom Administrator verwaltet.</small>
                                            </span>
                                        </label>
                                    )}
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Gesehen-/Folgen-Indikator</h4>
                                    <p className='minitigerSettingsHint'>
                                        Größe und Form gelten für Gesehen-Haken und die Anzahl noch offener Folgen auf Home-, Bibliotheks- und Staffel-Karten.
                                    </p>

                                    <label className='minitigerSettingsField'>
                                        <span>Form</span>
                                        <select
                                            value={settings.playedIndicatorShape}
                                            onChange={event =>
                                                onUpdate({
                                                    playedIndicatorShape:
                                                        event.currentTarget.value as PlayedIndicatorShape
                                                })
                                            }
                                        >
                                            <option value='round'>Viertelkreis</option>
                                            <option value='circle'>Kreis · Vanilla-Stil</option>
                                            <option value='square'>Viereck</option>
                                            <option value='triangle'>Dreieck</option>
                                        </select>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Hintergrund-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='24'
                                                max='72'
                                                step='1'
                                                value={settings.playedIndicatorSize}
                                                onChange={event =>
                                                    onUpdate({
                                                        playedIndicatorSize:
                                                            Number(event.currentTarget.value)
                                                    })
                                                }
                                            />
                                            <output>{settings.playedIndicatorSize}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Zahl / Haken-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='10'
                                                max='30'
                                                step='1'
                                                value={settings.playedIndicatorFontSize}
                                                onChange={event =>
                                                    onUpdate({
                                                        playedIndicatorFontSize:
                                                            Number(event.currentTarget.value)
                                                    })
                                                }
                                            />
                                            <output>{settings.playedIndicatorFontSize}</output>
                                        </div>
                                    </label>
                                </section>
                            </>
                        )}

                        {isAdmin && activeTab === 'home' && (
                            <>
                                <h3>Startseite</h3>
                                <p className='minitigerSettingsIntro'>
                                    Banner, Abstände, Medien-Bibliotheken und Reihen der nativen Minitiger-Startseite.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Startseiten-Modus</h4>
                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.customHomeRowsEnabled}
                                            onChange={event => onUpdate({
                                                customHomeRowsEnabled: event.currentTarget.checked
                                            })}
                                        />
                                        <span>
                                            <strong>Custom Startseiten-Reihen aktivieren</strong>
                                            <small>Aus = originale Jellyfin-Startseiten-Reihen. Der Minitiger-Banner bleibt davon unabhängig.</small>
                                        </span>
                                    </label>
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Banner</h4>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.bannerEnabled}
                                            onChange={event =>
                                                onUpdate({
                                                    bannerEnabled:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>Banner aktivieren</strong>
                                            <small>Blendet den großen Minitiger-Banner ein oder aus.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Banner-Höhe · {settings.bannerHeightOffset === 0 ? 'Standard' : `${settings.bannerHeightOffset > 0 ? '+' : ''}${settings.bannerHeightOffset}px`}</span>
                                        <input
                                            type='range'
                                            min='-140'
                                            max='280'
                                            step='10'
                                            value={settings.bannerHeightOffset}
                                            disabled={!settings.bannerEnabled}
                                            onChange={event => onUpdate({
                                                bannerHeightOffset: Number(event.currentTarget.value)
                                            })}
                                        />
                                        <small>Positive Werte vergrößern den Banner nach unten hinter die Medien-Bibliotheken, ohne deren Grundposition mitzuschieben.</small>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Banner-Inhalte vertikal · {settings.bannerOverlayOffset > 0 ? '+' : ''}{settings.bannerOverlayOffset}px</span>
                                        <input
                                            type='range'
                                            min='-120'
                                            max='120'
                                            step='5'
                                            value={settings.bannerOverlayOffset}
                                            disabled={!settings.bannerEnabled}
                                            onChange={event => onUpdate({
                                                bannerOverlayOffset: Number(event.currentTarget.value)
                                            })}
                                        />
                                        <small>Feinjustierung für Logo/Text sowie FSK/Pfeile. Positive Werte schieben die Banner-UI Richtung Medien-Bibliotheken, negative Werte nach oben.</small>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Fade-out Größe · {settings.bannerFadeSize}px</span>
                                        <input
                                            type='range'
                                            min='0'
                                            max='320'
                                            step='10'
                                            value={settings.bannerFadeSize}
                                            disabled={!settings.bannerEnabled}
                                            onChange={event => onUpdate({
                                                bannerFadeSize: Number(event.currentTarget.value)
                                            })}
                                        />
                                        <small>Bestimmt, wie hoch der weiche Verlauf am unteren Banner-Rand ist. 0px deaktiviert den Verlauf vollständig.</small>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Fade-out Stärke · {settings.bannerFadeStrength}%</span>
                                        <input
                                            type='range'
                                            min='0'
                                            max='100'
                                            step='5'
                                            value={settings.bannerFadeStrength}
                                            disabled={!settings.bannerEnabled || settings.bannerFadeSize === 0}
                                            onChange={event => onUpdate({
                                                bannerFadeStrength: Number(event.currentTarget.value)
                                            })}
                                        />
                                        <small>Steuert die Transparenz am unteren Rand. 0% = keine Transparenz, 100% = der Banner wird unten vollständig transparent.</small>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.bannerNavigationVisible}
                                            disabled={!settings.bannerEnabled}
                                            onChange={event => onUpdate({
                                                bannerNavigationVisible: event.currentTarget.checked
                                            })}
                                        />
                                        <span>
                                            <strong>Banner-Pfeile und Zähler anzeigen</strong>
                                            <small>Blendet Links/Rechts-Navigation inklusive 1/10-Anzeige ein oder aus.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.bannerFskVisible}
                                            disabled={!settings.bannerEnabled}
                                            onChange={event => onUpdate({
                                                bannerFskVisible: event.currentTarget.checked
                                            })}
                                        />
                                        <span>
                                            <strong>FSK-Sticker im Banner anzeigen</strong>
                                            <small>Unabhängig von den FSK-Stickern auf normalen Karten.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.youtubeTrailersEnabled}
                                            onChange={event =>
                                                onUpdate({
                                                    youtubeTrailersEnabled:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>YouTube-Trailer im Banner erlauben</strong>
                                            <small>Lokale Trailer bleiben davon unberührt. Ist diese Option aus, lädt Minitiger keine YouTube-IFrame-Trailer im Banner.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Automatischer Wechsel</span>
                                        <select
                                            value={settings.bannerRotationSeconds}
                                            onChange={event =>
                                                onUpdate({
                                                    bannerRotationSeconds:
                                                        Number(
                                                            event.currentTarget.value
                                                        ) as BannerRotationSeconds
                                                })
                                            }
                                        >
                                            {ROTATION_OPTIONS.map(option => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Inhalte in der Banner-Rotation</span>
                                        <select
                                            value={settings.bannerItemLimit}
                                            onChange={event =>
                                                onUpdate({
                                                    bannerItemLimit:
                                                        Number(
                                                            event.currentTarget.value
                                                        ) as BannerItemLimit
                                                })
                                            }
                                        >
                                            {BANNER_ITEM_LIMIT_OPTIONS.map(option => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        <small>
                                            Weniger Inhalte laden schneller, besonders im Jellyfin Desktop Client.
                                        </small>
                                    </label>
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Abstände & Hauptbibliotheken</h4>

                                    <label className='minitigerRangeField'>
                                        <span>Reihenabstand</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='12'
                                                max='90'
                                                value={settings.rowGap}
                                                onChange={event =>
                                                    onUpdate({
                                                        rowGap: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.rowGap}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Größe der Hauptbibliotheken</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='180'
                                                max='480'
                                                step='10'
                                                value={settings.libraryCardWidth}
                                                onChange={event =>
                                                    onUpdate({
                                                        libraryCardWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.libraryCardWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Abstand der Hauptbibliotheken</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='0'
                                                max='48'
                                                step='2'
                                                value={settings.libraryCardGap}
                                                onChange={event =>
                                                    onUpdate({
                                                        libraryCardGap: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.libraryCardGap}px</output>
                                        </div>
                                        <small>Wie bei virtuellen Bibliotheken: 0px = direkt aneinander, höhere Werte erzeugen mehr Luft zwischen den Karten.</small>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Abstand Haupt- → virtuelle Bibliotheken</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='-120'
                                                max='180'
                                                step='4'
                                                value={settings.libraryVirtualGap}
                                                onChange={event =>
                                                    onUpdate({
                                                        libraryVirtualGap: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.libraryVirtualGap}px</output>
                                        </div>
                                        <small>Steuert nur den Abstand, wenn direkt unter den Hauptbibliotheken eine virtuelle Bibliotheks-Reihe folgt. Negative Werte ziehen die virtuelle Reihe näher an die Hauptbibliotheken heran; andere Reihenabstände bleiben unverändert.</small>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.showLibraryNames}
                                            onChange={event =>
                                                onUpdate({
                                                    showLibraryNames:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>Bibliotheksnamen unter den Karten anzeigen</strong>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={settings.sideRowTitlesEnabled}
                                            onChange={event =>
                                                onUpdate({
                                                    sideRowTitlesEnabled:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>Reihennamen seitlich anzeigen</strong>
                                            <small>Dreht die Reihentitel um 90° im Uhrzeigersinn. Zum Lesen neigt man den Kopf nach links; die Schrift skaliert responsiv in den Seitenrahmen.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Größe normaler Startseiten-Karten</span>
                                        <select
                                            value={settings.cardSize}
                                            onChange={event =>
                                                onUpdate({
                                                    cardSize: parseCardSize(
                                                        event.currentTarget.value
                                                    )
                                                })
                                            }
                                        >
                                            {CARD_SIZE_OPTIONS.map(option => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </section>

                                {virtualConfig
                                    && onSetVirtualHomeGap
                                    && (
                                        <section className='minitigerSettingsCard'>
                                            <h4>Virtuelle Bibliotheken · Home</h4>

                                            <label className='minitigerRangeField'>
                                                <span>Horizontaler Abstand</span>
                                                <div>
                                                    <input
                                                        type='range'
                                                        min='4'
                                                        max='80'
                                                        step='1'
                                                        value={virtualConfig.homeGap}
                                                        disabled={!isAdmin}
                                                        onChange={event =>
                                                            onSetVirtualHomeGap(
                                                                Number(event.currentTarget.value)
                                                            )
                                                        }
                                                    />
                                                    <output>{virtualConfig.homeGap}</output>
                                                </div>
                                            </label>

                                            <p className='minitigerSettingsHint'>
                                                Regelt nur den Links-/Rechts-Abstand zwischen den virtuellen Bibliotheks-Kacheln auf der Startseite.
                                            </p>

                                            <div className='minitigerVirtualSyncStatus' data-status={virtualSyncStatus}>
                                                <strong>
                                                    {virtualSyncStatus === 'server'
                                                        ? '☁ Server-Sync aktiv'
                                                        : virtualSyncStatus === 'migrating'
                                                            ? '↥ Server-Sync wird eingerichtet …'
                                                            : virtualSyncStatus === 'loading'
                                                                ? '… Server-Sync wird geprüft'
                                                                : virtualSyncStatus === 'error'
                                                                    ? '⚠ Server-Sync mit Fehler'
                                                                    : '◌ Lokaler Fallback'}
                                                </strong>
                                                <small>
                                                    {virtualSyncMessage || 'Virtuelle Bibliotheken werden lokal zwischengespeichert.'}
                                                </small>

                                                {isAdmin
                                                    && onPushVirtualConfigToServer
                                                    && (virtualSyncStatus === 'local' || virtualSyncStatus === 'error')
                                                    && (
                                                        <button
                                                            type='button'
                                                            onClick={() => {
                                                                setVirtualMediaMessage('Server-Sync wird gestartet …');
                                                                void onPushVirtualConfigToServer()
                                                                    .then(() => setVirtualMediaMessage('Virtuelle Bibliotheken wurden auf den Server übertragen.'))
                                                                    .catch(() => setVirtualMediaMessage('Server-Sync konnte nicht gestartet werden.'));
                                                            }}
                                                        >
                                                            Lokalen Stand auf Server übertragen
                                                        </button>
                                                    )}
                                            </div>

                                            {!isAdmin && (
                                                <p className='minitigerSettingsHint'>
                                                    Dieser Stand wird zentral vom Administrator verwaltet. Die virtuellen Inhalte und Medien sind für normale Benutzer schreibgeschützt.
                                                </p>
                                            )}
                                        </section>
                                    )}

                                {isAdmin
                                    && virtualConfig
                                    && onUploadVirtualMedia
                                    && onRemoveVirtualMedia
                                    && (
                                        <section className='minitigerSettingsCard'>
                                            <h4>Virtuelle Bibliotheken · Bild / Hover-Video</h4>
                                            <p className='minitigerSettingsHint'>
                                                Bild, transparentes PNG/WebP-Logo und MP4 werden bei aktivem Server-Sync zentral im Jellyfin-Plugin gespeichert. Dadurch sehen Browser, Desktop Client und andere Benutzer dieselben Medien. Ohne Plugin bleibt der bisherige lokale Fallback erhalten.
                                            </p>

                                            <div className='minitigerVirtualMediaSettingsList'>
                                                {virtualConfig.libraries.map(library => (
                                                    <div
                                                        key={library.id}
                                                        className='minitigerVirtualMediaSettingsRow'
                                                    >
                                                        <strong>{library.name}</strong>

                                                        <label>
                                                            Statisches Bild
                                                            <input
                                                                type='file'
                                                                accept='image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
                                                                onChange={event => {
                                                                    const file = event.currentTarget.files?.[0];

                                                                    if (!file) {
                                                                        return;
                                                                    }

                                                                    if (file.size > 15 * 1024 * 1024) {
                                                                        setVirtualMediaMessage('Das virtuelle Bild ist größer als 15 MB.');
                                                                        event.currentTarget.value = '';
                                                                        return;
                                                                    }

                                                                    setVirtualMediaMessage(`Bild für „${library.name}“ wird gespeichert …`);
                                                                    void onUploadVirtualMedia(
                                                                        library.id,
                                                                        'image',
                                                                        file
                                                                    ).then(target => {
                                                                        setVirtualMediaMessage(
                                                                            `Bild für „${library.name}“ ${target === 'server' ? 'zentral auf dem Server' : 'lokal'} gespeichert.`
                                                                        );
                                                                    }).catch(error => {
                                                                        console.error('[Minitiger Virtual] Bild-Upload fehlgeschlagen', error);
                                                                        setVirtualMediaMessage('Bild konnte nicht gespeichert werden' + (error instanceof Error && error.message ? ' · ' + error.message : '.'));
                                                                    });

                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>

                                                        <label>
                                                            MP4
                                                            <input
                                                                type='file'
                                                                accept='video/mp4,.mp4'
                                                                onChange={event => {
                                                                    const file = event.currentTarget.files?.[0];

                                                                    if (!file) {
                                                                        return;
                                                                    }

                                                                    if (file.size > 100 * 1024 * 1024) {
                                                                        setVirtualMediaMessage('Die virtuelle MP4 ist größer als 100 MB. Bitte eine kurze Preview-Datei verwenden.');
                                                                        event.currentTarget.value = '';
                                                                        return;
                                                                    }

                                                                    setVirtualMediaMessage(`MP4 für „${library.name}“ wird gespeichert …`);
                                                                    void onUploadVirtualMedia(
                                                                        library.id,
                                                                        'video',
                                                                        file
                                                                    ).then(target => {
                                                                        setVirtualMediaMessage(
                                                                            `MP4 für „${library.name}“ ${target === 'server' ? 'zentral auf dem Server' : 'lokal'} gespeichert.`
                                                                        );
                                                                    }).catch(error => {
                                                                        console.error('[Minitiger Virtual] MP4 Upload fehlgeschlagen', error);
                                                                        setVirtualMediaMessage('MP4 konnte nicht gespeichert werden' + (error instanceof Error && error.message ? ' · ' + error.message : '.'));
                                                                    });

                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>

                                                        <label>
                                                            Logo (PNG/WebP)
                                                            <input
                                                                type='file'
                                                                accept='image/png,image/webp,.png,.webp'
                                                                onChange={event => {
                                                                    const file = event.currentTarget.files?.[0];

                                                                    if (!file) {
                                                                        return;
                                                                    }

                                                                    if (file.size > 15 * 1024 * 1024) {
                                                                        setVirtualMediaMessage('Das Logo ist größer als 15 MB.');
                                                                        event.currentTarget.value = '';
                                                                        return;
                                                                    }

                                                                    setVirtualMediaMessage(`Logo für „${library.name}“ wird gespeichert …`);
                                                                    void onUploadVirtualMedia(
                                                                        library.id,
                                                                        'logo',
                                                                        file
                                                                    ).then(target => {
                                                                        setVirtualMediaMessage(
                                                                            `Logo für „${library.name}“ ${target === 'server' ? 'zentral auf dem Server' : 'lokal'} gespeichert.`
                                                                        );
                                                                    }).catch(error => {
                                                                        console.error('[Minitiger Virtual] Logo-Upload fehlgeschlagen', error);
                                                                        setVirtualMediaMessage('Logo konnte nicht gespeichert werden' + (error instanceof Error && error.message ? ' · ' + error.message : '.'));
                                                                    });

                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>

                                                        <div className='minitigerVirtualMediaRemoveButtons'>
                                                            {Boolean(library.image || library.imageRevision) && (
                                                                <button
                                                                    type='button'
                                                                    onClick={() => {
                                                                        void onRemoveVirtualMedia(
                                                                            library.id,
                                                                            [ 'image' ]
                                                                        ).then(() => setVirtualMediaMessage(`Bild von „${library.name}“ entfernt.`));
                                                                    }}
                                                                >
                                                                    Bild entfernen
                                                                </button>
                                                            )}

                                                            {Boolean(library.videoKey || library.videoRevision || library.logo || library.logoRevision) && (
                                                                <button
                                                                    type='button'
                                                                    onClick={() => {
                                                                        void onRemoveVirtualMedia(
                                                                            library.id,
                                                                            [ 'video', 'logo' ]
                                                                        ).then(() => setVirtualMediaMessage(`Video/Logo von „${library.name}“ entfernt.`));
                                                                    }}
                                                                >
                                                                    Video/Logo entfernen
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {virtualMediaMessage && (
                                                <p className='minitigerSettingsHint'>
                                                    {virtualMediaMessage}
                                                </p>
                                            )}
                                        </section>
                                    )}

                                {isAdmin
                                    && virtualConfig
                                    && onAddVirtualLibrary
                                    && onUpdateVirtualLibrary
                                    && onRemoveVirtualLibrary
                                    && onMoveVirtualLibrary
                                    && onUpdateVirtualRowTitle
                                    && onToggleVirtualRow
                                    && onSetVirtualRowTitleVisible
                                    && onSetVirtualHomeCardWidth
                                    ? (
                                        <MinitigerHomeBuilderSettings
                                            disabled={!settings.customHomeRowsEnabled}
                                            settings={settings}
                                            libraries={libraries}
                                            customConfig={customConfig}
                                            virtualConfig={virtualConfig}
                                            onToggleSection={onToggleSection}
                                            onMoveHomeRow={onMoveHomeRow}
                                            onReorderHomeRows={onReorderHomeRows}
                                            onUpdateCustomRow={onUpdateCustomRow}
                                            onToggleVirtualRow={onToggleVirtualRow}
                                            onUpdateVirtualRowTitle={onUpdateVirtualRowTitle}
                                            onSetVirtualRowTitleVisible={onSetVirtualRowTitleVisible}
                                            onSetVirtualHomeCardWidth={onSetVirtualHomeCardWidth}
                                            onAddVirtualLibrary={onAddVirtualLibrary}
                                            onUpdateVirtualLibrary={onUpdateVirtualLibrary}
                                            onRemoveVirtualLibrary={onRemoveVirtualLibrary}
                                            onMoveVirtualLibrary={onMoveVirtualLibrary}
                                        />
                                    )
                                    : (
                                        <section className='minitigerSettingsCard'>
                                            <h4>Custom Startseiten-Reihen</h4>
                                            <p className='minitigerSettingsHint'>
                                                Die vollständige Reihenverwaltung ist nur für Administratoren verfügbar.
                                            </p>
                                        </section>
                                    )}
                            </>
                        )}

                        {isAdmin && activeTab === 'libraries' && (
                            <>
                                <h3>Bibliotheken</h3>
                                <p className='minitigerSettingsIntro'>
                                    Darstellung der nativen Minitiger-Bibliotheksseiten nach Bibliothekstyp.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Darstellung nach Bibliothekstyp</h4>

                                    {[
                                        [
                                            'seriesDisplay',
                                            'Serien-Bibliotheken'
                                        ],
                                        [
                                            'movieDisplay',
                                            'Film-Bibliotheken'
                                        ],
                                        [
                                            'otherDisplay',
                                            'Sonstige Bibliotheken'
                                        ]
                                    ].map(([key, label]) => (
                                        <label
                                            key={key}
                                            className='minitigerSettingsField'
                                        >
                                            <span>{label}</span>
                                            <select
                                                value={String(
                                                    librarySettings[
                                                        key as keyof MinitigerLibrarySettings
                                                    ]
                                                )}
                                                onChange={event =>
                                                    onUpdateLibrarySettings({
                                                        [key]: parseDisplay(
                                                            event.currentTarget.value
                                                        )
                                                    } as Partial<MinitigerLibrarySettings>)
                                                }
                                            >
                                                {DISPLAY_OPTIONS.map(option => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ))}

                                    <p className='minitigerSettingsHint'>
                                        Musik bleibt fest 1:1, Musikvideos Landscape und Manga/Bücher Poster – wie im alten Minitiger.
                                    </p>

                                    <label className='minitigerRangeField'>
                                        <span>Poster-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='160'
                                                max='460'
                                                step='10'
                                                value={librarySettings.posterSize}
                                                onChange={event =>
                                                    onUpdateLibrarySettings({
                                                        posterSize: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{librarySettings.posterSize}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Landscape-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='260'
                                                max='760'
                                                step='10'
                                                value={librarySettings.landscapeSize}
                                                onChange={event =>
                                                    onUpdateLibrarySettings({
                                                        landscapeSize: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{librarySettings.landscapeSize}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={librarySettings.customNavigationEnabled}
                                            onChange={event =>
                                                onUpdateLibrarySettings({
                                                    customNavigationEnabled:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>Minitiger-Navigationsleiste verwenden</strong>
                                            <small>Aus = originale Jellyfin A-Z-Navigation. An = Minitiger-Leiste mit Sortierung und Filter.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Position der Minitiger-Navigation</span>
                                        <select
                                            value={librarySettings.azMode}
                                            disabled={!librarySettings.customNavigationEnabled}
                                            onChange={event =>
                                                onUpdateLibrarySettings({
                                                    azMode: parseAZMode(
                                                        event.currentTarget.value
                                                    )
                                                })
                                            }
                                        >
                                            <option value='auto'>Automatisch · oben → rechts beim Scrollen</option>
                                            <option value='top'>Immer oben</option>
                                            <option value='side'>Immer rechts</option>
                                        </select>
                                    </label>
                                </section>

                                {virtualConfig
                                    && onSetVirtualPagePosterWidth
                                    && onSetVirtualPageLandscapeWidth
                                    && onSetVirtualPageGap
                                    && (
                                        <section className='minitigerSettingsCard'>
                                            <h4>Virtuelle Bibliotheken</h4>
                                            <p className='minitigerSettingsHint'>
                                                Diese Größen gelten nur innerhalb virtueller Bibliotheken und sind unabhängig von den normalen Bibliotheksseiten.
                                            </p>

                                            <label className='minitigerRangeField'>
                                                <span>Virtuelle Poster-Größe</span>
                                                <div>
                                                    <input
                                                        type='range'
                                                        min='110'
                                                        max='360'
                                                        step='5'
                                                        value={virtualConfig.pagePosterWidth}
                                                        disabled={!isAdmin}
                                                        onChange={event =>
                                                            onSetVirtualPagePosterWidth(
                                                                Number(event.currentTarget.value)
                                                            )
                                                        }
                                                    />
                                                    <output>{virtualConfig.pagePosterWidth}</output>
                                                </div>
                                            </label>

                                            <label className='minitigerRangeField'>
                                                <span>Virtuelle Landscape-Größe</span>
                                                <div>
                                                    <input
                                                        type='range'
                                                        min='180'
                                                        max='620'
                                                        step='10'
                                                        value={virtualConfig.pageLandscapeWidth}
                                                        disabled={!isAdmin}
                                                        onChange={event =>
                                                            onSetVirtualPageLandscapeWidth(
                                                                Number(event.currentTarget.value)
                                                            )
                                                        }
                                                    />
                                                    <output>{virtualConfig.pageLandscapeWidth}</output>
                                                </div>
                                            </label>

                                            <label className='minitigerRangeField'>
                                                <span>Abstand der virtuellen Inhalte</span>
                                                <div>
                                                    <input
                                                        type='range'
                                                        min='4'
                                                        max='32'
                                                        step='1'
                                                        value={virtualConfig.pageGap}
                                                        disabled={!isAdmin}
                                                        onChange={event =>
                                                            onSetVirtualPageGap(
                                                                Number(event.currentTarget.value)
                                                            )
                                                        }
                                                    />
                                                    <output>{virtualConfig.pageGap}</output>
                                                </div>
                                            </label>
                                        </section>
                                    )}
                            </>
                        )}

                        {!isAdmin && activeTab === 'libraries' && (
                            <>
                                <h3>Bibliotheken</h3>
                                <p className='minitigerSettingsIntro'>
                                    Persönliche Einstellung für die Bibliotheks-Navigation.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Navigation</h4>

                                    <label className='minitigerSettingsToggle'>
                                        <input
                                            type='checkbox'
                                            checked={librarySettings.customNavigationEnabled}
                                            onChange={event =>
                                                onUpdateLibrarySettings({
                                                    customNavigationEnabled:
                                                        event.currentTarget.checked
                                                })
                                            }
                                        />
                                        <span>
                                            <strong>Minitiger-Navigationsleiste verwenden</strong>
                                            <small>Aus = originale Jellyfin A-Z-Navigation. An = Minitiger-Navigation.</small>
                                        </span>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Position der Minitiger-Navigation</span>
                                        <select
                                            value={librarySettings.azMode}
                                            disabled={!librarySettings.customNavigationEnabled}
                                            onChange={event =>
                                                onUpdateLibrarySettings({
                                                    azMode: parseAZMode(
                                                        event.currentTarget.value
                                                    )
                                                })
                                            }
                                        >
                                            <option value='auto'>Oben → rechts beim Scrollen</option>
                                            <option value='top'>Immer oben</option>
                                            <option value='side'>Immer rechts</option>
                                        </select>
                                    </label>
                                </section>
                            </>
                        )}

                        {isAdmin && activeTab === 'details' && (
                            <>
                                <h3>Detailpages</h3>
                                <p className='minitigerSettingsIntro'>
                                    Native Größen für Serien-, Film-, Staffel- und Folgen-Detailpages. Änderungen wirken sofort per HMR/React.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Größen</h4>

                                    <label className='minitigerRangeField'>
                                        <span>Allgemeine Poster-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='260'
                                                max='620'
                                                step='10'
                                                value={detailSettings.posterWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        posterWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.posterWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Staffel-Poster-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='120'
                                                max='360'
                                                step='10'
                                                value={detailSettings.seasonPosterWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        seasonPosterWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.seasonPosterWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Inhalte-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='240'
                                                max='620'
                                                step='10'
                                                value={detailSettings.contentWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        contentWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.contentWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Besetzung &amp; Mitwirkende-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='90'
                                                max='240'
                                                step='2'
                                                value={detailSettings.castWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        castWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.castWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerSettingsField'>
                                        <span>Besetzung &amp; Mitwirkende-Form</span>
                                        <select
                                            value={detailSettings.castShape}
                                            onChange={event =>
                                                onUpdateDetailSettings({
                                                    castShape:
                                                        event.currentTarget.value as MinitigerCastShape
                                                })
                                            }
                                        >
                                            <option value='portrait'>Portrait 2:3</option>
                                            <option value='square'>Würfel / Quadratisch 1:1</option>
                                            <option value='circle'>Rund</option>
                                            <option value='oval'>Eierförmig / Oval</option>
                                            <option value='star'>Stern ⭐</option>
                                            <option value='landscape'>Landscape 16:9 (Legacy)</option>
                                        </select>
                                    </label>
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Manga / Bände</h4>
                                    <p className='minitigerSettingsHint'>
                                        Diese Größen gelten nur für Manga-Detailpages und sind unabhängig von den allgemeinen Detailpage-Reglern.
                                    </p>

                                    <label className='minitigerRangeField'>
                                        <span>Manga-Hauptposter-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='220'
                                                max='620'
                                                step='10'
                                                value={detailSettings.mangaPosterWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        mangaPosterWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.mangaPosterWidth}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Manga-Band-Größe</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='100'
                                                max='360'
                                                step='10'
                                                value={detailSettings.mangaVolumeWidth}
                                                onChange={event =>
                                                    onUpdateDetailSettings({
                                                        mangaVolumeWidth: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{detailSettings.mangaVolumeWidth}</output>
                                        </div>
                                    </label>
                                </section>
                            </>
                        )}

                        {activeTab === 'colors' && (
                            <>
                                <h3>Farben</h3>
                                <p className='minitigerSettingsIntro'>
                                    Native Farbsteuerung für Hauptaktionen, Nebenaktionen, Bibliotheksleiste, Banner und Glow.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Haupt- und Nebenfarben</h4>
                                    <div className='minitigerColorGrid'>
                                        <ColorField
                                            label='Button 1 · Normal'
                                            value={settings.accentColor}
                                            onChange={value => onUpdate({
                                                accentColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Button 1 · Hover'
                                            value={settings.primaryHoverColor}
                                            onChange={value => onUpdate({
                                                primaryHoverColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Button 2 · Normal'
                                            value={settings.secondaryColor}
                                            onChange={value => onUpdate({
                                                secondaryColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Button 2 · Hover'
                                            value={settings.secondaryHoverColor}
                                            onChange={value => onUpdate({
                                                secondaryHoverColor: value
                                            })}
                                        />
                                    </div>

                                    <div className='minitigerColorGrid minitigerColorGridExtra'>
                                        <ColorField
                                            label='Pfeile / Navigation'
                                            value={settings.arrowColor}
                                            onChange={value => onUpdate({
                                                arrowColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Genre-Tags'
                                            value={settings.genreTagColor}
                                            onChange={value => onUpdate({
                                                genreTagColor: value
                                            })}
                                        />
                                    </div>

                                    <div className='minitigerColorPresets'>
                                        {ACCENT_PRESETS.map(color => (
                                            <button
                                                key={color}
                                                type='button'
                                                className={
                                                    settings.accentColor.toLowerCase()
                                                    === color.toLowerCase()
                                                        ? 'isSelected'
                                                        : ''
                                                }
                                                style={{ background: color }}
                                                onClick={() => onUpdate({
                                                    accentColor: color
                                                })}
                                            />
                                        ))}
                                    </div>
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Bibliotheks-Leiste / Banner / Glow</h4>
                                    <div className='minitigerColorGrid'>
                                        <ColorField
                                            label='Bibliotheks-Leiste · Hintergrund'
                                            value={settings.libraryBarColor}
                                            onChange={value => onUpdate({
                                                libraryBarColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Bibliotheks-Leiste · Text'
                                            value={settings.libraryBarTextColor}
                                            onChange={value => onUpdate({
                                                libraryBarTextColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Banner · Audio / Untertitel'
                                            value={settings.bannerMetaColor}
                                            onChange={value => onUpdate({
                                                bannerMetaColor: value
                                            })}
                                        />
                                        <ColorField
                                            label='Glow-Farbe'
                                            value={settings.glowColor}
                                            previewGlowStrength={settings.glowStrength}
                                            previewGlowSize={settings.glowSize}
                                            onChange={value => onUpdate({
                                                glowColor: value
                                            })}
                                        />
                                    </div>

                                    <label className='minitigerRangeField'>
                                        <span>Glow-Stärke (0-100)</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='0'
                                                max='100'
                                                value={settings.glowStrength}
                                                onChange={event =>
                                                    onUpdate({
                                                        glowStrength: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.glowStrength}</output>
                                        </div>
                                    </label>

                                    <label className='minitigerRangeField'>
                                        <span>Glow-Größe (0-40)</span>
                                        <div>
                                            <input
                                                type='range'
                                                min='0'
                                                max='40'
                                                value={settings.glowSize}
                                                onChange={event =>
                                                    onUpdate({
                                                        glowSize: Number(
                                                            event.currentTarget.value
                                                        )
                                                    })
                                                }
                                            />
                                            <output>{settings.glowSize}</output>
                                        </div>
                                    </label>
                                </section>
                            </>
                        )}

                        {isAdmin && activeTab === 'backup' && (
                            <>
                                <h3>Backup & Import</h3>
                                <p className='minitigerSettingsIntro'>
                                    Exportiert die nativen Home-, Bibliotheks-, Detailpage-, Custom-Reihen- und virtuellen Bibliotheks-Einstellungen als JSON.
                                </p>

                                <section className='minitigerSettingsCard'>
                                    <h4>Einstellungen sichern</h4>
                                    <div className='minitigerBackupButtons'>
                                        <button
                                            type='button'
                                            className='isPrimary'
                                            onClick={downloadBackup}
                                        >
                                            Backup herunterladen
                                        </button>

                                        <label>
                                            Backup importieren
                                            <input
                                                type='file'
                                                accept='application/json,.json'
                                                onChange={event => {
                                                    const file = event.currentTarget.files?.[0];
                                                    if (file) {
                                                        importBackup(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {importMessage && (
                                        <p className='minitigerSettingsHint'>
                                            {importMessage}
                                        </p>
                                    )}
                                </section>

                                <section className='minitigerSettingsCard'>
                                    <h4>Standard wiederherstellen</h4>
                                    <div className='minitigerBackupButtons'>
                                        <button
                                            type='button'
                                            onClick={onReset}
                                        >
                                            Home / Farben zurücksetzen
                                        </button>
                                        <button
                                            type='button'
                                            onClick={onResetLibrarySettings}
                                        >
                                            Bibliotheken zurücksetzen
                                        </button>
                                        <button
                                            type='button'
                                            onClick={onResetDetailSettings}
                                        >
                                            Detailpages zurücksetzen
                                        </button>
                                        <button
                                            type='button'
                                            onClick={onResetCustomRows}
                                        >
                                            Custom Reihen zurücksetzen
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}
                    </main>
                </div>
            </section>
        </div>
    );
};

export default MinitigerSettingsPanel;

// MINITIGER_PATCH_MARKER: PHASE_18_3_1_2_FORCE_APPLY
