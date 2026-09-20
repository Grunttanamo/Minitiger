import {
    parseMinitigerGalleryAvatarReference
} from './avatarSettings';

export const MINITIGER_PROFILE_AVATARS = [
    { id: 'tiger', label: 'Minitiger', emoji: '🐯' },
    { id: 'fox', label: 'Fuchs', emoji: '🦊' },
    { id: 'cat', label: 'Katze', emoji: '🐱' },
    { id: 'panda', label: 'Panda', emoji: '🐼' },
    { id: 'bear', label: 'Bär', emoji: '🐻' },
    { id: 'rabbit', label: 'Hase', emoji: '🐰' },
    { id: 'dragon', label: 'Drache', emoji: '🐲' },
    { id: 'star', label: 'Stern', emoji: '⭐' },
    { id: 'moon', label: 'Mond', emoji: '🌙' },
    { id: 'heart', label: 'Herz', emoji: '💛' }
] as const;

export type MinitigerProfileAvatarId =
    typeof MINITIGER_PROFILE_AVATARS[number]['id'];

export interface MinitigerStoredProfile {
    id: string;
    name: string;
    avatar: MinitigerProfileAvatarId;
    avatarImage?: string;
    createdAt: string;
}

export interface MinitigerProfile extends MinitigerStoredProfile {
    isOwner: boolean;
}

export interface MinitigerProfilesConfig {
    version: 1;
    profiles: MinitigerStoredProfile[];
}

export const MAX_MINITIGER_SUBPROFILES = 5;

export const DEFAULT_MINITIGER_PROFILES_CONFIG:
    MinitigerProfilesConfig = {
        version: 1,
        profiles: []
    };

const avatarIds = new Set<string>(
    MINITIGER_PROFILE_AVATARS.map(avatar => avatar.id)
);

const cleanName = (value: unknown) => (
    typeof value === 'string'
        ? value.trim().slice(0, 28)
        : ''
);

export const normalizeProfileAvatar = (
    value: unknown
): MinitigerProfileAvatarId => (
    typeof value === 'string' && avatarIds.has(value)
        ? value as MinitigerProfileAvatarId
        : 'tiger'
);

export const normalizeProfileAvatarImage = (
    value: unknown
) => {
    if (typeof value !== 'string') {
        return '';
    }

    const trimmed = value.trim();

    if (!trimmed || trimmed.length > 220000) {
        return '';
    }

    if (
        trimmed.startsWith('data:image/')
        || parseMinitigerGalleryAvatarReference(trimmed)
    ) {
        return trimmed;
    }

    return '';
};

export const normalizeMinitigerProfilesConfig = (
    value: unknown
): MinitigerProfilesConfig => {
    if (!value || typeof value !== 'object') {
        return {
            ...DEFAULT_MINITIGER_PROFILES_CONFIG,
            profiles: []
        };
    }

    const source = value as Partial<MinitigerProfilesConfig>;
    const incoming = Array.isArray(source.profiles)
        ? source.profiles
        : [];

    const ids = new Set<string>();
    const profiles: MinitigerStoredProfile[] = [];

    incoming.forEach(candidate => {
        if (
            !candidate
            || typeof candidate !== 'object'
            || profiles.length >= MAX_MINITIGER_SUBPROFILES
        ) {
            return;
        }

        const raw = candidate as Partial<MinitigerStoredProfile>;
        const id = typeof raw.id === 'string'
            ? raw.id.trim().slice(0, 80)
            : '';
        const name = cleanName(raw.name);

        if (!id || !name || ids.has(id) || id === 'owner') {
            return;
        }

        ids.add(id);
        profiles.push({
            id,
            name,
            avatar: normalizeProfileAvatar(raw.avatar),
            avatarImage:
                normalizeProfileAvatarImage(
                    raw.avatarImage
                ),
            createdAt:
                typeof raw.createdAt === 'string'
                    ? raw.createdAt
                    : new Date().toISOString()
        });
    });

    return {
        version: 1,
        profiles
    };
};

export const getMinitigerProfileAvatar = (
    avatarId: MinitigerProfileAvatarId
) => (
    MINITIGER_PROFILE_AVATARS.find(
        avatar => avatar.id === avatarId
    ) ?? MINITIGER_PROFILE_AVATARS[0]
);

// MINITIGER_PATCH_MARKER: PHASE_18_17_0_PROFILE_MODEL
// MINITIGER_PATCH_MARKER: PHASE_18_17_3_CUSTOM_PROFILE_AVATAR_MODEL
