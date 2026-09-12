import React, { useEffect, useState } from 'react';

interface MinitigerPosterProps {
    imageUrl?: string;
    fallback?: string;
}

const MinitigerPoster = ({
    imageUrl,
    fallback = '🐯'
}: MinitigerPosterProps) => {
    const [ imageFailed, setImageFailed ] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [ imageUrl ]);

    if (!imageUrl || imageFailed) {
        return (
            <div className='minitigerPosterFallback'>
                {fallback}
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt=''
            loading='lazy'
            onError={() => setImageFailed(true)}
        />
    );
};

export default MinitigerPoster;
