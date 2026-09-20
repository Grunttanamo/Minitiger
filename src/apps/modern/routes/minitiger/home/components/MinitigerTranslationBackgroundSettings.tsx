import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import { getMinitigerAccessToken } from '../apiAuth';

type BackgroundMode =
    | 'scheduled'
    | 'continuous111';

interface BackgroundSettings {
    enabled: boolean;
    mode: BackgroundMode;
    intervalMinutes: number;
    apiKey: string;
    hasApiKey: boolean;
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
    cleanMetadata: boolean;
}

interface BackgroundStatus {
    workerOnline: boolean;
    workerStartedUtc?: string | null;
    heartbeatUtc?: string | null;
    enabled: boolean;
    running: boolean;
    state: string;
    mode: string;
    message: string;
    currentItem: string;
    lastError: string;
    lastRunUtc?: string | null;
    nextRunUtc?: string | null;
    lastApiTestUtc?: string | null;
    lastApiTestOk?: boolean | null;
    lastApiTestMessage: string;
    configuredLibraries: number;
    resolvedLibraries: number;
    checked: number;
    found: number;
    applied: number;
    errors: number;
    inputTokens: number;
    outputTokens: number;
}

interface TranslationLibrary {
    id: string;
    name: string;
    collectionType: string;
}

interface UserViewLike {
    Id?: string | null;
    Name?: string | null;
    CollectionType?: string | null;
}

interface ApiTestResult {
    ok: boolean;
    statusCode: number;
    model: string;
    message: string;
}

const DEFAULT_SETTINGS: BackgroundSettings = {
    enabled: false,
    mode: 'scheduled',
    intervalMinutes: 30,
    apiKey: '',
    hasApiKey: false,
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
    cleanMetadata: true
};

const toLocalDate = (
    value?: string | null
) => (
    value
        ? new Date(value).toLocaleString('de-DE')
        : '–'
);

const normalizeMode = (
    value: unknown
): BackgroundMode => (
    value === 'continuous111'
        ? 'continuous111'
        : 'scheduled'
);

const pick = (
    value: Record<string, unknown>,
    camel: string,
    pascal: string
) => value[camel] ?? value[pascal];

const normalizeLibrary = (
    raw: unknown
): TranslationLibrary | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const source =
        raw as Record<string, unknown>;

    const id = String(
        pick(source, 'id', 'Id') ?? ''
    ).trim();
    const name = String(
        pick(source, 'name', 'Name') ?? ''
    ).trim();
    const collectionType = String(
        pick(
            source,
            'collectionType',
            'CollectionType'
        ) ?? ''
    ).trim();

    if (!id || !name) {
        return null;
    }

    return {
        id,
        name,
        collectionType
    };
};

const normalizeStatus = (
    raw: unknown
): BackgroundStatus | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const source =
        raw as Record<string, unknown>;

    const stringValue = (
        camel: string,
        pascal: string
    ) => String(
        pick(source, camel, pascal) ?? ''
    );

    const numberValue = (
        camel: string,
        pascal: string
    ) => Number(
        pick(source, camel, pascal) ?? 0
    );

    const nullableString = (
        camel: string,
        pascal: string
    ) => {
        const value =
            pick(source, camel, pascal);

        return value == null
            ? null
            : String(value);
    };

    const lastApiTestOk =
        pick(
            source,
            'lastApiTestOk',
            'LastApiTestOk'
        );

    return {
        workerOnline: Boolean(
            pick(
                source,
                'workerOnline',
                'WorkerOnline'
            )
        ),
        workerStartedUtc:
            nullableString(
                'workerStartedUtc',
                'WorkerStartedUtc'
            ),
        heartbeatUtc:
            nullableString(
                'heartbeatUtc',
                'HeartbeatUtc'
            ),
        enabled: Boolean(
            pick(source, 'enabled', 'Enabled')
        ),
        running: Boolean(
            pick(source, 'running', 'Running')
        ),
        state:
            stringValue('state', 'State'),
        mode:
            stringValue('mode', 'Mode'),
        message:
            stringValue('message', 'Message'),
        currentItem:
            stringValue(
                'currentItem',
                'CurrentItem'
            ),
        lastError:
            stringValue(
                'lastError',
                'LastError'
            ),
        lastRunUtc:
            nullableString(
                'lastRunUtc',
                'LastRunUtc'
            ),
        nextRunUtc:
            nullableString(
                'nextRunUtc',
                'NextRunUtc'
            ),
        lastApiTestUtc:
            nullableString(
                'lastApiTestUtc',
                'LastApiTestUtc'
            ),
        lastApiTestOk:
            lastApiTestOk == null
                ? null
                : Boolean(lastApiTestOk),
        lastApiTestMessage:
            stringValue(
                'lastApiTestMessage',
                'LastApiTestMessage'
            ),
        configuredLibraries:
            numberValue(
                'configuredLibraries',
                'ConfiguredLibraries'
            ),
        resolvedLibraries:
            numberValue(
                'resolvedLibraries',
                'ResolvedLibraries'
            ),
        checked:
            numberValue('checked', 'Checked'),
        found:
            numberValue('found', 'Found'),
        applied:
            numberValue('applied', 'Applied'),
        errors:
            numberValue('errors', 'Errors'),
        inputTokens:
            numberValue(
                'inputTokens',
                'InputTokens'
            ),
        outputTokens:
            numberValue(
                'outputTokens',
                'OutputTokens'
            )
    };
};

const normalizeApiTestResult = (
    raw: unknown
): ApiTestResult => {
    const source =
        raw && typeof raw === 'object'
            ? raw as Record<string, unknown>
            : {};

    return {
        ok: Boolean(
            pick(source, 'ok', 'Ok')
        ),
        statusCode: Number(
            pick(
                source,
                'statusCode',
                'StatusCode'
            ) ?? 0
        ),
        model: String(
            pick(source, 'model', 'Model')
            ?? ''
        ),
        message: String(
            pick(source, 'message', 'Message')
            ?? 'Keine Meldung vom Companion erhalten.'
        )
    };
};

const MinitigerTranslationBackgroundSettings = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const [
        settings,
        setSettings
    ] = useState<BackgroundSettings>({
        ...DEFAULT_SETTINGS
    });

    const [
        status,
        setStatus
    ] = useState<BackgroundStatus | null>(
        null
    );

    const [
        libraries,
        setLibraries
    ] = useState<TranslationLibrary[]>([]);

    const [
        message,
        setMessage
    ] = useState('');

    const [
        apiTestMessage,
        setApiTestMessage
    ] = useState('');

    const [
        busyAction,
        setBusyAction
    ] = useState('');

    const [
        showKey,
        setShowKey
    ] = useState(false);

    const apiUrl = (
        path:
            | 'Settings'
            | 'Status'
            | 'Libraries'
            | 'TestApi'
            | 'RunNow'
            | 'Stop'
    ) => {
        if (!apiClient) {
            return '';
        }

        const token =
            getMinitigerAccessToken(
                apiClient
            );

        return apiClient.getUrl(
            `Minitiger/Translation/${path}`,
            token
                ? { ApiKey: token }
                : {}
        );
    };

    const migrateLibraryIds = async (
        incomingIds: string[],
        serverLibraries: TranslationLibrary[]
    ) => {
        const validIds =
            new Set(
                serverLibraries.map(
                    library => library.id
                )
            );

        if (
            incomingIds.every(id =>
                validIds.has(id)
            )
        ) {
            return incomingIds;
        }

        if (
            !apiClient
            || !user?.Id
        ) {
            return incomingIds.filter(id =>
                validIds.has(id)
            );
        }

        try {
            const views =
                await apiClient.getUserViews(
                    {},
                    user.Id
                );

            const userViews =
                (
                    views?.Items
                    ?? []
                ) as UserViewLike[];

            const mapped =
                incomingIds
                    .map(id => {
                        if (validIds.has(id)) {
                            return id;
                        }

                        const oldView =
                            userViews.find(view =>
                                String(
                                    view.Id
                                    ?? ''
                                ) === id
                            );

                        if (!oldView) {
                            return '';
                        }

                        const oldName =
                            String(
                                oldView.Name
                                ?? ''
                            ).trim();

                        const oldType =
                            String(
                                oldView.CollectionType
                                ?? ''
                            ).toLowerCase();

                        const match =
                            serverLibraries.find(
                                library =>
                                    library.name.trim()
                                        === oldName
                                    && library.collectionType
                                        .toLowerCase()
                                        === oldType
                            );

                        return match?.id ?? '';
                    })
                    .filter(Boolean);

            return Array.from(
                new Set(mapped)
            );
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Alte UserView-Bibliotheks-IDs konnten nicht automatisch migriert werden.',
                error
            );

            return incomingIds.filter(id =>
                validIds.has(id)
            );
        }
    };

    const loadStatus = async () => {
        if (!apiClient) {
            return;
        }

        try {
            const response =
                await fetch(
                    apiUrl('Status')
                );

            if (response.ok) {
                setStatus(
                    normalizeStatus(
                        await response.json()
                    )
                );
            }
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Background status unavailable',
                error
            );
        }
    };

    const loadConfiguration = async () => {
        if (!apiClient) {
            return;
        }

        try {
            const [
                settingsResponse,
                librariesResponse
            ] = await Promise.all([
                fetch(apiUrl('Settings')),
                fetch(apiUrl('Libraries'))
            ]);

            let serverLibraries:
                TranslationLibrary[] = [];

            if (librariesResponse.ok) {
                const rawLibraries =
                    await librariesResponse.json();

                serverLibraries =
                    (
                        Array.isArray(rawLibraries)
                            ? rawLibraries
                            : []
                    )
                        .map(normalizeLibrary)
                        .filter(
                            (
                                library
                            ): library is TranslationLibrary =>
                                Boolean(library)
                        );

                setLibraries(
                    serverLibraries
                        .slice()
                        .sort((left, right) =>
                            left.name.localeCompare(
                                right.name,
                                'de',
                                { numeric: true }
                            )
                        )
                );
            }

            if (settingsResponse.ok) {
                const value =
                    (await settingsResponse.json()) as Partial<BackgroundSettings>;

                const incomingIds =
                    Array.isArray(value.libraryIds)
                        ? value.libraryIds
                            .map(String)
                            .filter(Boolean)
                        : [];

                const migratedIds =
                    await migrateLibraryIds(
                        incomingIds,
                        serverLibraries
                    );

                setSettings(current => ({
                    ...current,
                    ...value,
                    mode:
                        normalizeMode(
                            value.mode
                        ),
                    libraryIds:
                        migratedIds,
                    apiKey:
                        current.apiKey,
                    hasApiKey:
                        value.hasApiKey === true
                }));

                if (
                    incomingIds.length
                    && migratedIds.join('|')
                        !== incomingIds.join('|')
                ) {
                    setMessage(
                        'Die alten Client-Bibliotheks-IDs wurden auf echte Jellyfin-Serverbibliotheken umgestellt. Bitte einmal „Speichern & starten“ drücken.'
                    );
                }
            }
        } catch (error) {
            console.warn(
                '[Minitiger Translation] Background configuration unavailable',
                error
            );

            setMessage(
                `Companion-Konfiguration nicht erreichbar: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        }
    };

    useEffect(() => {
        if (!apiClient) {
            return;
        }

        void loadConfiguration();
        void loadStatus();

        const timer =
            window.setInterval(
                () => {
                    void loadStatus();
                },
                3000
            );

        return () =>
            window.clearInterval(timer);
    }, [
        apiClient,
        user?.Id
    ]);

    const save = async (
        overrides: Partial<BackgroundSettings> = {}
    ) => {
        if (!apiClient) {
            return false;
        }

        const next: BackgroundSettings = {
            ...settings,
            ...overrides
        };

        setSettings(next);
        setBusyAction('save');
        setMessage(
            'Server-Einstellungen werden gespeichert …'
        );

        try {
            const response = await fetch(
                apiUrl('Settings'),
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        enabled:
                            next.enabled,
                        mode:
                            next.mode,
                        intervalMinutes:
                            next.intervalMinutes,
                        apiKey:
                            next.apiKey,
                        model:
                            next.model,
                        minTitleWords:
                            next.minTitleWords,
                        protectFranchise:
                            next.protectFranchise,
                        scanTitles:
                            next.scanTitles,
                        scanOverviews:
                            next.scanOverviews,
                        itemSeries:
                            next.itemSeries,
                        itemSeasons:
                            next.itemSeasons,
                        itemEpisodes:
                            next.itemEpisodes,
                        itemMovies:
                            next.itemMovies,
                        libraryIds:
                            next.libraryIds,
                        batchSize:
                            next.batchSize,
                        maxPerRun:
                            next.maxPerRun,
                        cleanMetadata:
                            next.cleanMetadata
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Companion HTTP ${response.status}`
                );
            }

            const nowHasKey =
                Boolean(
                    next.apiKey.trim()
                    || next.hasApiKey
                );

            setSettings(current => ({
                ...current,
                enabled:
                    next.enabled,
                apiKey: '',
                hasApiKey:
                    nowHasKey
            }));

            setMessage(
                next.enabled
                    ? 'Einstellungen gespeichert – Hintergrundbetrieb ist aktiv. ♥'
                    : 'Einstellungen gespeichert.'
            );

            await loadStatus();

            return true;
        } catch (error) {
            setMessage(
                `Fehler: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );

            return false;
        } finally {
            setBusyAction('');
        }
    };

    const testApi = async () => {
        if (!apiClient) {
            return;
        }

        setBusyAction('test');
        setApiTestMessage(
            'API-Key und Modell werden geprüft …'
        );

        try {
            const response = await fetch(
                apiUrl('TestApi'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        apiKey:
                            settings.apiKey,
                        model:
                            settings.model
                    })
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Companion HTTP ${response.status}`
                );
            }

            const result =
                normalizeApiTestResult(
                    await response.json()
                );

            setApiTestMessage(
                result.ok
                    ? `✓ ${result.message}`
                    : `✗ ${result.message}`
            );

            await loadStatus();
        } catch (error) {
            setApiTestMessage(
                `✗ Test fehlgeschlagen: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        } finally {
            setBusyAction('');
        }
    };

    const runNow = async () => {
        if (!apiClient) {
            return;
        }

        setBusyAction('run');

        if (!await save()) {
            setBusyAction('');
            return;
        }

        setBusyAction('run');

        try {
            const response = await fetch(
                apiUrl('RunNow'),
                { method: 'POST' }
            );

            if (!response.ok) {
                throw new Error(
                    `Companion HTTP ${response.status}`
                );
            }

            setMessage(
                'Serverlauf angefordert. Der Worker läuft jetzt unabhängig vom Client.'
            );

            window.setTimeout(
                () => {
                    void loadStatus();
                },
                500
            );
        } catch (error) {
            setMessage(
                `Fehler: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        } finally {
            setBusyAction('');
        }
    };

    const start = async () => {
        await save({
            enabled: true
        });
    };

    const stop = async () => {
        if (!apiClient) {
            return;
        }

        setBusyAction('stop');
        setMessage(
            'Sauberer Stop wird angefordert …'
        );

        try {
            const response = await fetch(
                apiUrl('Stop'),
                { method: 'POST' }
            );

            if (!response.ok) {
                throw new Error(
                    `Companion HTTP ${response.status}`
                );
            }

            setSettings(current => ({
                ...current,
                enabled: false
            }));

            setMessage(
                'Hintergrundbetrieb wurde deaktiviert. Ein laufender OpenAI-/Jellyfin-Schritt wird kontrolliert abgebrochen.'
            );

            await Promise.all([
                loadConfiguration(),
                loadStatus()
            ]);
        } catch (error) {
            setMessage(
                `Stop fehlgeschlagen: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        } finally {
            setBusyAction('');
        }
    };

    const selected =
        useMemo(
            () => new Set(
                settings.libraryIds
            ),
            [settings.libraryIds]
        );

    const patch = (
        value: Partial<BackgroundSettings>
    ) => setSettings(current => ({
        ...current,
        ...value
    }));

    const heartbeatStale =
        Boolean(
            status?.workerOnline
            && status.heartbeatUtc
            && (
                Date.now()
                - new Date(
                    status.heartbeatUtc
                ).getTime()
            ) > 20_000
        );

    const statusHeadline = (() => {
        if (!status) {
            return '… Status wird geladen';
        }

        if (
            !status.workerOnline
            || heartbeatStale
        ) {
            return '⚠ Worker nicht aktiv';
        }

        if (status.running) {
            return settings.mode
                === 'continuous111'
                    ? '● AKTIV – 1→1→1 läuft'
                    : '● AKTIV – Übersetzung läuft';
        }

        if (status.enabled) {
            return '● AKTIV – wartet';
        }

        return '○ BEREIT – Automatik aus';
    })();

    return (
        <section className='minitigerSettingsCard'>
            <h4>
                Server-Hintergrundbetrieb
            </h4>

            <p className='minitigerSettingsHint'>
                Läuft direkt im Minitiger Companion Plugin.
                Sobald hier „AKTIV“ steht, darfst du Browser
                und Desktop-Client komplett schließen.
            </p>

            <div className='minitigerTranslationWarning'>
                <strong>
                    {statusHeadline}
                </strong>

                {status && (
                    <>
                        <br />
                        {status.message}

                        <br />
                        Worker:{' '}
                        {status.workerOnline
                            && !heartbeatStale
                            ? 'online'
                            : 'offline / kein Heartbeat'}

                        {' · '}Modus:{' '}
                        {status.mode === 'continuous111'
                            ? 'Dauerhaft 1→1→1'
                            : 'Intervall / Batch'}

                        {' · '}Bibliotheken:{' '}
                        {status.resolvedLibraries}
                        {' / '}
                        {status.configuredLibraries}

                        {status.currentItem && (
                            <>
                                <br />
                                Aktuell:{' '}
                                {status.currentItem}
                            </>
                        )}

                        <br />
                        Geprüft: {status.checked}
                        {' · '}Kandidaten: {status.found}
                        {' · '}Übernommen: {status.applied}
                        {' · '}Fehler: {status.errors}

                        <br />
                        Tokens: {status.inputTokens}
                        {' rein · '}
                        {status.outputTokens} raus

                        <br />
                        Letzter Lauf:{' '}
                        {toLocalDate(
                            status.lastRunUtc
                        )}

                        {' · '}Nächster Lauf:{' '}
                        {toLocalDate(
                            status.nextRunUtc
                        )}

                        <br />
                        Heartbeat:{' '}
                        {toLocalDate(
                            status.heartbeatUtc
                        )}

                        {status.lastError && (
                            <>
                                <br />
                                Letzter Fehler:{' '}
                                {status.lastError}
                            </>
                        )}
                    </>
                )}
            </div>

            <label className='minitigerSettingsField'>
                <span>Betriebsart</span>
                <select
                    value={settings.mode}
                    onChange={event =>
                        patch({
                            mode:
                                normalizeMode(
                                    event.currentTarget.value
                                )
                        })
                    }
                >
                    <option value='scheduled'>
                        Intervall / Batch
                    </option>
                    <option value='continuous111'>
                        Dauerhaft 1 → 1 → 1
                    </option>
                </select>

                <small>
                    {settings.mode === 'continuous111'
                        ? 'Verarbeitet immer exakt einen Kandidaten vollständig: finden → übersetzen → direkt in Jellyfin schreiben → nächster Kandidat. Das Sicherheitslimit gilt pro Runde; danach wartet der Dienst bis zum nächsten Scan und läuft dauerhaft weiter.'
                        : 'Verarbeitet pro OpenAI-Aufruf mehrere Kandidaten entsprechend der Batch-Größe.'}
                </small>
            </label>

            <label className='minitigerSettingsField'>
                <span>
                    {settings.mode === 'continuous111'
                        ? 'Wartezeit bis zum nächsten Kontroll-Scan'
                        : 'Intervall'}
                </span>

                <select
                    value={
                        settings.intervalMinutes
                    }
                    onChange={event =>
                        patch({
                            intervalMinutes:
                                Number(
                                    event.currentTarget.value
                                )
                        })
                    }
                >
                    <option value='1'>
                        Jede Minute
                    </option>
                    <option value='5'>
                        Alle 5 Minuten
                    </option>
                    <option value='15'>
                        Alle 15 Minuten
                    </option>
                    <option value='30'>
                        Alle 30 Minuten
                    </option>
                    <option value='60'>
                        Stündlich
                    </option>
                    <option value='180'>
                        Alle 3 Stunden
                    </option>
                    <option value='360'>
                        Alle 6 Stunden
                    </option>
                    <option value='720'>
                        Alle 12 Stunden
                    </option>
                    <option value='1440'>
                        Täglich
                    </option>
                </select>
            </label>

            <div className='minitigerTranslationOptions'>
                <label className='minitigerSettingsField'>
                    <span>
                        Max. Übersetzungen pro Lauf
                    </span>
                    <input
                        type='number'
                        min='1'
                        max='1000'
                        value={settings.maxPerRun}
                        onChange={event =>
                            patch({
                                maxPerRun:
                                    Math.max(
                                        1,
                                        Number(
                                            event.currentTarget.value
                                        ) || 1
                                    )
                            })
                        }
                    />
                </label>

                <label className='minitigerSettingsField'>
                    <span>
                        Batch-Größe
                    </span>
                    <input
                        type='number'
                        min='1'
                        max='10'
                        disabled={
                            settings.mode
                                === 'continuous111'
                        }
                        value={
                            settings.mode
                                === 'continuous111'
                                ? 1
                                : settings.batchSize
                        }
                        onChange={event =>
                            patch({
                                batchSize:
                                    Math.min(
                                        10,
                                        Math.max(
                                            1,
                                            Number(
                                                event.currentTarget.value
                                            ) || 1
                                        )
                                    )
                            })
                        }
                    />
                </label>
            </div>

            <label className='minitigerSettingsField'>
                <span>
                    OpenAI API-Key für den Server
                </span>

                <div className='minitigerTranslationKeyRow'>
                    <input
                        type={
                            showKey
                                ? 'text'
                                : 'password'
                        }
                        autoComplete='off'
                        spellCheck={false}
                        value={settings.apiKey}
                        placeholder={
                            settings.hasApiKey
                                ? 'Server-Key bereits gespeichert'
                                : 'sk-…'
                        }
                        onChange={event =>
                            patch({
                                apiKey:
                                    event.currentTarget.value
                            })
                        }
                    />

                    <button
                        type='button'
                        onClick={() =>
                            setShowKey(
                                value => !value
                            )
                        }
                    >
                        {showKey
                            ? 'Verbergen'
                            : 'Anzeigen'}
                    </button>
                </div>

                <small>
                    Ein leeres Feld verwendet den bereits
                    gespeicherten Server-Key weiter.
                </small>
            </label>

            <label className='minitigerSettingsField'>
                <span>Modell</span>
                <input
                    type='text'
                    value={settings.model}
                    onChange={event =>
                        patch({
                            model:
                                event.currentTarget.value
                        })
                    }
                />
            </label>

            <div className='minitigerBackupButtons'>
                <button
                    type='button'
                    disabled={
                        Boolean(busyAction)
                    }
                    onClick={() => {
                        void testApi();
                    }}
                >
                    API-Key &amp; Modell testen
                </button>
            </div>

            {(apiTestMessage
                || status?.lastApiTestMessage) && (
                <p className='minitigerSettingsHint'>
                    {apiTestMessage
                        || (
                            status?.lastApiTestOk
                                ? `✓ ${status.lastApiTestMessage}`
                                : `✗ ${status?.lastApiTestMessage}`
                        )}
                </p>
            )}

            <div className='minitigerTranslationLibraries'>
                {libraries.map(library => (
                    <label
                        key={library.id}
                        className='minitigerTranslationLibrary'
                    >
                        <input
                            type='checkbox'
                            checked={
                                selected.has(
                                    library.id
                                )
                            }
                            onChange={event =>
                                patch({
                                    libraryIds:
                                        event.currentTarget.checked
                                            ? Array.from(
                                                new Set([
                                                    ...settings.libraryIds,
                                                    library.id
                                                ])
                                            )
                                            : settings.libraryIds
                                                .filter(
                                                    id =>
                                                        id !== library.id
                                                )
                                })
                            }
                        />

                        <span>
                            <strong>
                                {library.name}
                            </strong>
                            <small>
                                {library.collectionType
                                    .toLowerCase()
                                    === 'tvshows'
                                    ? 'Serien'
                                    : 'Filme'}
                                {' · Serverbibliothek'}
                            </small>
                        </span>
                    </label>
                ))}
            </div>

            {!libraries.length && (
                <div className='minitigerTranslationWarning'>
                    Keine echten Jellyfin-Serverbibliotheken
                    vom Companion Plugin empfangen.
                </div>
            )}

            <div className='minitigerTranslationOptions'>
                {([
                    [
                        'itemSeries',
                        'Serien'
                    ],
                    [
                        'itemSeasons',
                        'Staffeln'
                    ],
                    [
                        'itemEpisodes',
                        'Folgen'
                    ],
                    [
                        'itemMovies',
                        'Filme'
                    ],
                    [
                        'scanTitles',
                        'Titel prüfen'
                    ],
                    [
                        'scanOverviews',
                        'Beschreibungen prüfen'
                    ],
                    [
                        'protectFranchise',
                        'Franchise-Titel schützen'
                    ],
                    [
                        'cleanMetadata',
                        'Quellen/Markup bereinigen'
                    ]
                ] as const).map(([
                    key,
                    label
                ]) => (
                    <label
                        key={key}
                        className='minitigerSettingsToggle'
                    >
                        <input
                            type='checkbox'
                            checked={
                                Boolean(
                                    settings[key]
                                )
                            }
                            onChange={event =>
                                patch({
                                    [key]:
                                        event.currentTarget
                                            .checked
                                } as Partial<BackgroundSettings>)
                            }
                        />

                        <span>
                            <strong>
                                {label}
                            </strong>
                        </span>
                    </label>
                ))}
            </div>

            <div className='minitigerBackupButtons'>
                <button
                    type='button'
                    disabled={
                        Boolean(busyAction)
                    }
                    onClick={() => {
                        void save();
                    }}
                >
                    Einstellungen speichern
                </button>

                <button
                    type='button'
                    className='isPrimary'
                    disabled={
                        Boolean(busyAction)
                    }
                    onClick={() => {
                        void start();
                    }}
                >
                    Speichern &amp; starten
                </button>

                <button
                    type='button'
                    disabled={
                        Boolean(busyAction)
                    }
                    onClick={() => {
                        void runNow();
                    }}
                >
                    Jetzt einmal ausführen
                </button>

                <button
                    type='button'
                    disabled={
                        Boolean(busyAction)
                        || (
                            !status?.enabled
                            && !status?.running
                        )
                    }
                    onClick={() => {
                        void stop();
                    }}
                >
                    Sauber stoppen
                </button>
            </div>

            <p className='minitigerSettingsHint'>
                „Sauber stoppen“ setzt die Server-Automatik
                auf AUS und bricht einen aktuell laufenden
                OpenAI-/Jellyfin-Schritt über ein
                CancellationToken ab. Der Companion Worker
                selbst bleibt geladen und wartet, bis du ihn
                wieder startest.
            </p>

            {message && (
                <p className='minitigerSettingsHint'>
                    {message}
                </p>
            )}
        </section>
    );
};

export default MinitigerTranslationBackgroundSettings;

// MINITIGER_PATCH_MARKER: PHASE_18_18_2_BACKGROUND_CONTROL_UI

// MINITIGER_PATCH_MARKER: PHASE_18_18_2A_DUALCASE_API_NORMALIZATION
