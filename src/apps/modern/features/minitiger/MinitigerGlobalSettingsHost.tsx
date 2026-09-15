import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import 'apps/modern/routes/minitiger/home/MinitigerHome.scss';
import MinitigerSettingsPanel from 'apps/modern/routes/minitiger/home/components/MinitigerSettingsPanel';
import useMinitigerCustomRows from 'apps/modern/routes/minitiger/home/hooks/useMinitigerCustomRows';
import useMinitigerDetailSettings from 'apps/modern/routes/minitiger/home/hooks/useMinitigerDetailSettings';
import useMinitigerHomeSettings from 'apps/modern/routes/minitiger/home/hooks/useMinitigerHomeSettings';
import useMinitigerLibrarySettings from 'apps/modern/routes/minitiger/home/hooks/useMinitigerLibrarySettings';
import useMinitigerThemeVariables from 'apps/modern/routes/minitiger/home/hooks/useMinitigerThemeVariables';
import useMinitigerVirtualLibraries from 'apps/modern/routes/minitiger/home/hooks/useMinitigerVirtualLibraries';
import { useUserViews } from 'hooks/api/useUserViews';
import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const MinitigerGlobalSettingsHost = () => {
    const location = useLocation();
    const [ open, setOpen ] = useState(false);

    const {
        user
    } = useApi();

    const isAdmin = Boolean(
        user?.Policy?.IsAdministrator
    );

    const {
        settings,
        updateSettings,
        toggleSection,
        moveHomeRow,
        reorderHomeRows,
        resetSettings
    } = useMinitigerHomeSettings();

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

    const {
        config: customConfig,
        updateRow: updateCustomRow,
        replaceConfig: replaceCustomConfig,
        resetCustomRows
    } = useMinitigerCustomRows();

    const {
        config: virtualConfig,
        addLibrary: addVirtualLibrary,
        updateLibrary: updateVirtualLibrary,
        removeLibrary: removeVirtualLibrary,
        updateRowTitle: updateVirtualRowTitle,
        setRowTitleVisible: setVirtualRowTitleVisible,
        toggleRow: toggleVirtualRow,
        setHomeCardWidth: setVirtualHomeCardWidth,
        moveLibrary: moveVirtualLibrary,
        replaceConfig: replaceVirtualConfig
    } = useMinitigerVirtualLibraries();

    const {
        data: userViewsData
    } = useUserViews({
        userId: user?.Id
    });

    useMinitigerThemeVariables(settings);

    useEffect(() => {
        const onOpen = () => {
            /*
             * /home owns its settings panel already, so let that instance
             * open there. Everywhere else this global host keeps the current
             * route mounted underneath the overlay.
             */
            if (location.pathname === '/home') {
                return;
            }

            setOpen(true);
        };

        window.addEventListener(
            'minitiger:open-settings',
            onOpen
        );

        return () => {
            window.removeEventListener(
                'minitiger:open-settings',
                onOpen
            );
        };
    }, [location.pathname]);

    if (!open) {
        return null;
    }

    return (
        <MinitigerSettingsPanel
            settings={settings}
            librarySettings={librarySettings}
            detailSettings={detailSettings}
            customConfig={customConfig}
            libraries={
                (userViewsData?.Items ?? []) as ItemDto[]
            }
            onUpdate={updateSettings}
            onUpdateLibrarySettings={
                updateLibrarySettings
            }
            onUpdateDetailSettings={
                updateDetailSettings
            }
            onUpdateCustomRow={updateCustomRow}
            onReplaceCustomConfig={replaceCustomConfig}
            onToggleSection={toggleSection}
            onMoveHomeRow={moveHomeRow}
            onReorderHomeRows={reorderHomeRows}
            onReset={resetSettings}
            onResetLibrarySettings={
                resetLibrarySettings
            }
            onResetDetailSettings={
                resetDetailSettings
            }
            isAdmin={isAdmin}
            virtualConfig={virtualConfig}
            onAddVirtualLibrary={addVirtualLibrary}
            onUpdateVirtualLibrary={
                updateVirtualLibrary
            }
            onRemoveVirtualLibrary={
                removeVirtualLibrary
            }
            onMoveVirtualLibrary={moveVirtualLibrary}
            onReplaceVirtualConfig={
                replaceVirtualConfig
            }
            onUpdateVirtualRowTitle={
                updateVirtualRowTitle
            }
            onSetVirtualRowTitleVisible={
                setVirtualRowTitleVisible
            }
            onToggleVirtualRow={toggleVirtualRow}
            onSetVirtualHomeCardWidth={
                setVirtualHomeCardWidth
            }
            onResetCustomRows={resetCustomRows}
            onClose={() => setOpen(false)}
        />
    );
};

export default MinitigerGlobalSettingsHost;
