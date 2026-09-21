import React, { useEffect, useMemo, useState } from 'react';

import { useApi } from 'hooks/useApi';

import {
    getMinitigerMessageHistory,
    getMinitigerMessageRecipients,
    sendMinitigerAdminMessage,
    type MinitigerAdminMessage,
    type MinitigerAdminMessageRecipient
} from '../adminMessages';

import 'apps/modern/features/minitiger/MinitigerAdminMessages.scss';

const HISTORY_REFRESH_MS = 5000;

const formatDate = (value?: string | null) => {
    if (!value) {
        return '–';
    }

    try {
        return new Date(value).toLocaleString('de-DE');
    } catch {
        return value;
    }
};

const recipientLabel = (
    recipient: MinitigerAdminMessageRecipient
) => {
    if (recipient.kind === 'profile') {
        return recipient.parentName
            ? `${recipient.name} · Minitiger-Profil von ${recipient.parentName}`
            : `${recipient.name} · Minitiger-Profil`;
    }

    return recipient.isAdministrator
        ? `${recipient.name} · Jellyfin · Admin`
        : `${recipient.name} · Jellyfin`;
};

const MinitigerAdminMessagesSettings = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const [ recipients, setRecipients ] = useState<MinitigerAdminMessageRecipient[]>([]);
    const [ history, setHistory ] = useState<MinitigerAdminMessage[]>([]);
    const [ selectedRecipientIds, setSelectedRecipientIds ] = useState<string[]>([]);
    const [ title, setTitle ] = useState('Nachricht vom Administrator');
    const [ body, setBody ] = useState('');
    const [ status, setStatus ] = useState('');
    const [ loading, setLoading ] = useState(true);
    const [ sending, setSending ] = useState(false);

    const selectedRecipientIdSet = useMemo(
        () => new Set(selectedRecipientIds),
        [selectedRecipientIds]
    );

    const selectedRecipients = useMemo(
        () => recipients.filter(recipient =>
            selectedRecipientIdSet.has(recipient.id)
        ),
        [recipients, selectedRecipientIdSet]
    );

    const allRecipientsSelected =
        recipients.length > 0
        && selectedRecipients.length === recipients.length;

    const loadRecipients = async () => {
        if (!apiClient) {
            return;
        }

        const values = await getMinitigerMessageRecipients(apiClient);
        setRecipients(values);

        setSelectedRecipientIds(current => {
            const validIds = new Set(
                values.map(value => value.id)
            );
            const stillValid = current.filter(id => validIds.has(id));

            if (stillValid.length > 0) {
                return stillValid;
            }

            if (
                user?.Id
                && values.some(value => value.id === user.Id)
            ) {
                return [ user.Id ];
            }

            return values[0]?.id
                ? [ values[0].id ]
                : [];
        });
    };

    const loadHistory = async () => {
        if (!apiClient) {
            return;
        }

        setHistory(
            await getMinitigerMessageHistory(apiClient)
        );
    };

    useEffect(() => {
        if (!apiClient) {
            setLoading(false);
            return;
        }

        let active = true;

        const initialLoad = async () => {
            setLoading(true);

            try {
                await Promise.all([
                    loadRecipients(),
                    loadHistory()
                ]);

                if (active) {
                    setStatus('');
                }
            } catch (error) {
                if (active) {
                    setStatus(
                        error instanceof Error
                            ? error.message
                            : String(error)
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        void initialLoad();

        const timer = window.setInterval(
            () => {
                void loadHistory().catch(error => {
                    console.warn(
                        '[Minitiger AdminMessages] Verlauf konnte nicht aktualisiert werden.',
                        error
                    );
                });
            },
            HISTORY_REFRESH_MS
        );

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [apiClient, user?.Id]);

    const toggleRecipient = (
        recipientId: string,
        checked: boolean
    ) => {
        setSelectedRecipientIds(current => {
            if (checked) {
                return current.includes(recipientId)
                    ? current
                    : [ ...current, recipientId ];
            }

            return current.filter(id => id !== recipientId);
        });
    };

    const toggleAllRecipients = () => {
        setSelectedRecipientIds(
            allRecipientsSelected
                ? []
                : recipients.map(recipient => recipient.id)
        );
    };

    const send = async () => {
        if (
            !apiClient
            || selectedRecipientIds.length === 0
            || !title.trim()
            || !body.trim()
        ) {
            return;
        }

        const targetIds = [ ...selectedRecipientIds ];
        const targetNames = new Map(
            recipients.map(recipient => [
                recipient.id,
                recipient.name
            ])
        );

        setSending(true);
        setStatus(
            targetIds.length === 1
                ? 'Nachricht wird gesendet …'
                : `Nachricht wird an ${targetIds.length} Empfänger gesendet …`
        );

        try {
            const results = await Promise.allSettled(
                targetIds.map(recipientId =>
                    sendMinitigerAdminMessage(
                        apiClient,
                        recipientId,
                        title.trim(),
                        body.trim()
                    )
                )
            );

            const failed = results
                .map((result, index) => ({
                    result,
                    recipientId: targetIds[index]
                }))
                .filter(value => value.result.status === 'rejected');

            const succeeded = results.length - failed.length;

            if (succeeded > 0) {
                await loadHistory();
            }

            if (failed.length === 0) {
                setBody('');
                setStatus(
                    succeeded === 1
                        ? `Nachricht an ${selectedRecipients[0]?.name ?? 'den ausgewählten Nutzer'} gesendet. ♥`
                        : `Nachricht erfolgreich an ${succeeded} Empfänger gesendet. ♥`
                );
                return;
            }

            const failedNames = failed
                .map(value =>
                    targetNames.get(value.recipientId)
                    ?? value.recipientId
                )
                .join(', ');

            setStatus(
                succeeded > 0
                    ? `${succeeded} Nachricht${succeeded === 1 ? '' : 'en'} gesendet, ${failed.length} fehlgeschlagen: ${failedNames}`
                    : `Senden fehlgeschlagen für: ${failedNames}`
            );
        } catch (error) {
            setStatus(
                `Senden fehlgeschlagen: ${
                    error instanceof Error
                        ? error.message
                        : String(error)
                }`
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <h3>Admin-Nachrichten</h3>

            <p className='minitigerSettingsIntro'>
                Sende einmalige Nachrichten gezielt an einen oder mehrere
                Jellyfin-Nutzer und Minitiger-Profile. Jede Zustellung wird
                getrennt gespeichert, damit „Offen“ und „Gelesen“ pro Empfänger
                nachvollziehbar bleiben.
            </p>

            <section className='minitigerSettingsCard'>
                <h4>Nachricht senden</h4>

                <div className='minitigerAdminMessageCompose'>
                    <div className='minitigerSettingsField'>
                        <span>Empfänger</span>

                        <div className='minitigerAdminMessageRecipientToolbar'>
                            <button
                                type='button'
                                disabled={loading || sending || recipients.length === 0}
                                onClick={toggleAllRecipients}
                            >
                                {allRecipientsSelected
                                    ? 'Alle abwählen'
                                    : 'Alle Nutzer auswählen'}
                            </button>

                            <button
                                type='button'
                                disabled={
                                    loading
                                    || sending
                                    || selectedRecipientIds.length === 0
                                }
                                onClick={() => setSelectedRecipientIds([])}
                            >
                                Auswahl aufheben
                            </button>

                            <small>
                                {selectedRecipientIds.length}
                                {' / '}
                                {recipients.length}
                                {' ausgewählt'}
                            </small>
                        </div>

                        <div className='minitigerAdminMessageRecipientList'>
                            {recipients.map(recipient => (
                                <label
                                    key={recipient.id}
                                    className='minitigerAdminMessageRecipient'
                                >
                                    <input
                                        type='checkbox'
                                        checked={selectedRecipientIdSet.has(recipient.id)}
                                        disabled={sending}
                                        onChange={event =>
                                            toggleRecipient(
                                                recipient.id,
                                                event.currentTarget.checked
                                            )
                                        }
                                    />

                                    <span>
                                        <strong>{recipient.name}</strong>
                                        <small>{recipientLabel(recipient)}</small>
                                    </span>
                                </label>
                            ))}

                            {!loading && recipients.length === 0 && (
                                <div className='minitigerAdminMessageEmpty'>
                                    Keine Empfänger vom Companion erhalten.
                                </div>
                            )}
                        </div>
                    </div>

                    <label className='minitigerSettingsField'>
                        <span>Titel</span>
                        <input
                            type='text'
                            maxLength={80}
                            value={title}
                            disabled={sending}
                            onChange={event =>
                                setTitle(event.currentTarget.value)
                            }
                        />
                    </label>

                    <label className='minitigerSettingsField'>
                        <span>Nachricht</span>
                        <textarea
                            className='minitigerAdminMessageTextarea'
                            maxLength={4000}
                            rows={7}
                            value={body}
                            disabled={sending}
                            placeholder='Deine Nachricht an die ausgewählten Nutzer …'
                            onChange={event =>
                                setBody(event.currentTarget.value)
                            }
                        />
                        <small>{body.length} / 4000 Zeichen</small>
                    </label>

                    <div className='minitigerBackupButtons'>
                        <button
                            type='button'
                            className='isPrimary'
                            disabled={
                                loading
                                || sending
                                || selectedRecipientIds.length === 0
                                || !title.trim()
                                || !body.trim()
                            }
                            onClick={() => {
                                void send();
                            }}
                        >
                            {sending
                                ? 'Wird gesendet …'
                                : selectedRecipientIds.length > 1
                                    ? `Nachricht an ${selectedRecipientIds.length} Empfänger senden`
                                    : 'Nachricht senden'}
                        </button>

                        <button
                            type='button'
                            disabled={loading || sending}
                            onClick={() => {
                                void Promise.all([
                                    loadRecipients(),
                                    loadHistory()
                                ]).catch(error => {
                                    setStatus(
                                        error instanceof Error
                                            ? error.message
                                            : String(error)
                                    );
                                });
                            }}
                        >
                            Aktualisieren
                        </button>
                    </div>
                </div>

                {status && (
                    <p className='minitigerSettingsHint'>
                        {status}
                    </p>
                )}
            </section>

            <section className='minitigerSettingsCard'>
                <h4>Letzte Nachrichten</h4>

                <p className='minitigerSettingsHint'>
                    „Offen“ bedeutet, dass der jeweilige Empfänger die Nachricht
                    noch nicht mit „Gelesen“ bestätigt hat. Bei einer Nachricht
                    an mehrere Nutzer erscheint deshalb für jeden Empfänger ein
                    eigener Eintrag.
                </p>

                <div className='minitigerAdminMessageHistory'>
                    {history.slice(0, 30).map(message => (
                        <article
                            key={message.id}
                            className='minitigerAdminMessageHistoryItem'
                        >
                            <div className='minitigerAdminMessageHistoryTop'>
                                <strong>{message.title}</strong>
                                <span
                                    className={
                                        message.readAtUtc
                                            ? 'isRead'
                                            : 'isOpen'
                                    }
                                >
                                    {message.readAtUtc
                                        ? '✓ Gelesen'
                                        : '● Offen'}
                                </span>
                            </div>

                            <div className='minitigerAdminMessageHistoryMeta'>
                                An: {message.recipientName}
                                {' · '}Gesendet: {formatDate(message.sentAtUtc)}
                                {message.readAtUtc && (
                                    <>
                                        {' · '}Gelesen: {formatDate(message.readAtUtc)}
                                    </>
                                )}
                            </div>

                            <p>{message.body}</p>
                        </article>
                    ))}

                    {!loading && history.length === 0 && (
                        <div className='minitigerAdminMessageEmpty'>
                            Noch keine Admin-Nachrichten gesendet.
                        </div>
                    )}
                </div>
            </section>
        </>
    );
};

export default MinitigerAdminMessagesSettings;

// MINITIGER_PATCH_MARKER: PHASE_18_19_0_ADMIN_MESSAGES_SETTINGS
// MINITIGER_PATCH_MARKER: PHASE_18_19_1_MULTI_RECIPIENT_MESSAGES
