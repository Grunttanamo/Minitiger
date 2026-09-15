import { useQuery } from '@tanstack/react-query';
import React from 'react';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import {
    MinitigerMangaSeriesDetails
} from './MinitigerMangaDetails';
import {
    MinitigerMusicVideoCollectionDetails
} from './MinitigerMusicDetails';

interface Props {
    itemId: string;
    context?: string | null;
}

const MinitigerFolderDetails = ({
    itemId,
    context
}: Props) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const {
        data,
        isPending
    } = useItem(itemId);

    const item =
        data as
            ItemDto
            | undefined;

    const userId =
        apiClient?.getCurrentUserId()
        ?? '';

    const probe = useQuery({
        queryKey: [
            'Minitiger',
            'FolderProbe',
            itemId
        ],
        queryFn: async () => {
            if (
                !apiClient
                || !userId
            ) {
                return [] as ItemDto[];
            }

            const result =
                await apiClient.getItems(
                    userId,
                    {
                        ParentId:
                            itemId,
                        Recursive: true,
                        IncludeItemTypes:
                            'Book,MusicVideo,Video',
                        Limit: 4,
                        EnableTotalRecordCount:
                            false
                    }
                );

            return (
                result?.Items
                ?? []
            ) as ItemDto[];
        },
        enabled: Boolean(
            apiClient
            && userId
            && itemId
        ),
        staleTime:
            10 * 60_000
    });

    const normalizedContext =
        String(
            context
            ?? ''
        ).toLowerCase();

    const childTypes =
        new Set(
            (
                probe.data
                ?? []
            ).map(
                child =>
                    String(
                        child.Type
                        ?? ''
                    ).toLowerCase()
            )
        );

    if (
        normalizedContext
        === 'books'
        || childTypes.has(
            'book'
        )
    ) {
        return (
            <MinitigerMangaSeriesDetails
                itemId={itemId}
            />
        );
    }

    if (
        normalizedContext
        === 'musicvideos'
        || childTypes.has(
            'musicvideo'
        )
        || (
            childTypes.has(
                'video'
            )
            && normalizedContext
                === 'musicvideos'
        )
    ) {
        return (
            <MinitigerMusicVideoCollectionDetails
                itemId={itemId}
            />
        );
    }

    if (
        isPending
        || probe.isPending
    ) {
        return (
            <Page
                id='minitigerFolderLoading'
                className='mainAnimatedPage'
                isBackButtonEnabled
            >
                <div className='minitigerDetailsLoading'>
                    Ordner wird geladen …
                </div>
            </Page>
        );
    }

    return (
        <Page
            id='minitigerFolderFallback'
            className='mainAnimatedPage'
            isBackButtonEnabled
        >
            <div className='minitigerDetailsLoading'>
                Für „{
                    item?.Name
                    ?? 'diesen Ordner'
                }“ ist noch keine spezielle Minitiger-Detailpage hinterlegt.
            </div>
        </Page>
    );
};

export default MinitigerFolderDetails;
