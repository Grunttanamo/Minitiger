import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import { UseQueryResult } from '@tanstack/react-query';
import React, {
    type FC,
    type PropsWithChildren,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalStorage } from 'usehooks-ts';

import useCurrentTab from 'hooks/useCurrentTab';
import { useGetItemsViewByType } from 'hooks/useFetchItems';
import { ItemDtoQueryResult } from 'types/base/models/item-dto-query-result';
import { LibraryViewSettings } from 'types/library';
import { LibraryTab } from 'types/libraryTab';
import { LibraryTabContent } from 'types/libraryTabContent';

import { LibraryRoutes } from '../constants/libraryRoutes';
import { isLibraryPath } from '../utils/path';
import { getDefaultLibraryViewSettings, getSettingsKey } from '../utils/settings';
import { getViewContent } from '../utils/viewContent';

interface LibraryState {
    collectionType?: CollectionType;
    content?: LibraryTabContent;
    isLibraryPath: boolean;
    id?: string;
    itemsResult?: UseQueryResult<ItemDtoQueryResult | undefined, Error>;
    viewSettings?: LibraryViewSettings;
    setViewSettings?: React.Dispatch<React.SetStateAction<LibraryViewSettings>>;
    isProgressiveAll?: boolean;
    hasMoreItems?: boolean;
    loadMoreItems?: () => void;
}

const DEFAULT_LIBRARY_STATE: LibraryState = {
    isLibraryPath: false
};

export const LibraryContext = createContext<LibraryState>(DEFAULT_LIBRARY_STATE);
export const useLibrary = () => useContext(LibraryContext);

export const LibraryProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
    const { pathname } = useLocation();
    const { libraryId, activeTab, settingsKey } = useCurrentTab();

    const route = useMemo(() => LibraryRoutes.find(({ path }) => path === pathname), [pathname]);
    const collectionType = route?.type;
    const isLibPath = isLibraryPath(pathname);
    const id = libraryId ?? undefined;

    const content = useMemo(() => collectionType && getViewContent(collectionType, activeTab), [collectionType, activeTab]);
    const viewType = content?.viewType;

    // Local storage requires the view type to be known upfront so default to movies if unknown
    const settingsViewType = viewType ?? LibraryTab.Movies;
    const [viewSettings, setViewSettings] = useLocalStorage<LibraryViewSettings>(
        getSettingsKey(settingsViewType, settingsKey),
        getDefaultLibraryViewSettings(settingsViewType)
    );

    const [ progressiveLimit, setProgressiveLimit ] =
        useState(200);

    const progressiveResetKey = JSON.stringify({
        libraryId,
        viewType,
        alphabet: viewSettings.Alphabet ?? null,
        sortBy: viewSettings.SortBy,
        sortOrder: viewSettings.SortOrder,
        filters: viewSettings.Filters
    });

    useEffect(() => {
        setProgressiveLimit(200);
    }, [progressiveResetKey]);

    const isProgressiveAll =
        isLibPath
        && !viewSettings.Alphabet;

    const queryViewSettings = useMemo(
        () => isProgressiveAll
            ? {
                ...viewSettings,
                StartIndex: 0
            }
            : viewSettings,
        [
            isProgressiveAll,
            viewSettings
        ]
    );

    const itemsResult = useGetItemsViewByType(
        viewType,
        libraryId,
        content?.itemType,
        queryViewSettings,
        isProgressiveAll
            ? progressiveLimit
            : undefined
    );

    const loadedItems =
        itemsResult.data?.Items?.length
        ?? 0;

    const totalItems =
        itemsResult.data?.TotalRecordCount;

    const hasMoreItems = Boolean(
        isProgressiveAll
        && (
            typeof totalItems === 'number'
                ? loadedItems < totalItems
                : loadedItems >= progressiveLimit
        )
    );

    const loadMoreItems = useCallback(() => {
        setProgressiveLimit(current =>
            current + 100
        );
    }, []);

    const state = useMemo(() => ({
        ...DEFAULT_LIBRARY_STATE,
        collectionType,
        isLibraryPath: isLibPath,
        id,
        content,
        viewSettings,
        setViewSettings,
        itemsResult,
        isProgressiveAll,
        hasMoreItems,
        loadMoreItems
    }), [
        collectionType,
        isLibPath,
        id,
        content,
        viewSettings,
        setViewSettings,
        itemsResult,
        isProgressiveAll,
        hasMoreItems,
        loadMoreItems
    ]);

    return (
        <LibraryContext.Provider value={state}>
            {children}
        </LibraryContext.Provider>
    );
};

// MINITIGER_PATCH_MARKER: PHASE_18_24_0_TEST_UI_PREVIEW_PAGING

// MINITIGER_PATCH_MARKER: PHASE_18_24_1_TEST_POLISH_ROW_CONFIGS
