import type { Api } from '@jellyfin/sdk';
import type { PluginApiGetConfigurationPagesRequest } from '@jellyfin/sdk/lib/generated-client/api/plugin-api';
import type { ConfigurationPageInfo } from '@jellyfin/sdk/lib/generated-client/models/configuration-page-info';
import { getPluginApi } from '@jellyfin/sdk/lib/utils/api/plugin-api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useApi } from 'hooks/useApi';

import { QueryKey } from './queryKey';

const normalizeConfigurationPages = (
    value: unknown
): ConfigurationPageInfo[] => {
    if (Array.isArray(value)) {
        return value as ConfigurationPageInfo[];
    }

    if (value && typeof value === 'object') {
        const wrapped = value as {
            Items?: unknown;
            items?: unknown;
        };
        const items = wrapped.Items ?? wrapped.items;

        if (Array.isArray(items)) {
            return items as ConfigurationPageInfo[];
        }
    }

    console.warn(
        '[Plugin configuration pages] Unexpected response shape; using an empty list instead.',
        {
            responseType: value === null ? 'null' : typeof value
        }
    );

    return [];
};

const fetchConfigurationPages = async (
    api: Api,
    params?: PluginApiGetConfigurationPagesRequest,
    options?: AxiosRequestConfig
) => {
    const response = await getPluginApi(api)
        .getConfigurationPages(params, options);

    return normalizeConfigurationPages(
        response.data as unknown
    );
};

const getConfigurationPagesQuery = (
    api?: Api,
    params?: PluginApiGetConfigurationPagesRequest
) => queryOptions({
    queryKey: [ QueryKey.ConfigurationPages, params?.enableInMainMenu ],
    queryFn: ({ signal }) => fetchConfigurationPages(api!, params, { signal }),
    enabled: !!api
});

export const useConfigurationPages = (
    params?: PluginApiGetConfigurationPagesRequest
) => {
    const { api } = useApi();
    return useQuery(getConfigurationPagesQuery(api, params));
};
