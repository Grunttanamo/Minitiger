import React, { type FC } from 'react';

import { useItem } from 'hooks/useItem';

import { useLibrary } from '../hooks/useLibrary';

const cleanLibraryName = (value?: string | null) => {
    const name = String(value ?? '').trim();

    if (!name) {
        return 'Bibliothek';
    }

    return name.replace(/^\s*\d+\.\s*/, '');
};

const LibraryToolbar: FC = () => {
    const {
        id: parentId,
        isLibraryPath,
        itemsResult
    } = useLibrary();

    const {
        data: item
    } = useItem(parentId || undefined);

    if (!isLibraryPath) {
        return null;
    }

    const totalRecordCount =
        itemsResult?.data?.TotalRecordCount ?? 0;

    return (
        <div className='minitigerLibraryTopbar'>
            <h1>
                {cleanLibraryName(item?.Name)}
            </h1>

            <span>
                {itemsResult?.isPending
                    ? '…'
                    : `${totalRecordCount.toLocaleString('de-DE')} Inhalte`}
            </span>
        </div>
    );
};

export default LibraryToolbar;
