import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { useApi } from 'hooks/useApi';

import {
    parseMinitigerGalleryAvatarReference
} from '../config/avatarSettings';
import {
    getMinitigerProfileAvatar,
    type MinitigerProfile
} from '../config/profiles';
import {
    getMinitigerVirtualServerMediaUrl
} from '../virtualServerSync';

interface MinitigerProfileAvatarVisualProps {
    profile: MinitigerProfile;
    className?: string;
}

const MinitigerProfileAvatarVisual = ({
    profile,
    className = ''
}: MinitigerProfileAvatarVisualProps) => {
    const {
        __legacyApiClient__: apiClient
    } = useApi();

    const [ imageFailed, setImageFailed ] =
        useState(false);

    const imageUrl = useMemo(() => {
        const source =
            profile.avatarImage?.trim() ?? '';

        if (!source) {
            return '';
        }

        if (source.startsWith('data:image/')) {
            return source;
        }

        const galleryReference =
            parseMinitigerGalleryAvatarReference(
                source
            );

        if (!galleryReference) {
            return '';
        }

        return getMinitigerVirtualServerMediaUrl(
            apiClient,
            galleryReference.id,
            'image',
            galleryReference.revision
        );
    }, [
        apiClient,
        profile.avatarImage
    ]);

    useEffect(() => {
        setImageFailed(false);
    }, [imageUrl]);

    const fallback =
        getMinitigerProfileAvatar(
            profile.avatar
        );

    return (
        <span
            className={[
                'minitigerProfileAvatarVisual',
                imageUrl && !imageFailed
                    ? 'hasImage'
                    : 'hasEmoji',
                className
            ].filter(Boolean).join(' ')}
            aria-hidden='true'
        >
            {imageUrl && !imageFailed ? (
                <img
                    src={imageUrl}
                    alt=''
                    draggable={false}
                    onError={() =>
                        setImageFailed(true)
                    }
                />
            ) : (
                <span className='minitigerProfileAvatarEmoji'>
                    {fallback.emoji}
                </span>
            )}
        </span>
    );
};

export default MinitigerProfileAvatarVisual;

// MINITIGER_PATCH_MARKER: PHASE_18_17_3_PROFILE_AVATAR_VISUAL
