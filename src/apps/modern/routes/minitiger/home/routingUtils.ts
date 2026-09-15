import { appRouter } from 'components/router/appRouter';
import type { ItemDto } from 'types/base/models/item-dto';

export const normalizeJellyfinRoute = (route: string) => {
    if (route.startsWith('#')) {
        return route.substring(1);
    }

    return route;
};

export const getItemRoute = (
    item: ItemDto,
    options?: Record<string, unknown>
) => {
    const type =
        String(item.Type ?? '').toLowerCase();

    if (
        item.Id
        && (
            type === 'series'
            || type === 'movie'
            || type === 'season'
            || type === 'episode'
            || type === 'musicartist'
            || type === 'musicalbum'
            || type === 'musicvideo'
            || type === 'book'
            || type === 'folder'
            || type === 'boxset'
        )
    ) {
        return `/minitigerdetails?id=${
            encodeURIComponent(item.Id)
        }`;
    }

    return normalizeJellyfinRoute(
        appRouter.getRouteUrl(item, options)
    );
};
