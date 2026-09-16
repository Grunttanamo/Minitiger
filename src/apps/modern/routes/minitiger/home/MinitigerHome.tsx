import { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { ItemFields } from '@jellyfin/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@jellyfin/sdk/lib/generated-client/models/sort-order';
import type { ApiClient } from 'jellyfin-apiclient';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useNextUp } from 'apps/legacy/features/libraries/api/useNextUp';
import { useResumeItems } from 'apps/legacy/features/libraries/api/useResumeItems';
import { clearBackdrop } from 'components/backdrop/backdrop';
import Page from 'components/Page';
import MinitigerPreviewLayer from 'apps/modern/features/minitiger/MinitigerPreviewLayer';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import { useGetItems } from 'hooks/useFetchItems';
import type { ItemDto } from 'types/base/models/item-dto';

import MinitigerCustomRow from './components/MinitigerCustomRow';
import MinitigerHero from './components/MinitigerHero';
import MinitigerVanillaHomeSections from './components/MinitigerVanillaHomeSections';
import MinitigerMediaRow from './components/MinitigerMediaRow';
import MinitigerSettingsPanel from './components/MinitigerSettingsPanel';
import MinitigerVirtualAssignModal from './components/MinitigerVirtualAssignModal';
import MinitigerVirtualHomeMedia from './components/MinitigerVirtualHomeMedia';
import MinitigerVirtualLibraryPage from './components/MinitigerVirtualLibraryPage';
import {
    getContrastTextColor,
    isCustomHomeRowId,
    isSystemHomeRowId,
    isVirtualHomeRowId,
    type HomeRowId,
    type HomeSectionId,
    type VirtualHomeRowId
} from './config/homeSettings';
import useMinitigerCustomRows from './hooks/useMinitigerCustomRows';
import useMinitigerDetailSettings from './hooks/useMinitigerDetailSettings';
import useMinitigerHomeSettings from './hooks/useMinitigerHomeSettings';
import useMinitigerLibrarySettings from './hooks/useMinitigerLibrarySettings';
import useMinitigerThemeVariables from './hooks/useMinitigerThemeVariables';
import useMinitigerVirtualLibraries from './hooks/useMinitigerVirtualLibraries';
import { getItemRoute } from './routingUtils';
import './MinitigerHome.scss';

const getLibraryImageUrl = (
    apiClient: ApiClient | undefined,
    library: ItemDto
) => {
    if (!apiClient || !library.Id) {
        return undefined;
    }

    const primaryTag = library.ImageTags?.Primary;

    if (primaryTag) {
        return apiClient.getImageUrl(library.Id, {
            type: 'Primary',
            tag: primaryTag,
            maxWidth: 720,
            quality: 92
        });
    }

    const thumbTag = library.ImageTags?.Thumb;

    if (thumbTag) {
        return apiClient.getImageUrl(library.Id, {
            type: 'Thumb',
            tag: thumbTag,
            maxWidth: 720,
            quality: 92
        });
    }

    const backdropTag = library.BackdropImageTags?.[0];

    if (backdropTag) {
        return apiClient.getImageUrl(library.Id, {
            type: 'Backdrop',
            tag: backdropTag,
            index: 0,
            maxWidth: 720,
            quality: 92
        });
    }

    return undefined;
};

const MinitigerHome = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const [ settingsOpen, setSettingsOpen ] = useState(false);
    const [ assignTarget, setAssignTarget ] = useState<ItemDto | null>(null);
    const [ searchParams ] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('minitigerSettings') === '1') {
            setSettingsOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const onOpenSettings = () => {
            setSettingsOpen(true);
        };

        window.addEventListener(
            'minitiger:open-settings',
            onOpenSettings
        );

        return () => {
            window.removeEventListener(
                'minitiger:open-settings',
                onOpenSettings
            );
        };
    }, []);

    const isAdmin = Boolean(user?.Policy?.IsAdministrator);

    const {
        config: virtualConfig,
        syncStatus: virtualSyncStatus,
        syncMessage: virtualSyncMessage,
        addLibrary: addVirtualLibrary,
        updateLibrary: updateVirtualLibrary,
        removeLibrary: removeVirtualLibrary,
        uploadMedia: uploadVirtualMedia,
        removeMedia: removeVirtualMedia,
        pushCurrentConfigToServer: pushVirtualConfigToServer,
        setItemMembership,
        updateRowTitle: updateVirtualRowTitle,
        setRowTitleVisible: setVirtualRowTitleVisible,
        toggleRow: toggleVirtualRow,
        setHomeCardWidth: setVirtualHomeCardWidth,
        setHomeGap: setVirtualHomeGap,
        setPagePosterWidth: setVirtualPagePosterWidth,
        setPageLandscapeWidth: setVirtualPageLandscapeWidth,
        setPageGap: setVirtualPageGap,
        moveLibrary: moveVirtualLibrary,
        replaceConfig: replaceVirtualConfig
    } = useMinitigerVirtualLibraries();

    const {
        settings,
        updateSettings,
        toggleSection,
        moveHomeRow,
        reorderHomeRows,
        resetSettings
    } = useMinitigerHomeSettings();

    const {
        config: customConfig,
        updateRow: updateCustomRow,
        replaceConfig: replaceCustomConfig,
        resetCustomRows
    } = useMinitigerCustomRows();

    const {
        settings: librarySettings,
        updateSettings: updateLibrarySettings,
        resetSettings: resetLibrarySettings
    } = useMinitigerLibrarySettings();

    const {
        settings: detailSettings,
        updateSettings: updateDetailSettings,
        resetSettings: resetDetailSettings
    } = useMinitigerDetailSettings();

    useMinitigerThemeVariables(settings);

    useEffect(() => {
        const root = document.querySelector<HTMLElement>(
            '#indexPage.minitigerHome'
        );

        if (!root) {
            return;
        }

        let animationFrame = 0;
        const observedRows = new Set<Element>();

        const updateSideTitlePositions = () => {
            animationFrame = 0;

            if (!settings.sideRowTitlesEnabled) {
                root.querySelectorAll<HTMLElement>(
                    '.minitigerMediaSection, .minitigerVirtualHomeSection'
                ).forEach(section => {
                    section.style.removeProperty('--mt-side-title-center-y');
                    section.style.removeProperty('--mt-side-title-length');
                });
                return;
            }

            root.querySelectorAll<HTMLElement>(
                '.minitigerMediaSection, .minitigerVirtualHomeSection'
            ).forEach(section => {
                const row = section.querySelector<HTMLElement>(
                    '.minitigerMediaRow, .minitigerVirtualHomeRow'
                );

                if (!row) {
                    return;
                }

                const sectionRect = section.getBoundingClientRect();
                const rowRect = row.getBoundingClientRect();
                const centerY =
                    rowRect.top - sectionRect.top + rowRect.height / 2;
                const usableLength = Math.max(
                    72,
                    rowRect.height - 12
                );

                section.style.setProperty(
                    '--mt-side-title-center-y',
                    `${centerY.toFixed(2)}px`
                );
                section.style.setProperty(
                    '--mt-side-title-length',
                    `${usableLength.toFixed(2)}px`
                );
            });
        };

        const scheduleUpdate = () => {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }

            animationFrame = window.requestAnimationFrame(
                updateSideTitlePositions
            );
        };

        const resizeObserver = new ResizeObserver(scheduleUpdate);

        const observeRows = () => {
            root.querySelectorAll(
                '.minitigerMediaRow, .minitigerVirtualHomeRow'
            ).forEach(row => {
                if (observedRows.has(row)) {
                    return;
                }

                observedRows.add(row);
                resizeObserver.observe(row);
            });
        };

        const mutationObserver = new MutationObserver(() => {
            observeRows();
            scheduleUpdate();
        });

        observeRows();
        scheduleUpdate();

        mutationObserver.observe(root, {
            childList: true,
            subtree: true
        });
        window.addEventListener('resize', scheduleUpdate);

        return () => {
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }

            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener('resize', scheduleUpdate);
        };
    }, [settings.sideRowTitlesEnabled]);

    const {
        data: userViewsData,
        isPending: librariesPending,
        isError: librariesError
    } = useUserViews({
        userId: user?.Id
    });

    const {
        data: resumeData,
        isPending: resumePending,
        isError: resumeError
    } = useResumeItems({
        limit: 18,
        fields: [
            ItemFields.PrimaryImageAspectRatio
        ],
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false
    });

    const {
        data: nextUpData,
        isPending: nextUpPending,
        isError: nextUpError
    } = useNextUp({
        limit: 18,
        fields: [
            ItemFields.PrimaryImageAspectRatio,
            ItemFields.DateCreated
        ],
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false,
        enableResumable: false
    });

    const {
        data: watchlistData,
        isPending: watchlistPending,
        isError: watchlistError
    } = useGetItems({
        recursive: true,
        limit: 18,
        isFavorite: true,
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false,
        includeItemTypes: [
            BaseItemKind.Movie,
            BaseItemKind.Series,
            BaseItemKind.Episode,
            BaseItemKind.MusicVideo,
            BaseItemKind.Video,
            BaseItemKind.Audio,
            BaseItemKind.MusicAlbum,
            BaseItemKind.Book
        ],
        sortBy: [ ItemSortBy.SortName ],
        sortOrder: [ SortOrder.Ascending ]
    });

    const {
        data: rewatchData,
        isPending: rewatchPending,
        isError: rewatchError
    } = useGetItems({
        recursive: true,
        limit: 18,
        isPlayed: true,
        imageTypeLimit: 1,
        enableImageTypes: [
            ImageType.Primary,
            ImageType.Backdrop,
            ImageType.Thumb
        ],
        enableTotalRecordCount: false,
        includeItemTypes: [
            BaseItemKind.Movie,
            BaseItemKind.Series
        ],
        sortBy: [ ItemSortBy.Random ]
    });

    useEffect(() => {
        clearBackdrop();
    }, []);

    const libraries = (userViewsData?.Items ?? [])
        .filter(library =>
            String(library.CollectionType ?? '')
                .toLowerCase() !== 'playlists'
        );
    const resumeItems = (
        (resumeData?.Items ?? []) as ItemDto[]
    ).filter(item => {
        const type =
            String(item.Type ?? '')
                .toLowerCase();

        return !item.IsFolder
            && [
                'episode',
                'movie',
                'video'
            ].includes(type);
    });

    const nextUpItems =
        (nextUpData?.Items ?? []) as ItemDto[];
    const watchlistItems = watchlistData?.Items ?? [];
    const rewatchItems = rewatchData?.Items ?? [];

    const virtualLibraryId = searchParams.get('minitigerVirtualLibrary');
    const activeVirtualLibrary = virtualConfig.libraries.find(
        library => library.id === virtualLibraryId
    );

    const isVirtuallyAssigned = (itemId?: string | null) => (
        Boolean(itemId)
        && virtualConfig.libraries.some(library =>
            library.itemIds.includes(itemId ?? '')
        )
    );

    const orderedVirtualLibraries = virtualConfig.homeOrder
        .map(id => virtualConfig.libraries.find(library => library.id === id))
        .filter((library): library is NonNullable<typeof library> => (
            Boolean(library?.enabled)
        ));

    const virtualRows = [
        orderedVirtualLibraries.slice(0, 8),
        orderedVirtualLibraries.slice(8, 16),
        orderedVirtualLibraries.slice(16, 24)
    ];

    const librarySection = (
        <section className='minitigerSection minitigerLibrarySection'>
            {librariesPending && (
                <div className='minitigerStatusCard'>
                    Bibliotheken werden geladen …
                </div>
            )}

            {librariesError && (
                <div className='minitigerStatusCard minitigerStatusError'>
                    Die Bibliotheken konnten nicht geladen werden.
                </div>
            )}

            {!librariesPending
                && !librariesError
                && libraries.length > 0
                && (
                    <div className='minitigerLibraryGrid'>
                        {libraries.map((library) => {
                            const libraryItem = library as ItemDto;
                            const imageUrl = getLibraryImageUrl(
                                apiClient,
                                libraryItem
                            );

                            return (
                                <Link
                                    key={library.Id ?? library.Name}
                                    className='minitigerLibraryCard'
                                    to={getItemRoute(
                                        libraryItem,
                                        {
                                            context:
                                                library.CollectionType
                                        }
                                    )}
                                    aria-label={
                                        library.Name ?? 'Bibliothek'
                                    }
                                >
                                    <div className='minitigerLibraryCardBody'>
                                        <div className='minitigerLibraryImageWrap'>
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt=''
                                                />
                                            ) : (
                                                <div className='minitigerLibraryFallback'>
                                                    🐯
                                                </div>
                                            )}
                                        </div>

                                        <div className='minitigerLibraryName'>
                                            {library.Name ?? 'Bibliothek'}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
        </section>
    );

    const sectionNodes = useMemo<Record<
        HomeSectionId,
        React.ReactNode
    >>(() => ({
        libraries: librarySection,
        resume: (
            <MinitigerMediaRow
                title='Weiterschauen'
                items={resumeItems}
                apiClient={apiClient}
                pending={resumePending}
                error={resumeError}
                variant='landscape'
                preferParentLandscape
                showProgress
                loadAudioFlags={settings.showAudioFlags}
                showFskBadges={settings.showFskBadges}
                showPlayedIndicators={settings.showPlayedIndicators}
                showVirtualAssign={isAdmin && virtualConfig.libraries.length > 0}
                isVirtuallyAssigned={isVirtuallyAssigned}
                onVirtualAssign={setAssignTarget}
            />
        ),
        nextUp: (
            <MinitigerMediaRow
                title='Als Nächstes'
                items={nextUpItems}
                apiClient={apiClient}
                pending={nextUpPending}
                error={nextUpError}
                variant='landscape'
                preferParentLandscape
                loadAudioFlags={settings.showAudioFlags}
                showFskBadges={settings.showFskBadges}
                showPlayedIndicators={settings.showPlayedIndicators}
                showVirtualAssign={isAdmin && virtualConfig.libraries.length > 0}
                isVirtuallyAssigned={isVirtuallyAssigned}
                onVirtualAssign={setAssignTarget}
            />
        ),
        watchlist: (
            <MinitigerMediaRow
                title='Watchlist'
                items={watchlistItems}
                apiClient={apiClient}
                pending={watchlistPending}
                error={watchlistError}
                variant='poster'
                loadAudioFlags={settings.showAudioFlags}
                showFskBadges={settings.showFskBadges}
                showPlayedIndicators={settings.showPlayedIndicators}
                showVirtualAssign={isAdmin && virtualConfig.libraries.length > 0}
                isVirtuallyAssigned={isVirtuallyAssigned}
                onVirtualAssign={setAssignTarget}
            />
        ),
        recent: (
            <MinitigerMediaRow
                title='Erneut ansehen'
                items={rewatchItems}
                apiClient={apiClient}
                pending={rewatchPending}
                error={rewatchError}
                variant='poster'
                loadAudioFlags={settings.showAudioFlags}
                showFskBadges={settings.showFskBadges}
                showPlayedIndicators={settings.showPlayedIndicators}
                showVirtualAssign={isAdmin && virtualConfig.libraries.length > 0}
                isVirtuallyAssigned={isVirtuallyAssigned}
                onVirtualAssign={setAssignTarget}
            />
        )
    }), [
        apiClient,
        librariesError,
        librariesPending,
        librarySection,
        nextUpError,
        nextUpItems,
        nextUpPending,
        rewatchError,
        rewatchItems,
        rewatchPending,
        resumeError,
        resumeItems,
        resumePending,
        watchlistError,
        watchlistItems,
        watchlistPending,
        isAdmin,
        settings.showAudioFlags,
        settings.showFskBadges,
        settings.showPlayedIndicators,
        virtualConfig.libraries
    ]);

    const renderVirtualHomeRow = (
        rowId: VirtualHomeRowId
    ) => {
        const index =
            Number(rowId.replace('virtual', '')) - 1;

        const librariesInRow =
            virtualRows[index] ?? [];

        if (
            !virtualConfig.rowEnabled[rowId]
            || librariesInRow.length === 0
        ) {
            return null;
        }

        return (
            <section
                key={rowId}
                className='minitigerSection minitigerVirtualHomeSection'
            >
                {virtualConfig.rowTitleVisible[rowId] && (
                    <div className='minitigerSectionHeader'>
                        <h2
                            style={{
                                '--mt-side-title-size':
                                    `${Math.max(
                                        0.72,
                                        Math.min(
                                            1.18,
                                            1.34
                                            - virtualConfig.rowTitles[rowId].length
                                                * 0.018
                                        )
                                    ).toFixed(2)}rem`
                            } as React.CSSProperties}
                        >
                            {virtualConfig.rowTitles[rowId]}
                        </h2>
                    </div>
                )}

                <div className='minitigerVirtualHomeRow'>
                    {librariesInRow.map(library => (
                        <Link
                            key={library.id}
                            className='minitigerVirtualHomeCard'
                            data-show-caption={
                                library.showCaption
                            }
                            to={`/home?minitigerVirtualLibrary=${encodeURIComponent(library.id)}`}
                        >
                            <MinitigerVirtualHomeMedia
                                library={library}
                                apiClient={apiClient}
                            />

                            {library.showCaption && (
                                <div className='minitigerVirtualHomeCaption'>
                                    <strong>
                                        {library.name}
                                    </strong>
                                    <span>
                                        {library.itemIds.length} Inhalte
                                    </span>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            </section>
        );
    };

    const renderHomeRow = (
        rowId: HomeRowId
    ): React.ReactNode => {
        if (isSystemHomeRowId(rowId)) {
            return settings.visibleSections[rowId]
                ? sectionNodes[rowId]
                : null;
        }

        if (isVirtualHomeRowId(rowId)) {
            return renderVirtualHomeRow(rowId);
        }

        if (isCustomHomeRowId(rowId)) {
            const row = customConfig.rows.find(
                candidate => candidate.key === rowId
            );

            if (!row?.enabled) {
                return null;
            }

            return (
                <MinitigerCustomRow
                    key={row.key}
                    row={row}
                    libraries={libraries as ItemDto[]}
                    apiClient={apiClient}
                    loadAudioFlags={settings.showAudioFlags}
                    showFskBadges={settings.showFskBadges}
                    showPlayedIndicators={settings.showPlayedIndicators}
                    showVirtualAssign={
                        isAdmin
                        && virtualConfig.libraries.length > 0
                    }
                    isVirtuallyAssigned={
                        isVirtuallyAssigned
                    }
                    onVirtualAssign={
                        setAssignTarget
                    }
                />
            );
        }

        return null;
    };

    const homeStyle = {
        '--mt-accent': settings.accentColor,
        '--mt-accent-hover': settings.primaryHoverColor,
        '--mt-accent-text':
            getContrastTextColor(settings.accentColor),
        '--mt-button': settings.secondaryColor,
        '--mt-button-hover': settings.secondaryHoverColor,
        '--mt-banner-meta': settings.bannerMetaColor,
        '--mt-glow-color': settings.glowColor,
        '--mt-glow-opacity': settings.glowStrength / 100,
        '--mt-glow-size': `${settings.glowSize}px`,
        '--mt-played-indicator-size':
            `${settings.playedIndicatorSize}px`,
        '--mt-played-indicator-font-size':
            `${settings.playedIndicatorFontSize}px`,
        '--mt-row-gap': `${settings.rowGap}px`,
        '--mt-library-card-gap': `${settings.libraryCardGap}px`,
        '--mt-library-virtual-gap': `${settings.libraryVirtualGap}px`,
        '--mt-banner-height-offset': `${settings.bannerHeightOffset}px`,
        '--mt-banner-content-shift': `${Math.max(0, Math.round(settings.bannerHeightOffset * 0.62))}px`,
        '--mt-banner-fsk-shift': `${Math.max(0, Math.round(settings.bannerHeightOffset * 0.70))}px`,
        '--mt-banner-nav-shift': `${Math.max(0, Math.round(settings.bannerHeightOffset * 0.78))}px`,
        '--mt-banner-overlay-offset': `${settings.bannerOverlayOffset}px`,
        '--mt-banner-fade-size': `${settings.bannerFadeSize}px`,
        '--mt-banner-fade-strength': `${settings.bannerFadeStrength}%`,
        '--mt-banner-fade-end-opacity': `${100 - settings.bannerFadeStrength}%`,
        '--mt-library-card-width': `${settings.libraryCardWidth}px`,
        '--mt-virtual-card-width':
            `${virtualConfig.homeCardWidth}px`,
        '--mt-virtual-home-gap':
            `${virtualConfig.homeGap}px`,
        '--mt-virtual-page-poster-width':
            `${virtualConfig.pagePosterWidth}px`,
        '--mt-virtual-page-landscape-width':
            `${virtualConfig.pageLandscapeWidth}px`,
        '--mt-virtual-page-gap':
            `${virtualConfig.pageGap}px`
    } as React.CSSProperties;

    return (
        <Page
            id='indexPage'
            className={[
                'mainAnimatedPage',
                'homePage',
                'minitigerHome',
                !settings.customHomeRowsEnabled && !activeVirtualLibrary
                    ? 'libraryPage allLibraryPage pageWithAbsoluteTabs withTabs minitigerVanillaRowsMode'
                    : ''
            ].filter(Boolean).join(' ')}
            isBackButtonEnabled={false}
            style={homeStyle}
            data-card-size={settings.cardSize}
            data-hover-enabled={settings.hoverEnabled}
            data-glow-enabled={settings.glowEnabled}
            data-show-audio={settings.showAudioFlags}
            data-show-fsk={settings.showFskBadges}
            data-show-played={settings.showPlayedIndicators}
            data-show-library-names={settings.showLibraryNames}
            data-side-row-titles={settings.sideRowTitlesEnabled}
            data-custom-home={settings.customHomeRowsEnabled}
        >
            {!activeVirtualLibrary && settings.bannerEnabled && (
                <MinitigerHero
                    autoRotateMs={
                        settings.bannerRotationSeconds * 1000
                    }
                    maxItems={settings.bannerItemLimit}
                    debugEnabled={settings.trailerDebugEnabled}
                    youtubeTrailersEnabled={settings.youtubeTrailersEnabled}
                    showNavigation={settings.bannerNavigationVisible}
                    showFsk={settings.bannerFskVisible}
                />
            )}

            <div className='minitigerHomeContent'>
                {activeVirtualLibrary ? (
                    <MinitigerVirtualLibraryPage
                        library={activeVirtualLibrary}
                        apiClient={apiClient}
                        isAdmin={isAdmin}
                        isAssigned={isVirtuallyAssigned}
                        onAssign={setAssignTarget}
                    />
                ) : !settings.customHomeRowsEnabled ? (
                    <MinitigerVanillaHomeSections />
                ) : (<>

                {settings.visibleSections.libraries
                    && librarySection}

                {settings.homeRowOrder.map(rowId => (
                    <React.Fragment key={rowId}>
                        {renderHomeRow(rowId)}
                    </React.Fragment>
                ))}

                <footer className='minitigerDevFooter'>
                    🐯 Minitiger Native · Phase 18.7.0
                </footer>
                </>)}
            </div>

            {settings.previewEnabled && (
                <MinitigerPreviewLayer
                    accentColor={settings.accentColor}
                    accentTextColor={
                        getContrastTextColor(
                            settings.accentColor
                        )
                    }
                />
            )}

            {settingsOpen && (
                <MinitigerSettingsPanel
                    settings={settings}
                    librarySettings={librarySettings}
                    detailSettings={detailSettings}
                    customConfig={customConfig}
                    libraries={libraries as ItemDto[]}
                    onUpdate={updateSettings}
                    onUpdateLibrarySettings={updateLibrarySettings}
                    onUpdateDetailSettings={updateDetailSettings}
                    onUpdateCustomRow={updateCustomRow}
                    onReplaceCustomConfig={replaceCustomConfig}
                    onToggleSection={toggleSection}
                    onMoveHomeRow={moveHomeRow}
                    onReorderHomeRows={reorderHomeRows}
                    onReset={resetSettings}
                    onResetLibrarySettings={resetLibrarySettings}
                    onResetDetailSettings={resetDetailSettings}
                    isAdmin={isAdmin}
                    virtualConfig={virtualConfig}
                    virtualSyncStatus={virtualSyncStatus}
                    virtualSyncMessage={virtualSyncMessage}
                    onUploadVirtualMedia={uploadVirtualMedia}
                    onRemoveVirtualMedia={removeVirtualMedia}
                    onPushVirtualConfigToServer={pushVirtualConfigToServer}
                    onAddVirtualLibrary={addVirtualLibrary}
                    onUpdateVirtualLibrary={updateVirtualLibrary}
                    onRemoveVirtualLibrary={removeVirtualLibrary}
                    onMoveVirtualLibrary={moveVirtualLibrary}
                    onReplaceVirtualConfig={replaceVirtualConfig}
                    onUpdateVirtualRowTitle={updateVirtualRowTitle}
                    onSetVirtualRowTitleVisible={setVirtualRowTitleVisible}
                    onToggleVirtualRow={toggleVirtualRow}
                    onSetVirtualHomeCardWidth={setVirtualHomeCardWidth}
                    onSetVirtualHomeGap={setVirtualHomeGap}
                    onSetVirtualPagePosterWidth={setVirtualPagePosterWidth}
                    onSetVirtualPageLandscapeWidth={setVirtualPageLandscapeWidth}
                    onSetVirtualPageGap={setVirtualPageGap}
                    onResetCustomRows={resetCustomRows}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {assignTarget && (
                <MinitigerVirtualAssignModal
                    item={assignTarget}
                    config={virtualConfig}
                    onSave={setItemMembership}
                    onClose={() => setAssignTarget(null)}
                />
            )}
        </Page>
    );
};

export default MinitigerHome;
