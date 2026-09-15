import React, { useEffect, useMemo, useState } from 'react';

import type { ItemDto } from 'types/base/models/item-dto';

import type {
    MinitigerVirtualLibrariesConfig
} from '../config/virtualLibraries';

interface MinitigerVirtualAssignModalProps {
    item: ItemDto;
    config: MinitigerVirtualLibrariesConfig;
    onSave: (itemId: string, libraryIds: string[]) => void;
    onClose: () => void;
}

const MinitigerVirtualAssignModal = ({
    item,
    config,
    onSave,
    onClose
}: MinitigerVirtualAssignModalProps) => {
    const initialSelection = useMemo(() => (
        config.libraries
            .filter(library => (
                item.Id
                && library.itemIds.includes(item.Id)
            ))
            .map(library => library.id)
    ), [config.libraries, item.Id]);

    const [ selected, setSelected ] = useState<string[]>(initialSelection);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className='minitigerVirtualAssignOverlay'
            role='presentation'
            onMouseDown={event => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className='minitigerVirtualAssignModal'
                role='dialog'
                aria-modal='true'
                aria-label='Virtuelle Bibliotheken zuordnen'
            >
                <div className='minitigerVirtualAssignHeader'>
                    <div>
                        <strong>Virtuelle Bibliotheken</strong>
                        <span>{item.Name ?? 'Inhalt'}</span>
                    </div>

                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Schließen'
                    >
                        ×
                    </button>
                </div>

                <div className='minitigerVirtualAssignRows'>
                    {config.libraries.length === 0 ? (
                        <p>
                            Noch keine virtuellen Bibliotheken angelegt.
                        </p>
                    ) : config.libraries.map(library => (
                        <label key={library.id}>
                            <input
                                type='checkbox'
                                checked={selected.includes(library.id)}
                                onChange={() => {
                                    setSelected(current => (
                                        current.includes(library.id)
                                            ? current.filter(
                                                id => id !== library.id
                                            )
                                            : [ ...current, library.id ]
                                    ));
                                }}
                            />

                            <span>{library.name}</span>
                            <small>{library.itemIds.length} Inhalte</small>
                        </label>
                    ))}
                </div>

                <div className='minitigerVirtualAssignActions'>
                    <button
                        type='button'
                        onClick={onClose}
                    >
                        Abbrechen
                    </button>

                    <button
                        type='button'
                        className='isPrimary'
                        disabled={!item.Id}
                        onClick={() => {
                            if (!item.Id) return;
                            onSave(item.Id, selected);
                            onClose();
                        }}
                    >
                        Übernehmen
                    </button>
                </div>
            </section>
        </div>
    );
};

export default MinitigerVirtualAssignModal;
