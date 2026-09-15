import type { ItemDto } from 'types/base/models/item-dto';

interface MinitigerEpisodeAvailabilityFields {
    LocationType?: string | null;
    IsVirtualItem?: boolean | null;
}

export const isMinitigerAvailableEpisode = (
    item: ItemDto
) => {
    const extended = item as ItemDto & MinitigerEpisodeAvailabilityFields;
    const locationType = String(
        extended.LocationType ?? ''
    ).toLowerCase();

    return (
        locationType !== 'virtual'
        && !extended.IsVirtualItem
    );
};

export const getMinitigerEpisodeCode = (
    item: ItemDto
) => {
    const season = item.ParentIndexNumber;
    const episode = item.IndexNumber;

    if (season != null && episode != null) {
        return `S${season}:E${episode}`;
    }

    if (episode != null) {
        return `E${episode}`;
    }

    return '';
};
