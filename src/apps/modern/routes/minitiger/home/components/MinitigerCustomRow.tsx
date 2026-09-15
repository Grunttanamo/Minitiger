import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from 'jellyfin-apiclient';
import React, { useMemo } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import type {
    MinitigerCustomRow
} from '../config/customRows';
import MinitigerMediaRow from './MinitigerMediaRow';

interface MinitigerCustomRowProps {
    row: MinitigerCustomRow;
    libraries: ItemDto[];
    apiClient?: ApiClient;
    loadAudioFlags?: boolean;
    showFskBadges?: boolean;
    showPlayedIndicators?: boolean;
    showVirtualAssign?: boolean;
    isVirtuallyAssigned?: (
        itemId?: string | null
    ) => boolean;
    onVirtualAssign?: (item: ItemDto) => void;
}

interface ItemQueryResult {
    Items?: ItemDto[];
}

const getLibraryById = (
    libraries: ItemDto[],
    id: string
) => libraries.find(library => library.Id === id);

const getItemTypes = (
    collectionType: string,
    latestTitles: boolean
) => {
    switch (collectionType.toLowerCase()) {
        case 'tvshows':
            return latestTitles
                ? 'Series'
                : 'Episode';
        case 'movies':
            return 'Movie';
        case 'music':
            return latestTitles
                ? 'MusicAlbum'
                : 'Audio';
        case 'books':
            return latestTitles
                ? 'Folder,BoxSet'
                : 'Book';
        case 'musicvideos':
        case 'homevideos':
            return 'MusicVideo';
        default:
            return latestTitles
                ? 'Series,Movie,MusicAlbum,Folder,BoxSet,MusicVideo'
                : 'Episode,Movie,Audio,Book,MusicVideo';
    }
};

const fetchLibraryPart = async (
    apiClient: ApiClient,
    userId: string,
    library: ItemDto,
    row: MinitigerCustomRow
): Promise<ItemDto[]> => {
    if (!library.Id) {
        return [];
    }

    const latestTitles =
        row.sortMode === 'latestTitles';

    const collectionType =
        String(library.CollectionType ?? '');

    const itemTypes = getItemTypes(
        collectionType,
        latestTitles
    );

    const wantsEpisodes =
        itemTypes.split(',').includes('Episode');

    const isMangaTitles =
        latestTitles
        && collectionType.toLowerCase() === 'books';

    const queryLimit = wantsEpisodes
        ? Math.min(
            200,
            Math.max(
                row.count * 4,
                row.count + 20
            )
        )
        : Math.max(row.count, 12);

    const url = apiClient.getUrl(
        `Users/${userId}/Items`,
        {
            ParentId: library.Id,
            Recursive: !isMangaTitles,
            IncludeItemTypes: itemTypes,
            ExcludeLocationTypes:
                wantsEpisodes
                    ? 'Virtual'
                    : undefined,
            Fields:
                'PrimaryImageAspectRatio,DateCreated,Overview,MediaStreams,MediaSources',
            EnableImageTypes:
                'Primary,Thumb,Backdrop',
            SortBy: 'DateCreated',
            SortOrder: 'Descending',
            Limit: queryLimit,
            EnableTotalRecordCount: false
        }
    );

    const result = await apiClient.getJSON(
        url
    ) as ItemQueryResult;

    const now = Date.now();

    return (result.Items ?? []).filter(item => {
        if (!wantsEpisodes || !item.PremiereDate) {
            return true;
        }

        const timestamp =
            Date.parse(item.PremiereDate);

        return !Number.isFinite(timestamp)
            || timestamp <= now;
    });
};

const byDateCreatedDesc = (
    left: ItemDto,
    right: ItemDto
) => {
    const leftValue = Date.parse(
        left.DateCreated ?? ''
    ) || 0;

    const rightValue = Date.parse(
        right.DateCreated ?? ''
    ) || 0;

    return rightValue - leftValue;
};

const uniqueById = (
    items: ItemDto[]
) => {
    const seen = new Set<string>();

    return items.filter(item => {
        const key = item.Id
            ?? `${item.Type ?? ''}:${item.Name ?? ''}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const MinitigerCustomRow = ({
    row,
    libraries,
    apiClient,
    loadAudioFlags = false,
    showFskBadges = true,
    showPlayedIndicators = true,
    showVirtualAssign = false,
    isVirtuallyAssigned,
    onVirtualAssign
}: MinitigerCustomRowProps) => {
    const userId =
        apiClient?.getCurrentUserId() ?? '';

    const firstLibrary = getLibraryById(
        libraries,
        row.library1
    );

    const secondLibrary = getLibraryById(
        libraries,
        row.library2
    );

    const firstEnabled = Boolean(
        apiClient
        && userId
        && firstLibrary?.Id
    );

    const secondEnabled = Boolean(
        apiClient
        && userId
        && secondLibrary?.Id
        && secondLibrary?.Id !== firstLibrary?.Id
    );

    const firstQuery = useQuery({
        queryKey: [
            'Minitiger',
            'CustomRow',
            row.key,
            'library1',
            firstLibrary?.Id ?? '',
            row.sortMode,
            row.count
        ],
        queryFn: () => fetchLibraryPart(
            apiClient!,
            userId,
            firstLibrary!,
            row
        ),
        enabled: firstEnabled
    });

    const secondQuery = useQuery({
        queryKey: [
            'Minitiger',
            'CustomRow',
            row.key,
            'library2',
            secondLibrary?.Id ?? '',
            row.sortMode,
            row.count
        ],
        queryFn: () => fetchLibraryPart(
            apiClient!,
            userId,
            secondLibrary!,
            row
        ),
        enabled: secondEnabled
    });

    const items = useMemo(
        () => uniqueById([
            ...(firstQuery.data ?? []),
            ...(secondQuery.data ?? [])
        ])
            .sort(byDateCreatedDesc)
            .slice(0, row.count),
        [
            firstQuery.data,
            row.count,
            secondQuery.data
        ]
    );

    if (!row.library1 && !row.library2) {
        return null;
    }

    const primaryCollectionType = String(
        firstLibrary?.CollectionType
        ?? secondLibrary?.CollectionType
        ?? ''
    ).toLowerCase();

    const effectiveDisplay:
        'poster' | 'landscape' | 'square' =
        primaryCollectionType === 'music'
            ? 'square'
            : primaryCollectionType === 'musicvideos'
                ? 'landscape'
                : row.display;

    return (
        <MinitigerMediaRow
            title={row.title}
            items={items}
            apiClient={apiClient}
            pending={
                (
                    firstEnabled
                    && firstQuery.isPending
                )
                || (
                    secondEnabled
                    && secondQuery.isPending
                )
            }
            error={
                (
                    firstEnabled
                    && firstQuery.isError
                )
                || (
                    secondEnabled
                    && secondQuery.isError
                )
            }
            variant={effectiveDisplay}
            preferParentLandscape={
                effectiveDisplay === 'landscape'
            }
            loadAudioFlags={loadAudioFlags}
            showFskBadges={showFskBadges}
            showPlayedIndicators={showPlayedIndicators}
            showVirtualAssign={showVirtualAssign}
            isVirtuallyAssigned={
                isVirtuallyAssigned
            }
            onVirtualAssign={
                onVirtualAssign
            }
            previewContext={primaryCollectionType}
            emptyText='Für diese Custom-Reihe wurden noch keine passenden Inhalte gefunden.'
        />
    );
};

export default MinitigerCustomRow;
