import type { ApiClient } from 'jellyfin-apiclient';

import { getMinitigerAccessToken } from './apiAuth';

export interface MinitigerAdminMessageRecipient {
    id: string;
    name: string;
    kind: 'jellyfin' | 'profile';
    parentName?: string;
    isAdministrator?: boolean;
}

export interface MinitigerAdminMessage {
    id: string;
    recipientUserId: string;
    recipientName: string;
    senderUserId: string;
    senderName: string;
    senderAvatarImage: string;
    title: string;
    body: string;
    sentAtUtc: string;
    readAtUtc?: string | null;
}

const authenticatedUrl = (
    apiClient: ApiClient,
    path: string
) => {
    const token = getMinitigerAccessToken(apiClient);

    return apiClient.getUrl(
        path,
        token ? { ApiKey: token } : {}
    );
};

const requestJson = async <T>(
    apiClient: ApiClient,
    path: string,
    init?: RequestInit
): Promise<T> => {
    const response = await fetch(
        authenticatedUrl(apiClient, path),
        init
    );

    if (response.status === 404) {
        throw new Error(
            'Das Minitiger Companion Plugin ist noch nicht auf Phase 18.19 aktualisiert.'
        );
    }

    if (!response.ok) {
        const details = await response.text().catch(() => '');

        throw new Error(
            `Minitiger Admin-Nachrichten HTTP ${response.status}${details ? ` · ${details}` : ''}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return await response.json() as T;
};

const pick = (
    source: Record<string, unknown>,
    camel: string,
    pascal: string
) => source[camel] ?? source[pascal];

const normalizeRecipient = (
    raw: unknown
): MinitigerAdminMessageRecipient | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const id = String(
        pick(source, 'id', 'Id') ?? ''
    ).trim();

    if (!id) {
        return null;
    }

    const rawName = String(
        pick(source, 'name', 'Name') ?? ''
    ).trim();
    const rawKind = String(
        pick(source, 'kind', 'Kind') ?? 'jellyfin'
    ).trim().toLowerCase();
    const parentName = String(
        pick(source, 'parentName', 'ParentName') ?? ''
    ).trim();

    return {
        id,
        name: rawName || id,
        kind: rawKind === 'profile'
            ? 'profile'
            : 'jellyfin',
        ...(parentName ? { parentName } : {}),
        isAdministrator: Boolean(
            pick(
                source,
                'isAdministrator',
                'IsAdministrator'
            )
        )
    };
};

const normalizeMessage = (
    raw: unknown
): MinitigerAdminMessage | null => {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const id = String(
        pick(source, 'id', 'Id') ?? ''
    ).trim();
    const recipientUserId = String(
        pick(
            source,
            'recipientUserId',
            'RecipientUserId'
        ) ?? ''
    ).trim();
    const senderUserId = String(
        pick(
            source,
            'senderUserId',
            'SenderUserId'
        ) ?? ''
    ).trim();
    const title = String(
        pick(source, 'title', 'Title') ?? ''
    );
    const body = String(
        pick(source, 'body', 'Body') ?? ''
    );
    const sentAtUtc = String(
        pick(source, 'sentAtUtc', 'SentAtUtc') ?? ''
    ).trim();

    if (!id || !recipientUserId || !title || !body) {
        return null;
    }

    const rawReadAtUtc = pick(
        source,
        'readAtUtc',
        'ReadAtUtc'
    );

    return {
        id,
        recipientUserId,
        recipientName: String(
            pick(
                source,
                'recipientName',
                'RecipientName'
            ) ?? recipientUserId
        ),
        senderUserId,
        senderName: String(
            pick(
                source,
                'senderName',
                'SenderName'
            ) ?? 'Administrator'
        ),
        senderAvatarImage: String(
            pick(
                source,
                'senderAvatarImage',
                'SenderAvatarImage'
            ) ?? ''
        ).trim(),
        title,
        body,
        sentAtUtc,
        readAtUtc: rawReadAtUtc == null
            ? null
            : String(rawReadAtUtc)
    };
};

const normalizeRecipients = (
    raw: unknown
): MinitigerAdminMessageRecipient[] => (
    Array.isArray(raw)
        ? raw
            .map(normalizeRecipient)
            .filter(
                (
                    value
                ): value is MinitigerAdminMessageRecipient =>
                    Boolean(value)
            )
        : []
);

const normalizeMessages = (
    raw: unknown
): MinitigerAdminMessage[] => (
    Array.isArray(raw)
        ? raw
            .map(normalizeMessage)
            .filter(
                (
                    value
                ): value is MinitigerAdminMessage =>
                    Boolean(value)
            )
        : []
);

export const getMinitigerMessageRecipients = async (
    apiClient: ApiClient
) => normalizeRecipients(
    await requestJson<unknown>(
        apiClient,
        'Minitiger/AdminMessages/Recipients'
    )
);

export const getMinitigerMessageHistory = async (
    apiClient: ApiClient
) => normalizeMessages(
    await requestJson<unknown>(
        apiClient,
        'Minitiger/AdminMessages/History'
    )
);

export const getMinitigerPendingMessages = async (
    apiClient: ApiClient
) => normalizeMessages(
    await requestJson<unknown>(
        apiClient,
        'Minitiger/AdminMessages/Pending'
    )
);

export const sendMinitigerAdminMessage = async (
    apiClient: ApiClient,
    recipientUserId: string,
    title: string,
    body: string
) => {
    const raw = await requestJson<unknown>(
        apiClient,
        'Minitiger/AdminMessages',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipientUserId,
                title,
                body
            })
        }
    );

    const message = normalizeMessage(raw);

    if (!message) {
        throw new Error(
            'Der Companion hat nach dem Senden eine ungültige Nachrichten-Antwort geliefert.'
        );
    }

    return message;
};

export const markMinitigerAdminMessageRead = async (
    apiClient: ApiClient,
    messageId: string
) => await requestJson<void>(
    apiClient,
    `Minitiger/AdminMessages/${encodeURIComponent(messageId)}/Read`,
    { method: 'POST' }
);

// MINITIGER_PATCH_MARKER: PHASE_18_19_0_ADMIN_MESSAGES_API
// MINITIGER_PATCH_MARKER: PHASE_18_19_0A_DUALCASE_ADMIN_MESSAGES

// MINITIGER_PATCH_MARKER: PHASE_18_19_1C_CUSTOM_SENDER_AVATAR_MESSAGE_FIELD
