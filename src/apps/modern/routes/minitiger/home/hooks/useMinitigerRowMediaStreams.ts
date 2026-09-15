import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useApi } from 'hooks/useApi';
import type { ItemDto } from 'types/base/models/item-dto';

const CHUNK_SIZE = 45;
const SAMPLE_CONCURRENCY = 5;
const SAMPLE_CACHE_TTL =
    30 * 60_000;

interface SampleCacheEntry {
    expires: number;
    item: ItemDto | null;
}

interface SampleRef {
    key: string;
    kind: 'series' | 'season';
    id: string;
}

const sampleCache =
    new Map<string, SampleCacheEntry>();

const chunk = <T,>(
    values: T[],
    size: number
) => {
    const result: T[][] = [];

    for (
        let index = 0;
        index < values.length;
        index += size
    ) {
        result.push(
            values.slice(
                index,
                index + size
            )
        );
    }

    return result;
};

const runWithConcurrency =
    async <T, R>(
        values: T[],
        concurrency: number,
        worker: (
            value: T
        ) => Promise<R>
    ) => {
        const result: R[] = [];
        let cursor = 0;

        const runner = async () => {
            while (
                cursor < values.length
            ) {
                const index = cursor;
                cursor += 1;

                result[index] =
                    await worker(
                        values[index]
                    );
            }
        };

        await Promise.all(
            Array.from(
                {
                    length: Math.min(
                        concurrency,
                        values.length
                    )
                },
                () => runner()
            )
        );

        return result;
    };

const hasAudioMetadata = (
    item?: ItemDto | null
) => {
    if (!item) {
        return false;
    }

    if (
        item.MediaStreams?.some(
            stream =>
                String(
                    stream.Type ?? ''
                ).toLowerCase()
                === 'audio'
        )
    ) {
        return true;
    }

    return (
        item.MediaSources
        ?? []
    ).some(source =>
        source.MediaStreams?.some(
            stream =>
                String(
                    stream.Type ?? ''
                ).toLowerCase()
                === 'audio'
        )
    );
};

const getSeriesId = (
    item: ItemDto
) => {
    const type =
        String(
            item.Type ?? ''
        ).toLowerCase();

    if (
        type === 'series'
    ) {
        return item.Id ?? null;
    }

    return item.SeriesId ?? null;
};

const getSampleRef = (
    item: ItemDto
): SampleRef | null => {
    const type =
        String(
            item.Type ?? ''
        ).toLowerCase();

    /*
     * Important:
     * Series poster -> first episode of series.
     * Season poster -> first episode of THAT season.
     */
    if (
        type === 'series'
        && item.Id
    ) {
        return {
            key: `series:${item.Id}`,
            kind: 'series',
            id: item.Id
        };
    }

    if (
        type === 'season'
        && item.Id
    ) {
        return {
            key: `season:${item.Id}`,
            kind: 'season',
            id: item.Id
        };
    }

    return null;
};

const useMinitigerRowMediaStreams = (
    items: ItemDto[],
    enabled: boolean
) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const signature = useMemo(
        () => items
            .map(item => [
                item.Id ?? '',
                item.SeriesId ?? '',
                item.SeasonId ?? '',
                item.Type ?? '',
                item.OfficialRating ?? '',
                item.MediaStreams?.length
                ?? 0,
                item.MediaSources?.length
                ?? 0
            ].join(':'))
            .join('|'),
        [items]
    );

    const userId =
        apiClient?.getCurrentUserId()
        ?? '';

    const query = useQuery({
        queryKey: [
            'Minitiger',
            'CardMetadataV3',
            apiClient?.serverId()
            ?? '',
            signature
        ],
        queryFn: async () => {
            if (
                !apiClient
                || !userId
                || items.length === 0
            ) {
                return new Map<
                    string,
                    ItemDto
                >();
            }

            const itemIds =
                Array.from(
                    new Set(
                        items
                            .map(
                                item =>
                                    item.Id
                            )
                            .filter(
                                (
                                    id
                                ): id is string =>
                                    Boolean(id)
                            )
                    )
                );

            const seriesIds =
                Array.from(
                    new Set(
                        items
                            .map(
                                getSeriesId
                            )
                            .filter(
                                (
                                    id
                                ): id is string =>
                                    Boolean(id)
                            )
                    )
                );

            const detailIds =
                Array.from(
                    new Set([
                        ...itemIds,
                        ...seriesIds
                    ])
                );

            const detailResults =
                await Promise.all(
                    chunk(
                        detailIds,
                        CHUNK_SIZE
                    ).map(ids =>
                        apiClient.getItems(
                            userId,
                            {
                                Ids:
                                    ids.join(','),
                                Fields:
                                    'MediaStreams,MediaSources',
                                EnableTotalRecordCount:
                                    false,
                                Limit:
                                    ids.length
                            }
                        )
                    )
                );

            const exactMap =
                new Map<
                    string,
                    ItemDto
                >();

            detailResults
                .flatMap(
                    result =>
                        (
                            result?.Items
                            ?? []
                        ) as ItemDto[]
                )
                .forEach(item => {
                    if (item.Id) {
                        exactMap.set(
                            item.Id,
                            item
                        );
                    }
                });

            const sampleRefs =
                Array.from(
                    new Map(
                        items
                            .map(
                                getSampleRef
                            )
                            .filter(
                                (
                                    ref
                                ): ref is SampleRef =>
                                    Boolean(ref)
                            )
                            .filter(ref => {
                                const exact =
                                    exactMap.get(
                                        ref.id
                                    );

                                return !hasAudioMetadata(
                                    exact
                                );
                            })
                            .map(
                                ref => [
                                    ref.key,
                                    ref
                                ]
                            )
                    ).values()
                );

            const samples =
                await runWithConcurrency(
                    sampleRefs,
                    SAMPLE_CONCURRENCY,
                    async ref => {
                        const cached =
                            sampleCache.get(
                                ref.key
                            );

                        if (
                            cached
                            && cached.expires
                                > Date.now()
                        ) {
                            return [
                                ref.key,
                                cached.item
                            ] as const;
                        }

                        try {
                            const queryOptions =
                                ref.kind
                                === 'season'
                                    ? {
                                        ParentId:
                                            ref.id,
                                        Recursive:
                                            false,
                                        IncludeItemTypes:
                                            'Episode',
                                        Fields:
                                            'MediaStreams,MediaSources',
                                        SortBy:
                                            'IndexNumber',
                                        SortOrder:
                                            'Ascending',
                                        EnableTotalRecordCount:
                                            false,
                                        Limit: 1
                                    }
                                    : {
                                        ParentId:
                                            ref.id,
                                        Recursive:
                                            true,
                                        IncludeItemTypes:
                                            'Episode',
                                        Fields:
                                            'MediaStreams,MediaSources',
                                        SortBy:
                                            'ParentIndexNumber,IndexNumber',
                                        SortOrder:
                                            'Ascending',
                                        EnableTotalRecordCount:
                                            false,
                                        Limit: 1
                                    };

                            const result =
                                await apiClient.getItems(
                                    userId,
                                    queryOptions
                                );

                            const sample =
                                (
                                    result?.Items?.[0]
                                    ?? null
                                ) as
                                    ItemDto
                                    | null;

                            sampleCache.set(
                                ref.key,
                                {
                                    expires:
                                        Date.now()
                                        + SAMPLE_CACHE_TTL,
                                    item:
                                        sample
                                }
                            );

                            return [
                                ref.key,
                                sample
                            ] as const;
                        } catch (error) {
                            console.warn(
                                '[Minitiger Metadata] Audio-Referenz konnte nicht ermittelt werden',
                                ref,
                                error
                            );

                            sampleCache.set(
                                ref.key,
                                {
                                    expires:
                                        Date.now()
                                        + 5 * 60_000,
                                    item: null
                                }
                            );

                            return [
                                ref.key,
                                null
                            ] as const;
                        }
                    }
                );

            const sampleMap =
                new Map(samples);

            const output =
                new Map<
                    string,
                    ItemDto
                >();

            items.forEach(item => {
                if (!item.Id) {
                    return;
                }

                const exact =
                    exactMap.get(
                        item.Id
                    );

                const seriesId =
                    getSeriesId(item);

                const parentSeries =
                    seriesId
                        ? exactMap.get(
                            seriesId
                        )
                        : undefined;

                const sampleRef =
                    getSampleRef(item);

                const sample =
                    sampleRef
                        ? sampleMap.get(
                            sampleRef.key
                        )
                        : undefined;

                output.set(
                    item.Id,
                    {
                        ...item,
                        OfficialRating:
                            exact?.OfficialRating
                            ?? item.OfficialRating
                            ?? parentSeries
                                ?.OfficialRating
                            ?? sample
                                ?.OfficialRating,
                        MediaStreams:
                            exact
                                ?.MediaStreams
                                ?.length
                                ? exact.MediaStreams
                                : item
                                    .MediaStreams
                                    ?.length
                                    ? item.MediaStreams
                                    : sample
                                        ?.MediaStreams,
                        MediaSources:
                            exact
                                ?.MediaSources
                                ?.length
                                ? exact.MediaSources
                                : item
                                    .MediaSources
                                    ?.length
                                    ? item.MediaSources
                                    : sample
                                        ?.MediaSources
                    }
                );
            });

            return output;
        },
        enabled: Boolean(
            enabled
            && apiClient
            && userId
            && items.length > 0
        ),
        staleTime:
            10 * 60_000,
        refetchOnWindowFocus:
            false
    });

    return query.data;
};

export default useMinitigerRowMediaStreams;
