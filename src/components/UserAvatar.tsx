import React, { type FC } from 'react';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import Avatar, { type AvatarProps } from '@mui/material/Avatar';
import type {} from '@mui/material/themeCssVarsAugmentation';

import { useApi } from 'hooks/useApi';
import useMinitigerAvatarSettings from 'apps/modern/routes/minitiger/home/hooks/useMinitigerAvatarSettings';

interface UserAvatarProps extends AvatarProps {
    user?: UserDto,
    size?: number
}

const UserAvatar: FC<UserAvatarProps> = ({
    user,
    size
}) => {
    const {
        api,
        user: currentUser
    } = useApi();
    const {
        settings: minitigerAvatar,
        resolvedImage: minitigerAvatarImage
    } = useMinitigerAvatarSettings();

    const useCustomAvatar = Boolean(
        user?.Id
        && currentUser?.Id === user.Id
        && minitigerAvatar.enabled
        && minitigerAvatarImage
    );

    const hasJellyfinImage = Boolean(
        api
        && user?.Id
        && user.PrimaryImageTag
    );

    return user ? (
        <Avatar
            alt={user.Name ?? undefined}
            src={
                useCustomAvatar
                    ? minitigerAvatarImage
                    : hasJellyfinImage
                        ? `${api?.basePath}/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}`
                        : undefined
            }
            // eslint-disable-next-line react/jsx-no-bind
            sx={(theme) => ({
                bgcolor:
                    useCustomAvatar || hasJellyfinImage
                        ? theme.vars.palette.background.paper
                        : theme.vars.palette.primary.dark,
                color: 'inherit',
                width: size,
                height: size,
                borderRadius:
                    useCustomAvatar
                        ? minitigerAvatar.shape === 'circle'
                            ? '50%'
                            : '8px'
                        : undefined
            })}
        />
    ) : null;

    /* MINITIGER_PATCH_MARKER: PHASE_18_11_0_TEST_CUSTOM_USER_AVATARS */
    /* MINITIGER_PATCH_MARKER: PHASE_18_12_4_TEST_BANNER_AVATAR_GLOBAL */
};

export default UserAvatar;
