import { useQuery } from '@tanstack/react-query';
import type { ApiClient } from 'jellyfin-apiclient';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const PLAYLIST_NAMES = [
    'Minitiger Banner',
    'Tanamo Banner'
];

interface MinitigerBannerPlaylistData {
    items: ItemDto[];
    playlistId?: string;
    playlistName?: string;
}

const fetchBannerPlaylist = async (
    apiClient: ApiClient
): Promise<MinitigerBannerPlaylistData> => {
    const userId = apiClient.getCurrentUserId();

    if (!userId) {
        return { items: [] };
    }

    const playlistResult = await apiClient.getItems(userId, {
        Recursive: true,
        IncludeItemTypes: 'Playlist',
        Fields: 'DateCreated,PrimaryImageAspectRatio',
        ImageTypeLimit: 1,
        EnableImageTypes: 'Primary,Backdrop,Logo,Thumb',
        EnableTotalRecordCount: false,
        Limit: 250
    });

    const playlists = (playlistResult?.Items ?? []) as ItemDto[];

    const playlist = PLAYLIST_NAMES
        .map(name => playlists.find(item =>
            item.Name?.localeCompare(
                name,
                undefined,
                { sensitivity: 'base' }
            ) === 0
        ))
        .find(Boolean);

    if (!playlist?.Id) {
        return { items: [] };
    }

    const query = {
        Fields: [
            'Overview',
            'DateCreated',
            'PrimaryImageAspectRatio',
            'MediaSourceCount'
        ].join(','),
        EnableImageTypes: 'Primary,Backdrop,Logo,Thumb',
        ImageTypeLimit: 3,
        EnableTotalRecordCount: false,
        UserId: userId
    };

    const result = await apiClient.getJSON(
        apiClient.getUrl(
            `Playlists/${playlist.Id}/Items`,
            query
        )
    );

    return {
        items: (result?.Items ?? []) as ItemDto[],
        playlistId: playlist.Id,
        playlistName: playlist.Name ?? undefined
    };
};

export const useMinitigerBannerItems = () => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const userId = apiClient?.getCurrentUserId();
    const serverId = apiClient?.serverId();

    return useQuery({
        queryKey: [
            'Minitiger',
            'BannerPlaylist',
            serverId,
            userId
        ],
        queryFn: () => fetchBannerPlaylist(apiClient!),
        enabled: Boolean(apiClient && userId),
        staleTime: 60_000,
        refetchOnWindowFocus: false
    });
};
