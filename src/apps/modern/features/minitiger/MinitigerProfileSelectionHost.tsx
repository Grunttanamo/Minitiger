import React, {
    useCallback,
    useEffect,
    useState
} from 'react';
import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import { useApi } from 'hooks/useApi';

import MinitigerProfileGate from 'apps/modern/routes/minitiger/home/components/MinitigerProfileGate';
import useMinitigerProfiles from 'apps/modern/routes/minitiger/home/hooks/useMinitigerProfiles';
import {
    captureMinitigerOwnerSession,
    switchMinitigerProfileIdentity
} from 'apps/modern/routes/minitiger/home/profileIdentity';

const PROFILE_SELECTION_REQUEST_EVENT =
    'minitiger:profile-selection-requested';

const MinitigerProfileSelectionHost = () => {
    const {
        user,
        __legacyApiClient__: apiClient
    } = useApi();

    const location = useLocation();
    const navigate = useNavigate();
    const profileState = useMinitigerProfiles();

    const [ open, setOpen ] = useState(false);
    const [
        profileSwitchingId,
        setProfileSwitchingId
    ] = useState<string | null>(null);
    const [
        profileSwitchError,
        setProfileSwitchError
    ] = useState('');

    useEffect(() => {
        captureMinitigerOwnerSession(
            apiClient,
            user
        );
    }, [
        apiClient,
        user
    ]);

    useEffect(() => {
        const onSelectionRequested = () => {
            if (location.pathname === '/home') {
                return;
            }

            setProfileSwitchError('');
            setOpen(true);
        };

        window.addEventListener(
            PROFILE_SELECTION_REQUEST_EVENT,
            onSelectionRequested
        );

        return () => {
            window.removeEventListener(
                PROFILE_SELECTION_REQUEST_EVENT,
                onSelectionRequested
            );
        };
    }, [location.pathname]);

    useEffect(() => {
        if (
            location.pathname === '/home'
            || !profileState.isReady
            || !profileState.hasSubprofiles
            || !profileState.requiresSelection
        ) {
            return;
        }

        setOpen(true);
    }, [
        location.pathname,
        profileState.hasSubprofiles,
        profileState.isReady,
        profileState.requiresSelection
    ]);

    useEffect(() => {
        if (location.pathname === '/home') {
            setOpen(false);
        }
    }, [location.pathname]);

    const activateProfile = useCallback(async (
        profileId: string
    ) => {
        const profile =
            profileState.profiles.find(
                candidate =>
                    candidate.id === profileId
            );

        if (
            !profile
            || !apiClient
            || !user?.Id
        ) {
            return;
        }

        setProfileSwitchError('');
        setProfileSwitchingId(profile.id);
        profileState.selectProfile(profile.id);

        try {
            await switchMinitigerProfileIdentity(
                apiClient,
                user,
                profile
            );

            setOpen(false);

            /*
             * A profile switch changes the complete Jellyfin identity.
             * Going to Home afterwards prevents stale user-specific
             * settings/profile pages from remaining on screen.
             */
            navigate(
                '/home',
                { replace: true }
            );
        } catch (error) {
            console.error(
                '[Minitiger Profiles] Globaler Profilwechsel fehlgeschlagen',
                error
            );

            profileState.requestSelection();

            setProfileSwitchError(
                error instanceof Error
                    ? error.message
                    : 'Der Profilwechsel ist fehlgeschlagen.'
            );
        } finally {
            setProfileSwitchingId(null);
        }
    }, [
        apiClient,
        navigate,
        profileState.profiles,
        profileState.requestSelection,
        profileState.selectProfile,
        user
    ]);

    if (
        !open
        || location.pathname === '/home'
        || !profileState.isReady
        || !profileState.hasSubprofiles
    ) {
        return null;
    }

    return (
        <MinitigerProfileGate
            profiles={profileState.profiles}
            onSelect={activateProfile}
            busyProfileId={profileSwitchingId}
            error={profileSwitchError}
        />
    );
};

export default MinitigerProfileSelectionHost;

// MINITIGER_PATCH_MARKER: PHASE_18_17_4_GLOBAL_PROFILE_SELECTION_HOST
