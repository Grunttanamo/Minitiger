import React from 'react';
import { useSearchParams } from 'react-router-dom';

import Page from 'components/Page';
import { useItem } from 'hooks/useItem';
import type { ItemDto } from 'types/base/models/item-dto';

import MinitigerEpisodeDetails from './details/MinitigerEpisodeDetails';
import MinitigerFolderDetails from './details/MinitigerFolderDetails';
import {
    MinitigerMangaVolumeDetails
} from './details/MinitigerMangaDetails';
import {
    MinitigerMusicAlbumDetails,
    MinitigerMusicArtistDetails,
    MinitigerMusicVideoDetails
} from './details/MinitigerMusicDetails';
import MinitigerPersonDetails from './details/MinitigerPersonDetails';
import MinitigerSeasonDetails from './details/MinitigerSeasonDetails';
import MinitigerVideoDetails from './details/MinitigerVideoDetails';

const MinitigerDetails = () => {
    const [ searchParams ] =
        useSearchParams();

    const itemId =
        searchParams.get('id')
        ?? undefined;

    const context =
        searchParams.get(
            'mtcontext'
        );

    const {
        data,
        isPending
    } = useItem(itemId);

    const item =
        data as
            ItemDto
            | undefined;

    if (isPending) {
        return (
            <Page
                id='minitigerDetailsDispatcher'
                className='mainAnimatedPage minitigerVideoDetailsPage'
                isBackButtonEnabled
            >
                <div className='minitigerDetailsLoading'>
                    Details werden geladen …
                </div>
            </Page>
        );
    }

    const type =
        String(
            item?.Type
            ?? ''
        ).toLowerCase();

    if (
        itemId
        && type === 'episode'
    ) {
        return (
            <MinitigerEpisodeDetails
                itemId={itemId}
            />
        );
    }

    if (
        itemId
        && type === 'season'
    ) {
        return (
            <MinitigerSeasonDetails
                itemId={itemId}
            />
        );
    }

    if (
        type === 'series'
        || type === 'movie'
    ) {
        return (
            <MinitigerVideoDetails />
        );
    }

    if (
        itemId
        && type === 'musicartist'
    ) {
        return (
            <MinitigerMusicArtistDetails
                itemId={itemId}
                videosOnly={
                    String(
                        context
                        ?? ''
                    ).toLowerCase()
                    === 'musicvideos'
                }
            />
        );
    }

    if (
        itemId
        && type === 'musicalbum'
    ) {
        return (
            <MinitigerMusicAlbumDetails
                itemId={itemId}
            />
        );
    }

    if (
        itemId
        && type === 'musicvideo'
    ) {
        return (
            <MinitigerMusicVideoDetails
                itemId={itemId}
            />
        );
    }

    if (
        itemId
        && type === 'person'
    ) {
        return (
            <MinitigerPersonDetails
                itemId={itemId}
            />
        );
    }

    if (
        itemId
        && type === 'book'
    ) {
        return (
            <MinitigerMangaVolumeDetails
                itemId={itemId}
            />
        );
    }

    if (
        itemId
        && (
            type === 'folder'
            || type === 'boxset'
        )
    ) {
        return (
            <MinitigerFolderDetails
                itemId={itemId}
                context={context}
            />
        );
    }

    return (
        <Page
            id='minitigerDetailsUnsupported'
            className='mainAnimatedPage minitigerVideoDetailsPage'
            isBackButtonEnabled
        >
            <div className='minitigerDetailsLoading'>
                Dieser Inhaltstyp besitzt noch keine Minitiger-Detailpage.
            </div>
        </Page>
    );
};

export default MinitigerDetails;
