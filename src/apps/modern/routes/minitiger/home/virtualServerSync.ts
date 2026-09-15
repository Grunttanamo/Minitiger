import type { ApiClient } from 'jellyfin-apiclient';

import type { MinitigerVirtualLibrariesConfig } from './config/virtualLibraries';
import { getMinitigerAccessToken } from './apiAuth';

export type MinitigerVirtualMediaKind = 'image' | 'logo' | 'video';
export type MinitigerVirtualVideoFormat = 'mp4' | 'webm';

export interface MinitigerVirtualMediaUploadResult {
    revision: number;
    size: number;
    contentType: string;
}

export class MinitigerVirtualSyncUnavailableError extends Error {
    public constructor(message = 'Minitiger Virtual Sync ist nicht erreichbar.') {
        super(message);
        this.name = 'MinitigerVirtualSyncUnavailableError';
    }
}

const authenticatedUrl = (
    apiClient: ApiClient,
    path: string,
    params: Record<string, unknown> = {}
) => {
    const token = getMinitigerAccessToken(apiClient);

    return apiClient.getUrl(
        path,
        {
            ...params,
            ...(token ? { ApiKey: token } : {})
        }
    );
};

const checkUnavailable = (response: Response) => {
    if (
        response.status === 404
        || response.status === 503
    ) {
        throw new MinitigerVirtualSyncUnavailableError(
            `Minitiger Virtual Sync antwortet mit HTTP ${response.status}.`
        );
    }
};

export const readMinitigerVirtualServerConfig = async (
    apiClient: ApiClient
): Promise<unknown> => {
    const response = await fetch(
        authenticatedUrl(
            apiClient,
            'Minitiger/VirtualLibraries'
        ),
        { method: 'GET' }
    );

    checkUnavailable(response);

    if (!response.ok) {
        throw new Error(
            `Minitiger Virtual Sync GET fehlgeschlagen: ${response.status}`
        );
    }

    return await response.json() as unknown;
};

export const writeMinitigerVirtualServerConfig = async (
    apiClient: ApiClient,
    config: MinitigerVirtualLibrariesConfig
) => {
    const response = await fetch(
        authenticatedUrl(
            apiClient,
            'Minitiger/VirtualLibraries'
        ),
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        }
    );

    checkUnavailable(response);

    if (!response.ok) {
        throw new Error(
            `Minitiger Virtual Sync PUT fehlgeschlagen: ${response.status}`
        );
    }
};

export const uploadMinitigerVirtualServerMedia = async (
    apiClient: ApiClient,
    libraryId: string,
    kind: MinitigerVirtualMediaKind,
    file: Blob,
    fileName: string
): Promise<MinitigerVirtualMediaUploadResult> => {
    const form = new FormData();
    form.append('file', file, fileName);

    const response = await fetch(
        authenticatedUrl(
            apiClient,
            `Minitiger/VirtualLibraries/${encodeURIComponent(libraryId)}/Media/${kind}`
        ),
        {
            method: 'POST',
            body: form
        }
    );

    checkUnavailable(response);

    if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
            `Minitiger Medien-Upload fehlgeschlagen: ${response.status}${details ? ` · ${details}` : ''}`
        );
    }

    return await response.json() as MinitigerVirtualMediaUploadResult;
};

export const deleteMinitigerVirtualServerMedia = async (
    apiClient: ApiClient,
    libraryId: string,
    kind: MinitigerVirtualMediaKind
) => {
    const response = await fetch(
        authenticatedUrl(
            apiClient,
            `Minitiger/VirtualLibraries/${encodeURIComponent(libraryId)}/Media/${kind}`
        ),
        { method: 'DELETE' }
    );

    checkUnavailable(response);

    if (!response.ok) {
        throw new Error(
            `Minitiger Medien-Löschen fehlgeschlagen: ${response.status}`
        );
    }
};

export const getMinitigerVirtualServerMediaUrl = (
    apiClient: ApiClient | undefined,
    libraryId: string,
    kind: MinitigerVirtualMediaKind,
    revision?: number,
    format?: MinitigerVirtualVideoFormat
) => {
    if (!apiClient || !revision) {
        return '';
    }

    return authenticatedUrl(
        apiClient,
        `Minitiger/VirtualLibraries/${encodeURIComponent(libraryId)}/Media/${kind}`,
        {
            v: revision,
            ...(kind === 'video' && format ? { format } : {})
        }
    );
};
