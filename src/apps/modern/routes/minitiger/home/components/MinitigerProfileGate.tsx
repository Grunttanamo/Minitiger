import React from 'react';

import type {
    MinitigerProfile
} from '../config/profiles';
import MinitigerProfileAvatarVisual from './MinitigerProfileAvatarVisual';
import '../MinitigerProfiles.scss';

interface MinitigerProfileGateProps {
    profiles: MinitigerProfile[];
    onSelect: (
        profileId: string
    ) => void | Promise<void>;
    busyProfileId?: string | null;
    error?: string;
}

const MinitigerProfileGate = ({
    profiles,
    onSelect,
    busyProfileId = null,
    error = ''
}: MinitigerProfileGateProps) => (
    <div className='minitigerProfileGate'>
        <div className='minitigerProfileGateAmbient' />

        <div className='minitigerProfileGateInner'>
            <div className='minitigerProfileGateBrand'>
                <span aria-hidden='true'>🐯</span>
                <strong>Minitiger</strong>
            </div>

            <h1>Wer schaut gerade?</h1>
            <p className='minitigerProfileGateSubtitle'>
                Wähle dein Profil und mach genau dort weiter,
                wo du aufgehört hast.
            </p>

            <div className='minitigerProfileGrid'>
                {profiles.map(profile => {
                    const busy =
                        busyProfileId === profile.id;

                    return (
                        <button
                            key={profile.id}
                            type='button'
                            className={[
                                'minitigerProfileChoice',
                                busy ? 'isBusy' : ''
                            ].filter(Boolean).join(' ')}
                            disabled={Boolean(busyProfileId)}
                            onClick={() => {
                                void onSelect(profile.id);
                            }}
                        >
                            <span className='minitigerProfileAvatar'>
                                <MinitigerProfileAvatarVisual
                                    profile={profile}
                                />

                                {busy && (
                                    <span
                                        className='minitigerProfileBusyOverlay'
                                        aria-hidden='true'
                                    >
                                        <i />
                                        <i />
                                        <i />
                                    </span>
                                )}
                            </span>

                            <span className='minitigerProfileChoiceMeta'>
                                <strong>
                                    {profile.name}
                                </strong>

                                {profile.isOwner && (
                                    <small className='minitigerProfileOwnerBadge'>
                                        Hauptprofil
                                    </small>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {error && (
                <div
                    className='minitigerProfileGateError'
                    role='alert'
                >
                    {error}
                </div>
            )}

            <small className='minitigerProfileGateHint'>
                🔒 Unterprofile öffnen sich ohne zusätzliche Passwortabfrage.
            </small>
        </div>
    </div>
);

export default MinitigerProfileGate;

// MINITIGER_PATCH_MARKER: PHASE_18_17_1_PROFILE_GATE
// MINITIGER_PATCH_MARKER: PHASE_18_17_3_PROFILE_GATE_POLISH
