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
) => normalizeJellyfinRoute(
    appRouter.getRouteUrl(item, options)
);
