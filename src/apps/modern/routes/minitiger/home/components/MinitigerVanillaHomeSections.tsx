import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EventType } from 'constants/eventType';
import Events from 'utils/events';
import layoutManager from 'components/layoutManager';
import { clearBackdrop } from 'components/backdrop/backdrop';
import globalize from 'lib/globalize';

import '../../../../../../elements/emby-tabs/emby-tabs';
import '../../../../../../elements/emby-button/emby-button';
import '../../../../../../elements/emby-scroller/emby-scroller';

type OnResumeOptions = {
    autoFocus?: boolean;
    refresh?: boolean;
};

type ControllerProps = {
    onResume: (options: OnResumeOptions) => void;
    refreshed: boolean;
    onPause: () => void;
    destroy: () => void;
};

/** Jellyfin 12.1 vanilla home rows embedded below the optional Minitiger banner. */
const MinitigerVanillaHomeSections = () => {
    const [ searchParams ] = useSearchParams();
    const initialTabIndex = parseInt(searchParams.get('tab') ?? '0', 10);
    const libraryMenu = useMemo(async () => (
        (await import('../../../../../../scripts/libraryMenu')).default
    ), []);
    const mainTabsManager = useMemo(
        () => import('../../../../../../components/maintabsmanager'),
        []
    );
    const tabController = useRef<ControllerProps | null>();
    const tabControllers = useMemo<ControllerProps[]>(() => [], []);
    const documentRef = useRef<Document>(document);
    const element = useRef<HTMLDivElement>(null);

    const getTabs = () => [
        { name: globalize.translate('Home') },
        { name: globalize.translate('Favorites') }
    ];

    const getTabContainers = () =>
        element.current?.querySelectorAll('.tabContent');

    const getTabController = useCallback((index: number) => {
        if (index == null) throw new Error('index cannot be null');
        const depends = index === 0 ? 'hometab' : 'favorites';

        return import(
            /* webpackChunkName: "[request]" */
            `../../../../../legacy/controllers/${depends}`
        ).then(({ default: ControllerFactory }) => {
            let controller = tabControllers[index];
            if (!controller) {
                const tabContent = element.current?.querySelector(
                    `.tabContent[data-index='${index}']`
                );
                controller = new ControllerFactory(tabContent, null);
                tabControllers[index] = controller;
            }
            return controller;
        });
    }, [tabControllers]);

    const loadTab = useCallback((index: number, previousIndex: number | null) => {
        getTabController(index).then(controller => {
            controller.onResume({
                autoFocus: previousIndex == null && layoutManager.tv,
                refresh: !controller.refreshed
            });
            controller.refreshed = true;
            tabController.current = controller;
        }).catch(err => console.error('[Minitiger Vanilla Home] tab controller failed', err));
    }, [getTabController]);

    const onTabChange = useCallback((e: { detail: { selectedTabIndex: string; previousIndex: number | null } }) => {
        const newIndex = parseInt(e.detail.selectedTabIndex, 10);
        const previousIndex = e.detail.previousIndex;
        const previous = previousIndex == null ? null : tabControllers[previousIndex];
        previous?.onPause?.();
        loadTab(newIndex, previousIndex);
    }, [loadTab, tabControllers]);

    const renderHome = useCallback(async () => {
        (await libraryMenu).setTitle(null);
        clearBackdrop();
        (await mainTabsManager).setTabs(
            element.current,
            initialTabIndex,
            getTabs,
            getTabContainers,
            null,
            onTabChange,
            false
        );

        const current = tabController.current;
        if (!current) {
            (await mainTabsManager).selectedTabIndex(initialTabIndex);
        } else {
            current.onResume?.({});
        }
        documentRef.current.querySelector('.skinHeader')?.classList.add('noHomeButtonHeader');
    }, [initialTabIndex, libraryMenu, mainTabsManager, onTabChange]);

    useEffect(() => {
        if (documentRef.current?.querySelector('.headerTabs')) void renderHome();
        const doc = documentRef.current;
        if (doc) Events.on(doc, EventType.HEADER_RENDERED, renderHome);

        return () => {
            tabController.current?.onPause?.();
            if (doc) Events.off(doc, EventType.HEADER_RENDERED, renderHome);
            doc?.querySelector('.skinHeader')?.classList.remove('noHomeButtonHeader');
        };
    }, [renderHome]);

    return (
        <div ref={element} className='minitigerVanillaHomeHost'>
            <div className='tabContent pageTabContent' id='homeTab' data-index='0'>
                <div className='sections' />
            </div>
            <div className='tabContent pageTabContent' id='favoritesTab' data-index='1'>
                <div className='sections' />
            </div>
        </div>
    );
};

export default MinitigerVanillaHomeSections;
