import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import MinitigerTranslationBackgroundSettings from './MinitigerTranslationBackgroundSettings';
import './MinitigerTranslationSettings.scss';

type TranslationStatus =
    | 'waiting'
    | 'translating'
    | 'ready'
    | 'applied'
    | 'skipped'
    | 'error';

interface TranslationSettings {
    apiKey: string;
    model: string;
    minTitleWords: number;
    protectFranchise: boolean;
    scanTitles: boolean;
    scanOverviews: boolean;
    itemSeries: boolean;
    itemSeasons: boolean;
    itemEpisodes: boolean;
    itemMovies: boolean;
    libraryIds: string[];
    batchSize: number;
    maxPerRun: number;
    autoSequential: boolean;
    cleanMetadata: boolean;
}

interface TranslationLibrary {
    Id: string;
    Name: string;
    CollectionType: string;
}

interface TranslationSourceItem {
    Id?: string | null;
    Type?: string | null;
    Name?: string | null;
    Overview?: string | null;
    OriginalTitle?: string | null;
    SeriesName?: string | null;
    SeasonName?: string | null;
    ParentIndexNumber?: number | null;
    IndexNumber?: number | null;
}

interface TranslationCandidate {
    id: string;
    type: string;
    libraryId: string;
    libraryName: string;
    name: string;
    overview: string;
    rawName: string;
    rawOverview: string;
    originalTitle: string;
    seriesName: string;
    seasonName: string;
    parentIndexNumber?: number | null;
    indexNumber?: number | null;
    titleCandidate: boolean;
    overviewCandidate: boolean;
    translatedTitle: string;
    translatedOverview: string;
    note: string;
    selected: boolean;
    status: TranslationStatus;
    error: string;
}

interface TranslationUsage {
    input: number;
    output: number;
}

interface TranslationRuntimeState {
    candidates: TranslationCandidate[];
    scanBusy: boolean;
    translationBusy: boolean;
    status: string;
    usage: TranslationUsage;
}

let translationRuntimeState: TranslationRuntimeState = {
    candidates: [],
    scanBusy: false,
    translationBusy: false,
    status: 'Noch kein Scan gestartet.',
    usage: {
        input: 0,
        output: 0
    }
};

const translationRuntimeListeners =
    new Set<(state: TranslationRuntimeState) => void>();

const translationAbortRef = {
    current: false
};

const updateTranslationRuntime = (
    updater:
        | Partial<TranslationRuntimeState>
        | ((
            current: TranslationRuntimeState
        ) => TranslationRuntimeState)
) => {
    translationRuntimeState =
        typeof updater === 'function'
            ? updater(translationRuntimeState)
            : {
                ...translationRuntimeState,
                ...updater
            };

    for (const listener of translationRuntimeListeners) {
        listener(translationRuntimeState);
    }
};

const subscribeTranslationRuntime = (
    listener: (state: TranslationRuntimeState) => void
) => {
    translationRuntimeListeners.add(listener);
    listener(translationRuntimeState);

    return () => {
        translationRuntimeListeners.delete(listener);
    };
};

interface OpenAiResponseLike {
    output_text?: string;
    output?: Array<{
        content?: Array<{
            type?: string;
            text?: string;
        }>;
    }>;
    usage?: {
        input_tokens?: number;
        output_tokens?: number;
    };
    error?: {
        message?: string;
    };
}

interface TranslationBatchResult {
    items: TranslationCandidate[];
    error?: string;
}

const STORAGE_VERSION = 1;
const PAGE_SIZE = 20;

const DEFAULT_SETTINGS: TranslationSettings = {
    apiKey: '',
    model: 'gpt-5.6-luna',
    minTitleWords: 3,
    protectFranchise: true,
    scanTitles: true,
    scanOverviews: true,
    itemSeries: true,
    itemSeasons: true,
    itemEpisodes: true,
    itemMovies: true,
    libraryIds: [],
    batchSize: 5,
    maxPerRun: 50,
    autoSequential: false,
    cleanMetadata: true
};

const clamp = (
    value: unknown,
    fallback: number,
    min: number,
    max: number
) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(parsed)));
};

const positiveInteger = (
    value: unknown,
    fallback: number
) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.max(
        1,
        Math.min(
            Number.MAX_SAFE_INTEGER,
            Math.round(parsed)
        )
    );
};

const normalizeStringArray = (value: unknown) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(new Set(
        value
            .filter(item => typeof item === 'string')
            .map(item => String(item).trim())
            .filter(Boolean)
    ));
};

const normalizeSettings = (value: unknown): TranslationSettings => {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_SETTINGS };
    }

    const source = value as Partial<TranslationSettings>;

    return {
        apiKey: typeof source.apiKey === 'string'
            ? source.apiKey.trim()
            : '',
        model: typeof source.model === 'string' && source.model.trim()
            ? source.model.trim().slice(0, 100)
            : DEFAULT_SETTINGS.model,
        minTitleWords: clamp(
            source.minTitleWords,
            DEFAULT_SETTINGS.minTitleWords,
            3,
            12
        ),
        protectFranchise: source.protectFranchise !== false,
        scanTitles: source.scanTitles !== false,
        scanOverviews: source.scanOverviews !== false,
        itemSeries: source.itemSeries !== false,
        itemSeasons: source.itemSeasons !== false,
        itemEpisodes: source.itemEpisodes !== false,
        itemMovies: source.itemMovies !== false,
        libraryIds: normalizeStringArray(source.libraryIds),
        batchSize: clamp(
            source.batchSize,
            DEFAULT_SETTINGS.batchSize,
            1,
            10
        ),
        maxPerRun: positiveInteger(
            source.maxPerRun,
            DEFAULT_SETTINGS.maxPerRun
        ),
        autoSequential: source.autoSequential === true,
        cleanMetadata: source.cleanMetadata !== false
    };
};

const getServerId = (apiClient: unknown) => {
    try {
        const client = apiClient as {
            serverId?: () => string;
            getPublicSystemInfo?: () => Promise<{ Id?: string | null }>;
        };
        const id = client.serverId?.();

        if (id) {
            return String(id);
        }
    } catch (error) {
        console.debug(
            '[Minitiger Translation] Server-ID konnte nicht gelesen werden.',
            error
        );
    }

    return 'server';
};

const storageKey = (apiClient: unknown) =>
    `minitiger.translation.settings.v${STORAGE_VERSION}:${getServerId(apiClient)}`;

const cleanMetadataText = (text: unknown) => {
    let value = String(text ?? '');

    value = value.replace(
        /[\[(]\s*(?:quelle|source)\s*:\s*[^\]\)]*[\])]/gi,
        ' '
    );
    value = value.replace(
        /(^|\n)\s*(?:quelle|source)\s*:\s*[^\n]*(?=\n|$)/gi,
        '$1'
    );
    value = value.replace(/<[^>]*>/g, ' ');
    value = value.replace(
        /\[\/?(?:b|i|u|em|strong|p|br|span|div|color|size|url)(?:=[^\]]*)?\]/gi,
        ' '
    );

    return value
        .replace(/[ \t]+([,.;:!?])/g, '$1')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const translationWords = (text: unknown) =>
    String(text ?? '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[^A-Za-zÀ-ÿ0-9'’-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

const likelyEnglishText = (
    text: unknown,
    titleMode: boolean,
    minTitleWords: number
) => {
    const words = translationWords(text);
    const english = new Set([
        'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at',
        'for', 'from', 'with', 'without', 'into', 'through', 'after',
        'before', 'when', 'while', 'who', 'whose', 'his', 'her', 'their',
        'they', 'he', 'she', 'is', 'are', 'was', 'were', 'has', 'have',
        'had', 'this', 'that', 'these', 'those', 'but', 'as', 'by',
        'about', 'new', 'one', 'becomes', 'must', 'can', 'will', 'finds',
        'tries', 'returns', 'discovers', 'against', 'between', 'world',
        'life', 'story'
    ]);
    const german = new Set([
        'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer',
        'einem', 'einen', 'und', 'oder', 'von', 'zu', 'zum', 'zur', 'im',
        'in', 'auf', 'mit', 'ohne', 'für', 'nach', 'vor', 'als', 'bei',
        'durch', 'über', 'unter', 'ist', 'sind', 'war', 'waren', 'hat',
        'haben', 'dieser', 'diese', 'dieses', 'aber', 'nicht', 'sich',
        'sein', 'seine', 'ihr', 'ihre', 'aus', 'wird', 'werden', 'gegen',
        'zwischen', 'leben', 'geschichte'
    ]);
    let englishScore = 0;
    let germanScore = /[äöüß]/i.test(String(text ?? '')) ? 2 : 0;

    if (titleMode && words.length < minTitleWords) {
        return false;
    }

    if (!titleMode && words.length < 6) {
        return false;
    }

    for (const rawWord of words) {
        const word = rawWord.toLowerCase();

        if (english.has(word)) {
            englishScore += 1;
        }

        if (german.has(word)) {
            germanScore += 1;
        }
    }

    if (titleMode) {
        return englishScore >= 1 && englishScore > germanScore;
    }

    return englishScore >= 3
        && englishScore >= (germanScore * 1.5 + 1);
};

const candidateFromItem = (
    item: TranslationSourceItem,
    library: TranslationLibrary,
    settings: TranslationSettings
): TranslationCandidate | null => {
    if (!item.Id) {
        return null;
    }

    const rawName = String(item.Name ?? '').trim();
    const rawOverview = String(item.Overview ?? '').trim();
    const name = settings.cleanMetadata
        ? cleanMetadataText(rawName)
        : rawName;
    const overview = settings.cleanMetadata
        ? cleanMetadataText(rawOverview)
        : rawOverview;
    const titleCandidate = settings.scanTitles
        && likelyEnglishText(name, true, settings.minTitleWords);
    const overviewCandidate = settings.scanOverviews
        && likelyEnglishText(overview, false, settings.minTitleWords);

    if (!titleCandidate && !overviewCandidate) {
        return null;
    }

    return {
        id: String(item.Id),
        type: String(item.Type ?? ''),
        libraryId: library.Id,
        libraryName: library.Name,
        name,
        overview,
        rawName,
        rawOverview,
        originalTitle: String(item.OriginalTitle ?? ''),
        seriesName: String(item.SeriesName ?? ''),
        seasonName: String(item.SeasonName ?? ''),
        parentIndexNumber: item.ParentIndexNumber,
        indexNumber: item.IndexNumber,
        titleCandidate,
        overviewCandidate,
        translatedTitle: '',
        translatedOverview: '',
        note: '',
        selected: true,
        status: 'waiting',
        error: ''
    };
};

const includeTypesForLibrary = (
    library: TranslationLibrary,
    settings: TranslationSettings
) => {
    const type = library.CollectionType.toLowerCase();
    const result: string[] = [];

    if (type === 'tvshows') {
        if (settings.itemSeries) {
            result.push('Series');
        }
        if (settings.itemSeasons) {
            result.push('Season');
        }
        if (settings.itemEpisodes) {
            result.push('Episode');
        }
    } else if (type === 'movies' && settings.itemMovies) {
        result.push('Movie');
    }

    return result.join(',');
};

const collectionLabel = (type: string) => {
    const normalized = type.toLowerCase();

    if (normalized === 'tvshows') {
        return 'Serien';
    }

    if (normalized === 'movies') {
        return 'Filme';
    }

    return type || 'Bibliothek';
};

const openAiOutputText = (response: OpenAiResponseLike) => {
    if (typeof response.output_text === 'string' && response.output_text) {
        return response.output_text;
    }

    for (const output of response.output ?? []) {
        for (const content of output.content ?? []) {
            if (content.type === 'output_text' && content.text) {
                return String(content.text);
            }
        }
    }

    return '';
};

const translationResponseSchema = () => ({
    type: 'object',
    additionalProperties: false,
    properties: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    overview: { type: 'string' },
                    note: { type: 'string' }
                },
                required: [ 'id', 'title', 'overview', 'note' ]
            }
        }
    },
    required: [ 'items' ]
});

const statusLabel = (status: TranslationStatus) => {
    switch (status) {
        case 'ready': return 'Übersetzung bereit';
        case 'translating': return 'Übersetzt …';
        case 'applied': return 'Übernommen';
        case 'skipped': return 'Übersprungen';
        case 'error': return 'Fehler';
        case 'waiting':
        default: return 'Gefunden';
    }
};

const candidatePath = (candidate: TranslationCandidate) => {
    const parts = [ candidate.libraryName, candidate.type ];

    if (
        candidate.seriesName
        && candidate.seriesName !== candidate.name
    ) {
        parts.push(candidate.seriesName);
    }

    if (
        candidate.seasonName
        && candidate.seasonName !== candidate.name
    ) {
        parts.push(candidate.seasonName);
    }

    return parts.filter(Boolean).join(' · ');
};

const MinitigerTranslationSettings = () => {
    const { __legacyApiClient__: apiClient } = useApi();
    const [ settings, setSettings ] = useState<TranslationSettings>({
        ...DEFAULT_SETTINGS
    });
    const [ settingsLoaded, setSettingsLoaded ] = useState(false);
    const [ showApiKey, setShowApiKey ] = useState(false);
    const [ libraries, setLibraries ] = useState<TranslationLibrary[]>([]);
    const [ librariesLoading, setLibrariesLoading ] = useState(false);
    const [ runtimeState, setRuntimeState ] =
        useState<TranslationRuntimeState>(
            () => translationRuntimeState
        );
    const {
        candidates,
        scanBusy,
        translationBusy,
        status,
        usage
    } = runtimeState;
    const [ apiStatus, setApiStatus ] = useState('');
    const [ pageIndex, setPageIndex ] = useState(0);
    const abortRef = translationAbortRef;

    const setCandidates = (
        value: React.SetStateAction<TranslationCandidate[]>
    ) => {
        updateTranslationRuntime(current => ({
            ...current,
            candidates:
                typeof value === 'function'
                    ? value(current.candidates)
                    : value
        }));
    };

    const setScanBusy = (value: boolean) => {
        updateTranslationRuntime({
            scanBusy: value
        });
    };

    const setTranslationBusy = (value: boolean) => {
        updateTranslationRuntime({
            translationBusy: value
        });
    };

    const setStatus = (value: string) => {
        updateTranslationRuntime({
            status: value
        });
    };

    const setUsage = (
        value: React.SetStateAction<TranslationUsage>
    ) => {
        updateTranslationRuntime(current => ({
            ...current,
            usage:
                typeof value === 'function'
                    ? value(current.usage)
                    : value
        }));
    };

    useEffect(() =>
        subscribeTranslationRuntime(
            setRuntimeState
        ),
    []);

    const updateSettings = (patch: Partial<TranslationSettings>) => {
        setSettings(current => normalizeSettings({
            ...current,
            ...patch
        }));
    };

    useEffect(() => {
        if (!apiClient) {
            setSettings({ ...DEFAULT_SETTINGS });
            setSettingsLoaded(true);
            return;
        }

        try {
            const raw = localStorage.getItem(storageKey(apiClient));
            setSettings(
                raw
                    ? normalizeSettings(JSON.parse(raw))
                    : { ...DEFAULT_SETTINGS }
            );
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Lokale Einstellungen konnten nicht gelesen werden.',
                error
            );
            setSettings({ ...DEFAULT_SETTINGS });
        } finally {
            setSettingsLoaded(true);
        }
    }, [apiClient]);

    useEffect(() => {
        if (!apiClient || !settingsLoaded) {
            return;
        }

        try {
            localStorage.setItem(
                storageKey(apiClient),
                JSON.stringify(settings)
            );
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Lokale Einstellungen konnten nicht gespeichert werden.',
                error
            );
        }
    }, [ apiClient, settings, settingsLoaded ]);

    useEffect(() => {
        if (!apiClient) {
            setLibraries([]);
            return;
        }

        const userId = apiClient.getCurrentUserId();

        if (!userId) {
            setLibraries([]);
            return;
        }

        let cancelled = false;
        setLibrariesLoading(true);

        apiClient.getUserViews({}, userId)
            .then(result => {
                if (cancelled) {
                    return;
                }

                const items = result?.Items ?? [];
                const next = items
                    .filter(item => {
                        const collectionType = String(
                            item.CollectionType ?? ''
                        ).toLowerCase();

                        return Boolean(item.Id && item.Name)
                            && (
                                collectionType === 'tvshows'
                                || collectionType === 'movies'
                            );
                    })
                    .map(item => ({
                        Id: String(item.Id),
                        Name: String(item.Name),
                        CollectionType: String(item.CollectionType ?? '')
                    }))
                    .sort((left, right) =>
                        left.Name.localeCompare(
                            right.Name,
                            'de',
                            { numeric: true }
                        )
                    );

                setLibraries(next);
            })
            .catch(error => {
                console.warn(
                    '[Minitiger Translation] Bibliotheken konnten nicht geladen werden.',
                    error
                );
                if (!cancelled) {
                    setLibraries([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLibrariesLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [apiClient]);

    const selectedLibraries = useMemo(() => {
        const selected = new Set(settings.libraryIds);
        return libraries.filter(library => selected.has(library.Id));
    }, [ libraries, settings.libraryIds ]);

    const pageCount = Math.max(
        1,
        Math.ceil(candidates.length / PAGE_SIZE)
    );

    useEffect(() => {
        if (pageIndex >= pageCount) {
            setPageIndex(pageCount - 1);
        }
    }, [ pageCount, pageIndex ]);

    const pageCandidates = useMemo(() => {
        const start = pageIndex * PAGE_SIZE;
        return candidates.slice(start, start + PAGE_SIZE);
    }, [ candidates, pageIndex ]);

    const updateCandidate = (
        id: string,
        patch: Partial<TranslationCandidate>
    ) => {
        setCandidates(current => current.map(candidate =>
            candidate.id === id
                ? { ...candidate, ...patch }
                : candidate
        ));
    };

    const mergeCandidates = (items: TranslationCandidate[]) => {
        const map = new Map(items.map(item => [ item.id, item ]));
        setCandidates(current => current.map(candidate =>
            map.get(candidate.id) ?? candidate
        ));
    };

    const openAiRequest = async (
        activeSettings: TranslationSettings,
        body: Record<string, unknown>
    ): Promise<OpenAiResponseLike> => {
        const key = activeSettings.apiKey.trim();

        if (!key) {
            throw new Error('Kein OpenAI API-Key eingetragen.');
        }

        let response: Response;

        try {
            response = await fetch(
                'https://api.openai.com/v1/responses',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${key}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );
        } catch (error) {
            throw new Error(
                'Browser/Netzwerk hat den direkten OpenAI-Aufruf blockiert (CORS/Netzwerk). '
                + (error instanceof Error ? error.message : String(error))
            );
        }

        const text = await response.text();
        let data: OpenAiResponseLike = {};

        try {
            data = text
                ? JSON.parse(text) as OpenAiResponseLike
                : {};
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.error?.message
                || `OpenAI HTTP ${response.status}`
            );
        }

        return data;
    };

    const testApi = async () => {
        setApiStatus('Teste …');

        try {
            const response = await openAiRequest(settings, {
                model: settings.model,
                input: 'Antworte ausschließlich mit: OK',
                max_output_tokens: 16,
                store: false
            });
            const text = openAiOutputText(response).trim();
            setApiStatus(
                `Verbindung funktioniert${text ? ` · ${text.slice(0, 40)}` : ''} ♥`
            );
        } catch (error) {
            setApiStatus(
                `Fehler: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    };

    const translateBatch = async (
        batch: TranslationCandidate[],
        activeSettings: TranslationSettings
    ): Promise<TranslationBatchResult> => {
        let instructions =
            'Übersetze Jellyfin-Metadaten von Englisch in natürliches Deutsch. '
            + 'Erhalte etablierte Franchise-/Werktitel, Eigennamen, Marken, Orte '
            + 'und fiktive Begriffe. Erfinde nichts. Titel nur übersetzen, wenn '
            + 'eine natürliche deutsche Fassung sinnvoll ist; sonst unverändert '
            + 'lassen. Beschreibungen sinngemäß und vollständig übersetzen.';

        if (!activeSettings.protectFranchise) {
            instructions =
                'Übersetze Jellyfin-Metadaten von Englisch in natürliches Deutsch. '
                + 'Erfinde keine Fakten und erhalte Eigennamen. Titel dürfen '
                + 'übersetzt werden, wenn eine natürliche deutsche Fassung '
                + 'sinnvoll ist. Beschreibungen sinngemäß und vollständig übersetzen.';
        }

        if (activeSettings.cleanMetadata) {
            instructions +=
                ' Übernimm keine Quellenhinweise wie (Quelle: ...), [Quelle: ...], '
                + '(Source: ...) oder [Source: ...] und keine HTML-/BBCode-/Pseudo-'
                + 'Markup-Reste in die Ausgabe.';
        }

        const items = batch.map(candidate => ({
            id: candidate.id,
            type: candidate.type,
            translateTitle: candidate.titleCandidate,
            translateOverview: candidate.overviewCandidate,
            title: candidate.name,
            originalTitle: candidate.originalTitle,
            overview: candidate.overview,
            seriesName: candidate.seriesName,
            seasonName: candidate.seasonName
        }));

        try {
            const response = await openAiRequest(activeSettings, {
                model: activeSettings.model,
                instructions,
                input:
                    'Zielsprache: Deutsch (de-DE). Bearbeite jedes Element separat. '
                    + 'Wenn translateTitle oder translateOverview false ist, gib '
                    + 'das jeweilige Originalfeld unverändert zurück. JSON-Eingabe:\n'
                    + JSON.stringify({ items }),
                store: false,
                text: {
                    format: {
                        type: 'json_schema',
                        name: 'minitiger_translation_batch',
                        strict: true,
                        schema: translationResponseSchema()
                    },
                    verbosity: 'low'
                },
                max_output_tokens: Math.max(1200, batch.length * 700)
            });

            if (response.usage) {
                setUsage(current => ({
                    input:
                        current.input
                        + Number(response.usage?.input_tokens ?? 0),
                    output:
                        current.output
                        + Number(response.usage?.output_tokens ?? 0)
                }));
            }

            const output = openAiOutputText(response);
            let parsed: {
                items?: Array<{
                    id?: string;
                    title?: string;
                    overview?: string;
                    note?: string;
                }>;
            };

            try {
                parsed = JSON.parse(output) as typeof parsed;
            } catch {
                throw new Error(
                    'OpenAI-Antwort konnte nicht als strukturierte Übersetzung gelesen werden.'
                );
            }

            const responseMap = new Map(
                (parsed.items ?? []).map(item => [ String(item.id ?? ''), item ])
            );

            return {
                items: batch.map(candidate => {
                    const result = responseMap.get(candidate.id);

                    if (!result) {
                        return {
                            ...candidate,
                            status: 'error' as const,
                            error: 'Kein Ergebnis für dieses Element erhalten.'
                        };
                    }

                    let translatedTitle = candidate.titleCandidate
                        ? String(result.title || candidate.name).trim()
                        : candidate.name;
                    let translatedOverview = candidate.overviewCandidate
                        ? String(result.overview || candidate.overview).trim()
                        : candidate.overview;

                    if (activeSettings.cleanMetadata) {
                        translatedTitle = cleanMetadataText(translatedTitle);
                        translatedOverview = cleanMetadataText(translatedOverview);
                    }

                    return {
                        ...candidate,
                        translatedTitle,
                        translatedOverview,
                        note: String(result.note ?? '').trim(),
                        status: 'ready' as const,
                        error: ''
                    };
                })
            };
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : String(error);

            return {
                items: batch.map(candidate => ({
                    ...candidate,
                    status: 'error' as const,
                    error: message
                })),
                error: message
            };
        }
    };

    const postItem = async (
        id: string,
        item: unknown
    ) => {
        if (!apiClient) {
            throw new Error('Jellyfin API ist nicht verfügbar.');
        }

        await apiClient.ajax({
            type: 'POST',
            url: apiClient.getUrl(`Items/${id}`),
            data: JSON.stringify(item),
            contentType: 'application/json'
        });
    };

    const applyCandidate = async (
        candidate: TranslationCandidate,
        undo = false
    ): Promise<TranslationCandidate> => {
        if (!apiClient) {
            throw new Error('Jellyfin Item-API ist nicht verfügbar.');
        }

        const userId = apiClient.getCurrentUserId();

        if (!userId) {
            throw new Error('Kein Jellyfin-Benutzer angemeldet.');
        }

        const item = await apiClient.getItem(userId, candidate.id);

        if (!item) {
            throw new Error(
                'Element konnte vor dem Schreiben nicht erneut geladen werden.'
            );
        }

        const currentName = String(item.Name ?? '').trim();
        const currentOverview = String(item.Overview ?? '').trim();

        if (!undo) {
            if (
                candidate.titleCandidate
                && currentName !== candidate.rawName
            ) {
                throw new Error(
                    'Titel wurde seit dem Scan verändert. Bitte neu scannen, damit nichts überschrieben wird.'
                );
            }

            if (
                candidate.overviewCandidate
                && currentOverview !== candidate.rawOverview
            ) {
                throw new Error(
                    'Beschreibung wurde seit dem Scan verändert. Bitte neu scannen, damit nichts überschrieben wird.'
                );
            }

            if (candidate.titleCandidate && candidate.translatedTitle) {
                item.Name = candidate.translatedTitle;
            }

            if (candidate.overviewCandidate && candidate.translatedOverview) {
                item.Overview = candidate.translatedOverview;
            }
        } else {
            if (candidate.titleCandidate) {
                item.Name = candidate.rawName;
            }

            if (candidate.overviewCandidate) {
                item.Overview = candidate.rawOverview;
            }
        }

        await postItem(candidate.id, item);

        return {
            ...candidate,
            status: undo ? 'ready' : 'applied',
            error: ''
        };
    };

    const scanManual = async (
        userId: string,
        activeSettings: TranslationSettings,
        activeLibraries: TranslationLibrary[]
    ) => {
        const found: TranslationCandidate[] = [];
        let checked = 0;

        for (const library of activeLibraries) {
            if (abortRef.current) {
                break;
            }

            const includeTypes = includeTypesForLibrary(
                library,
                activeSettings
            );

            if (!includeTypes) {
                continue;
            }

            const seen = new Set<string>();
            let startIndex = 0;

            while (!abortRef.current) {
                setStatus(
                    `Scanne „${library.Name}“ … ${checked} Inhalte geprüft · ${found.length} Kandidaten`
                );

                const result = await apiClient?.getItems(userId, {
                    ParentId: library.Id,
                    Recursive: true,
                    IncludeItemTypes: includeTypes,
                    Fields:
                        'Overview,OriginalTitle,SeriesName,SeasonName,IndexNumber,ParentIndexNumber',
                    StartIndex: startIndex,
                    Limit: 120,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    EnableTotalRecordCount: false
                });
                const items = (result?.Items ?? []) as TranslationSourceItem[];

                if (!items.length) {
                    break;
                }

                let added = 0;

                for (const item of items) {
                    const id = String(item.Id ?? '');

                    if (!id || seen.has(id)) {
                        continue;
                    }

                    seen.add(id);
                    added += 1;
                    checked += 1;

                    const candidate = candidateFromItem(
                        item,
                        library,
                        activeSettings
                    );

                    if (candidate) {
                        found.push(candidate);
                    }
                }

                setCandidates([ ...found ]);

                if (!added) {
                    break;
                }

                startIndex += items.length;
            }
        }

        setStatus(
            abortRef.current
                ? `Scan abgebrochen · ${checked} Inhalte geprüft · ${found.length} Kandidaten behalten.`
                : `Scan abgeschlossen ♥ ${checked} Inhalte geprüft · ${found.length} wahrscheinlich englische Kandidaten gefunden.`
        );
    };

    const runAutoSequential = async (
        userId: string,
        activeSettings: TranslationSettings,
        activeLibraries: TranslationLibrary[]
    ) => {
        const stats = {
            checked: 0,
            found: 0,
            applied: 0,
            errors: 0
        };

        for (const library of activeLibraries) {
            if (
                abortRef.current
                || stats.found >= activeSettings.maxPerRun
            ) {
                break;
            }

            const includeTypes = includeTypesForLibrary(
                library,
                activeSettings
            );

            if (!includeTypes) {
                continue;
            }

            const seen = new Set<string>();
            let startIndex = 0;

            while (
                !abortRef.current
                && stats.found < activeSettings.maxPerRun
            ) {
                const result = await apiClient?.getItems(userId, {
                    ParentId: library.Id,
                    Recursive: true,
                    IncludeItemTypes: includeTypes,
                    Fields:
                        'Overview,OriginalTitle,SeriesName,SeasonName,IndexNumber,ParentIndexNumber',
                    StartIndex: startIndex,
                    Limit: 60,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    EnableTotalRecordCount: false
                });
                const items = (result?.Items ?? []) as TranslationSourceItem[];

                if (!items.length) {
                    break;
                }

                let added = 0;

                for (const item of items) {
                    if (
                        abortRef.current
                        || stats.found >= activeSettings.maxPerRun
                    ) {
                        break;
                    }

                    const id = String(item.Id ?? '');

                    if (!id || seen.has(id)) {
                        continue;
                    }

                    seen.add(id);
                    added += 1;
                    stats.checked += 1;

                    const candidate = candidateFromItem(
                        item,
                        library,
                        activeSettings
                    );

                    setStatus(
                        `1→1→1 läuft · „${library.Name}“ · prüfe: ${String(item.Name ?? '…')} · ${stats.checked} geprüft · ${stats.found} englisch · ${stats.applied} übernommen${stats.errors ? ` · ${stats.errors} Fehler` : ''} · Limit ${activeSettings.maxPerRun}`
                    );

                    if (!candidate) {
                        continue;
                    }

                    stats.found += 1;
                    const translatingCandidate: TranslationCandidate = {
                        ...candidate,
                        selected: false,
                        status: 'translating'
                    };
                    const translated = await translateBatch(
                        [translatingCandidate],
                        activeSettings
                    );
                    let finished = translated.items[0];

                    if (finished.status === 'ready') {
                        try {
                            finished = await applyCandidate(finished, false);
                            stats.applied += 1;
                        } catch (error) {
                            stats.errors += 1;
                            finished = {
                                ...finished,
                                status: 'error',
                                error: error instanceof Error
                                    ? error.message
                                    : String(error)
                            };
                        }
                    } else {
                        stats.errors += 1;
                    }

                    setCandidates(current => [
                        finished,
                        ...current.filter(entry => entry.id !== finished.id)
                    ].slice(0, 20));
                    setPageIndex(0);

                    await new Promise(resolve => {
                        window.setTimeout(resolve, 35);
                    });
                }

                if (!added) {
                    break;
                }

                startIndex += items.length;
            }
        }

        if (abortRef.current) {
            setStatus(
                `1→1→1 gestoppt · ${stats.checked} geprüft · ${stats.found} englische Kandidaten · ${stats.applied} übernommen · ${stats.errors} Fehler.`
            );
        } else if (stats.found >= activeSettings.maxPerRun) {
            setStatus(
                `1→1→1 Durchlauf fertig ♥ Limit von ${activeSettings.maxPerRun} Übersetzungen erreicht · ${stats.checked} Inhalte geprüft · ${stats.applied} übernommen · ${stats.errors} Fehler.`
            );
        } else {
            setStatus(
                `1→1→1 Durchlauf fertig ♥ ${stats.checked} Inhalte geprüft · ${stats.found} englische Kandidaten · ${stats.applied} direkt übernommen · ${stats.errors} Fehler.`
            );
        }
    };

    const startScan = async () => {
        if (scanBusy || translationBusy) {
            return;
        }

        if (!apiClient) {
            setStatus('Jellyfin API ist in diesem Client nicht verfügbar.');
            return;
        }

        if (!settings.scanTitles && !settings.scanOverviews) {
            setStatus('Bitte mindestens Titel oder Beschreibungen auswählen.');
            return;
        }

        if (!selectedLibraries.length) {
            setStatus(
                'Bitte mindestens eine Serien- oder Film-Bibliothek auswählen.'
            );
            return;
        }

        if (settings.autoSequential && !settings.apiKey) {
            setApiStatus('Bitte zuerst einen API-Key eintragen.');
            return;
        }

        const userId = apiClient.getCurrentUserId();

        if (!userId) {
            setStatus('Kein Jellyfin-Benutzer angemeldet.');
            return;
        }

        abortRef.current = false;
        setScanBusy(true);
        setUsage({ input: 0, output: 0 });
        setCandidates([]);
        setPageIndex(0);

        try {
            if (settings.autoSequential) {
                setTranslationBusy(true);
                setStatus(
                    '1→1→1 Automatik startet … Jedes Element wird vollständig abgeschlossen, bevor das nächste beginnt.'
                );
                await runAutoSequential(
                    userId,
                    settings,
                    selectedLibraries
                );
            } else {
                await scanManual(
                    userId,
                    settings,
                    selectedLibraries
                );
            }
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Scan fehlgeschlagen.',
                error
            );
            setStatus(
                `Scan-Fehler: ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            setScanBusy(false);
            setTranslationBusy(false);
        }
    };

    const translateSelected = async () => {
        if (translationBusy || scanBusy) {
            return;
        }

        if (!settings.apiKey) {
            setApiStatus('Bitte zuerst einen API-Key eintragen.');
            return;
        }

        const selected = candidates
            .filter(candidate =>
                candidate.selected
                && candidate.status !== 'applied'
                && candidate.status !== 'skipped'
            )
            .slice(0, settings.maxPerRun);

        if (!selected.length) {
            setStatus(
                'Keine passenden ausgewählten Kandidaten zum Übersetzen.'
            );
            return;
        }

        setTranslationBusy(true);
        setStatus(
            `Übersetze ${selected.length} ausgewählte Kandidaten …`
        );

        let stoppedByError = '';

        try {
            for (
                let index = 0;
                index < selected.length;
                index += settings.batchSize
            ) {
                const batch = selected
                    .slice(index, index + settings.batchSize)
                    .map(candidate => ({
                        ...candidate,
                        status: 'translating' as const,
                        error: ''
                    }));

                mergeCandidates(batch);
                const result = await translateBatch(batch, settings);
                mergeCandidates(result.items);

                if (result.error) {
                    stoppedByError = result.error;
                    break;
                }
            }

            setStatus(
                stoppedByError
                    ? `Übersetzung unterbrochen: ${stoppedByError}`
                    : 'Übersetzungsvorschläge fertig ♥ Bitte prüfen und anschließend gezielt übernehmen.'
            );
        } finally {
            setTranslationBusy(false);
        }
    };

    const applySelected = async () => {
        if (translationBusy || scanBusy) {
            return;
        }

        const selected = candidates.filter(candidate =>
            candidate.selected && candidate.status === 'ready'
        );

        if (!selected.length) {
            setStatus(
                'Keine fertigen ausgewählten Übersetzungen zum Übernehmen.'
            );
            return;
        }

        setTranslationBusy(true);
        setStatus(
            `Schreibe ${selected.length} bestätigte Übersetzungen nach Jellyfin …`
        );

        try {
            for (const candidate of selected) {
                try {
                    const updated = await applyCandidate(candidate, false);
                    mergeCandidates([updated]);
                } catch (error) {
                    mergeCandidates([{
                        ...candidate,
                        status: 'error',
                        error: error instanceof Error
                            ? error.message
                            : String(error)
                    }]);
                }
            }

            setStatus(
                'Übernahme abgeschlossen ♥ Fehlerhafte Elemente bleiben markiert und können einzeln geprüft werden.'
            );
        } finally {
            setTranslationBusy(false);
        }
    };

    const translateOne = async (candidate: TranslationCandidate) => {
        if (translationBusy || scanBusy) {
            return;
        }

        if (!settings.apiKey) {
            setApiStatus('Bitte zuerst einen API-Key eintragen.');
            return;
        }

        setTranslationBusy(true);
        const translating = {
            ...candidate,
            selected: true,
            status: 'translating' as const,
            error: ''
        };
        mergeCandidates([translating]);

        try {
            const result = await translateBatch([translating], settings);
            mergeCandidates(result.items);
        } finally {
            setTranslationBusy(false);
        }
    };

    const applyOne = async (
        candidate: TranslationCandidate,
        undo = false
    ) => {
        if (translationBusy || scanBusy) {
            return;
        }

        setTranslationBusy(true);

        try {
            const updated = await applyCandidate(candidate, undo);
            mergeCandidates([updated]);
        } catch (error) {
            mergeCandidates([{
                ...candidate,
                status: 'error',
                error: error instanceof Error
                    ? error.message
                    : String(error)
            }]);
        } finally {
            setTranslationBusy(false);
        }
    };

    const readyCount = candidates.filter(
        candidate => candidate.status === 'ready'
    ).length;
    const appliedCount = candidates.filter(
        candidate => candidate.status === 'applied'
    ).length;
    const openCount = candidates.filter(candidate =>
        candidate.status === 'waiting'
        || candidate.status === 'error'
    ).length;

    return (
        <>
            <h3>Auto-Übersetzung</h3>
            <p className='minitigerSettingsIntro'>
                Port des Auto-Übersetzers aus Minitiger Design v8.2.0. Der lokale
                Scan sucht zuerst nach wahrscheinlich englischen Jellyfin-Metadaten;
                nur ausgewählte Kandidaten werden an OpenAI gesendet.
            </p>

            <MinitigerTranslationBackgroundSettings />

            <section className='minitigerSettingsCard'>
                <h4>OpenAI API</h4>

                <div className='minitigerTranslationWarning'>
                    <strong>⚠ Direkter Browser-Key:</strong> Der API-Key wird nur
                    lokal für diesen Server in diesem Browser/Client gespeichert und
                    nicht in Minitiger-Backups oder an andere Jellyfin-Nutzer verteilt.
                    Browser-Erweiterungen oder lokale Skripte könnten Browser-Speicher
                    technisch trotzdem lesen.
                </div>

                <label className='minitigerSettingsField'>
                    <span>OpenAI API-Key</span>
                    <div className='minitigerTranslationKeyRow'>
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            autoComplete='off'
                            spellCheck={false}
                            value={settings.apiKey}
                            placeholder='sk-…'
                            onChange={event => updateSettings({
                                apiKey: event.currentTarget.value
                            })}
                        />
                        <button
                            type='button'
                            onClick={() => setShowApiKey(value => !value)}
                        >
                            {showApiKey ? 'Verbergen' : 'Anzeigen'}
                        </button>
                    </div>
                </label>

                <label className='minitigerSettingsField'>
                    <span>Modell</span>
                    <input
                        type='text'
                        list='minitigerTranslationModels'
                        spellCheck={false}
                        value={settings.model}
                        onChange={event => updateSettings({
                            model: event.currentTarget.value
                        })}
                    />
                    <datalist id='minitigerTranslationModels'>
                        <option value='gpt-5.6-luna' />
                        <option value='gpt-5.6-terra' />
                        <option value='gpt-5.6-sol' />
                    </datalist>
                    <small>
                        Luna ist der voreingestellte kostensensible Modus. Andere
                        für deinen API-Zugang verfügbare Modell-IDs können ebenfalls
                        eingetragen werden.
                    </small>
                </label>

                <div className='minitigerTranslationButtons'>
                    <button
                        type='button'
                        disabled={!settings.apiKey || translationBusy || scanBusy}
                        onClick={() => void testApi()}
                    >
                        API-Verbindung testen
                    </button>
                    {apiStatus && (
                        <span className='minitigerTranslationInlineStatus'>
                            {apiStatus}
                        </span>
                    )}
                </div>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>1. Bibliotheken &amp; Scan</h4>
                <p className='minitigerSettingsHint'>
                    Es werden nur Serien- und Film-Bibliotheken angeboten. Der lokale
                    Scan selbst verbraucht keine OpenAI-Tokens.
                </p>

                <div className='minitigerTranslationLibraries'>
                    {librariesLoading && !libraries.length && (
                        <span>Bibliotheken werden geladen …</span>
                    )}
                    {!librariesLoading && !libraries.length && (
                        <span>Keine Serien-/Film-Bibliotheken gefunden.</span>
                    )}
                    {libraries.map(library => {
                        const checked = settings.libraryIds.includes(library.Id);
                        return (
                            <label
                                key={library.Id}
                                className='minitigerTranslationLibrary'
                            >
                                <input
                                    type='checkbox'
                                    checked={checked}
                                    onChange={event => {
                                        const next = event.currentTarget.checked
                                            ? [
                                                ...settings.libraryIds,
                                                library.Id
                                            ]
                                            : settings.libraryIds.filter(
                                                id => id !== library.Id
                                            );
                                        updateSettings({ libraryIds: next });
                                    }}
                                />
                                <span>
                                    <strong>{library.Name}</strong>
                                    <small>
                                        {collectionLabel(library.CollectionType)}
                                    </small>
                                </span>
                            </label>
                        );
                    })}
                </div>

                <div className='minitigerTranslationOptions'>
                    <div>
                        <strong>Inhaltstypen</strong>
                        {[
                            [ 'itemSeries', 'Serien' ],
                            [ 'itemSeasons', 'Staffeln' ],
                            [ 'itemEpisodes', 'Folgen' ],
                            [ 'itemMovies', 'Filme' ]
                        ].map(([ key, label ]) => (
                            <label
                                key={key}
                                className='minitigerTranslationMiniCheck'
                            >
                                <input
                                    type='checkbox'
                                    checked={Boolean(
                                        settings[
                                            key as keyof TranslationSettings
                                        ]
                                    )}
                                    onChange={event => updateSettings({
                                        [key]: event.currentTarget.checked
                                    } as Partial<TranslationSettings>)}
                                />
                                {label}
                            </label>
                        ))}
                    </div>

                    <div>
                        <strong>Felder</strong>
                        <label className='minitigerTranslationMiniCheck'>
                            <input
                                type='checkbox'
                                checked={settings.scanTitles}
                                onChange={event => updateSettings({
                                    scanTitles: event.currentTarget.checked
                                })}
                            />
                            Titel
                        </label>
                        <label className='minitigerTranslationMiniCheck'>
                            <input
                                type='checkbox'
                                checked={settings.scanOverviews}
                                onChange={event => updateSettings({
                                    scanOverviews: event.currentTarget.checked
                                })}
                            />
                            Beschreibungen
                        </label>
                    </div>
                </div>

                <label className='minitigerSettingsField'>
                    <span>Titel erst ab mindestens X Wörtern prüfen</span>
                    <input
                        type='number'
                        min='3'
                        max='12'
                        value={settings.minTitleWords}
                        onChange={event => updateSettings({
                            minTitleWords: Number(event.currentTarget.value)
                        })}
                    />
                </label>

                <label className='minitigerSettingsToggle'>
                    <input
                        type='checkbox'
                        checked={settings.protectFranchise}
                        onChange={event => updateSettings({
                            protectFranchise: event.currentTarget.checked
                        })}
                    />
                    <span>
                        <strong>Franchise-/Eigennamen besonders schützen</strong>
                        <small>
                            Etablierte Werktitel, Eigennamen, Marken und fiktive
                            Begriffe bleiben erhalten, wenn eine Übersetzung nicht
                            natürlich sinnvoll ist.
                        </small>
                    </span>
                </label>

                <label className='minitigerSettingsToggle'>
                    <input
                        type='checkbox'
                        checked={settings.cleanMetadata}
                        onChange={event => updateSettings({
                            cleanMetadata: event.currentTarget.checked
                        })}
                    />
                    <span>
                        <strong>Quellen &amp; kaputtes Markup bereinigen</strong>
                        <small>
                            Entfernt Quellenhinweise, HTML-/Pseudo-Tags und typische
                            BBCode-Reste vor der Übersetzung.
                        </small>
                    </span>
                </label>

                <label className='minitigerSettingsToggle'>
                    <input
                        type='checkbox'
                        checked={settings.autoSequential}
                        onChange={event => updateSettings({
                            autoSequential: event.currentTarget.checked
                        })}
                    />
                    <span>
                        <strong>Sequenzieller Automatikmodus · 1 → 1 → 1</strong>
                        <small>
                            Prüft ein Element, übersetzt es und schreibt es direkt
                            nach Jellyfin. Erst danach folgt das nächste Element.
                        </small>
                    </span>
                </label>

                <div className='minitigerTranslationRunGrid'>
                    <label>
                        <span>API-Batchgröße</span>
                        <input
                            type='number'
                            min='1'
                            max='10'
                            disabled={settings.autoSequential}
                            value={settings.batchSize}
                            onChange={event => updateSettings({
                                batchSize: Number(event.currentTarget.value)
                            })}
                        />
                    </label>
                    <label>
                        <span>Max. Übersetzungen pro Durchlauf</span>
                        <input
                            type='number'
                            min='1'
                            value={settings.maxPerRun}
                            onChange={event => updateSettings({
                                maxPerRun: Number(event.currentTarget.value)
                            })}
                        />
                        <small>
                            Kein festes 500er-Limit mehr. Kosten und Laufzeit steigen entsprechend mit deinem Wert.
                        </small>
                    </label>
                </div>

                <p className='minitigerSettingsHint'>
                    {settings.autoSequential
                        ? 'Im 1→1→1-Modus wird immer exakt ein Kandidat verarbeitet; die Batchgröße wird ignoriert. Ein gestarteter Lauf läuft beim Schließen oder Tabwechsel im Hintergrund weiter, solange dieser Jellyfin-Web-Client geöffnet bleibt.'
                        : 'Im normalen Modus bestimmt die Batchgröße, wie viele Kandidaten pro OpenAI-Anfrage verarbeitet werden. Laufende Scans/Übersetzungen bleiben beim Schließen des Minitiger-Fensters aktiv, solange dieser Jellyfin-Web-Client geöffnet bleibt.'}
                </p>

                <div className='minitigerTranslationButtons'>
                    <button
                        type='button'
                        className='isPrimary'
                        disabled={scanBusy || translationBusy}
                        onClick={() => void startScan()}
                    >
                        {scanBusy
                            ? settings.autoSequential
                                ? '1 → 1 → 1 läuft …'
                                : 'Scan läuft …'
                            : settings.autoSequential
                                ? '1 → 1 → 1 starten'
                                : 'Bibliotheken scannen'}
                    </button>
                    <button
                        type='button'
                        disabled={!scanBusy && !translationBusy}
                        onClick={() => {
                            abortRef.current = true;
                            setStatus('Stop angefordert …');
                        }}
                    >
                        {settings.autoSequential
                            ? 'Automatik stoppen'
                            : 'Scan abbrechen'}
                    </button>
                </div>

                <div className='minitigerTranslationStatus'>
                    {status}
                </div>
            </section>

            <section className='minitigerSettingsCard'>
                <h4>2. Prüfen, übersetzen &amp; übernehmen</h4>

                <div className='minitigerTranslationStatus'>
                    {candidates.length
                        ? `${candidates.length} Kandidaten · ${openCount} offen · ${readyCount} übersetzt · ${appliedCount} übernommen · API-Nutzung dieser Sitzung: ${usage.input} Input / ${usage.output} Output Tokens`
                        : 'Nach einem Scan erscheinen hier die gefundenen Kandidaten.'}
                </div>

                <div className='minitigerTranslationButtons'>
                    <button
                        type='button'
                        className='isPrimary'
                        disabled={
                            translationBusy
                            || scanBusy
                            || !candidates.length
                            || settings.autoSequential
                        }
                        onClick={() => void translateSelected()}
                    >
                        Ausgewählte übersetzen
                    </button>
                    <button
                        type='button'
                        disabled={
                            translationBusy
                            || scanBusy
                            || !readyCount
                            || settings.autoSequential
                        }
                        onClick={() => void applySelected()}
                    >
                        Fertige ausgewählte übernehmen
                    </button>
                </div>

                <div className='minitigerTranslationResults'>
                    {!pageCandidates.length && (
                        <div className='minitigerTranslationEmpty'>
                            Noch keine Kandidaten vorhanden.
                        </div>
                    )}

                    {pageCandidates.map(candidate => (
                        <article
                            key={candidate.id}
                            className='minitigerTranslationResult'
                        >
                            <div className='minitigerTranslationResultTop'>
                                <div className='minitigerTranslationResultIdentity'>
                                    <input
                                        type='checkbox'
                                        checked={candidate.selected}
                                        disabled={candidate.status === 'applied'}
                                        onChange={event => updateCandidate(
                                            candidate.id,
                                            {
                                                selected:
                                                    event.currentTarget.checked
                                            }
                                        )}
                                    />
                                    <div>
                                        <div className='minitigerTranslationResultTitle'>
                                            {candidate.name || '(ohne Titel)'}
                                        </div>
                                        <div className='minitigerTranslationMeta'>
                                            {candidatePath(candidate)}
                                        </div>
                                    </div>
                                </div>
                                <span
                                    className={
                                        `minitigerTranslationChip is-${candidate.status}`
                                    }
                                >
                                    {statusLabel(candidate.status)}
                                </span>
                            </div>

                            {candidate.titleCandidate && (
                                <div className='minitigerTranslationField'>
                                    <div className='minitigerTranslationFieldLabel'>
                                        Titel
                                    </div>
                                    <div className='minitigerTranslationCompare'>
                                        <div>
                                            <strong>Original</strong>
                                            <div className='minitigerTranslationOriginal'>
                                                {candidate.name || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Deutsch / Vorschlag</strong>
                                            {candidate.status === 'ready'
                                                || candidate.status === 'applied'
                                                ? (
                                                    <textarea
                                                        rows={2}
                                                        disabled={candidate.status === 'applied'}
                                                        value={
                                                            candidate.translatedTitle
                                                            || candidate.name
                                                        }
                                                        onChange={event => updateCandidate(
                                                            candidate.id,
                                                            {
                                                                translatedTitle:
                                                                    event.currentTarget.value
                                                            }
                                                        )}
                                                    />
                                                )
                                                : (
                                                    <div className='minitigerTranslationOriginal'>
                                                        Noch nicht übersetzt.
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {candidate.overviewCandidate && (
                                <div className='minitigerTranslationField'>
                                    <div className='minitigerTranslationFieldLabel'>
                                        Beschreibung
                                    </div>
                                    <div className='minitigerTranslationCompare'>
                                        <div>
                                            <strong>Original</strong>
                                            <div className='minitigerTranslationOriginal'>
                                                {candidate.overview || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>Deutsch / Vorschlag</strong>
                                            {candidate.status === 'ready'
                                                || candidate.status === 'applied'
                                                ? (
                                                    <textarea
                                                        rows={6}
                                                        disabled={candidate.status === 'applied'}
                                                        value={
                                                            candidate.translatedOverview
                                                            || candidate.overview
                                                        }
                                                        onChange={event => updateCandidate(
                                                            candidate.id,
                                                            {
                                                                translatedOverview:
                                                                    event.currentTarget.value
                                                            }
                                                        )}
                                                    />
                                                )
                                                : (
                                                    <div className='minitigerTranslationOriginal'>
                                                        Noch nicht übersetzt.
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {candidate.note && (
                                <p className='minitigerSettingsHint'>
                                    Hinweis: {candidate.note}
                                </p>
                            )}
                            {candidate.error && (
                                <p className='minitigerTranslationError'>
                                    {candidate.error}
                                </p>
                            )}

                            <div className='minitigerTranslationRowActions'>
                                {candidate.status !== 'applied' && (
                                    <button
                                        type='button'
                                        disabled={translationBusy || scanBusy}
                                        onClick={() => void translateOne(candidate)}
                                    >
                                        Übersetzen
                                    </button>
                                )}
                                {candidate.status === 'ready' && (
                                    <button
                                        type='button'
                                        className='isPrimary'
                                        disabled={translationBusy || scanBusy}
                                        onClick={() => void applyOne(candidate)}
                                    >
                                        Übernehmen
                                    </button>
                                )}
                                {candidate.status === 'applied' ? (
                                    <button
                                        type='button'
                                        disabled={translationBusy || scanBusy}
                                        onClick={() => void applyOne(candidate, true)}
                                    >
                                        Rückgängig
                                    </button>
                                ) : (
                                    <button
                                        type='button'
                                        disabled={translationBusy || scanBusy}
                                        onClick={() => updateCandidate(
                                            candidate.id,
                                            {
                                                selected: false,
                                                status: 'skipped'
                                            }
                                        )}
                                    >
                                        Überspringen
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>

                {candidates.length > PAGE_SIZE && (
                    <div className='minitigerTranslationPager'>
                        <button
                            type='button'
                            disabled={pageIndex <= 0}
                            onClick={() => setPageIndex(index =>
                                Math.max(0, index - 1)
                            )}
                        >
                            ←
                        </button>
                        <span>
                            Seite {pageIndex + 1} / {pageCount}
                        </span>
                        <button
                            type='button'
                            disabled={pageIndex >= pageCount - 1}
                            onClick={() => setPageIndex(index =>
                                Math.min(pageCount - 1, index + 1)
                            )}
                        >
                            →
                        </button>
                    </div>
                )}
            </section>
        </>
    );
};

export default MinitigerTranslationSettings;
/* MINITIGER_PATCH_MARKER: PHASE_18_13_0_TEST_STABILITY_TRANSLATOR_BACKGROUND */

// MINITIGER_PATCH_MARKER: PHASE_18_18_0_BACKGROUND_TRANSLATION_PANEL
