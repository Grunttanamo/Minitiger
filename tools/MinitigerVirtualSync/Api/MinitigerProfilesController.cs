using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Jellyfin.Data.Enums;
using MediaBrowser.Common.Extensions;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Authentication;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/Profiles")]
[Authorize]
public sealed class MinitigerProfilesController : ControllerBase
{
    private const int MaxProfilesPerHousehold = 5;
    private const int MaxDisplayNameLength = 28;

    private static readonly Regex SafeProfileId = new(
        "^[A-Za-z0-9_-]{1,80}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly SemaphoreSlim IoLock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    private static readonly string[] PersonalHomeSettingKeys =
    {
        "accentColor",
        "primaryHoverColor",
        "secondaryColor",
        "secondaryHoverColor",
        "libraryBarColor",
        "libraryBarTextColor",
        "bannerMetaColor",
        "glowColor",
        "arrowColor",
        "genreTagColor",
        "glowStrength",
        "glowSize",
        "toolbarBrandTextEnabled",
        "toolbarBrandText",
        "bannerFskVisible",
        "showAudioFlags",
        "showFskBadges",
        "showPlayedIndicators",
        "playedIndicatorSize",
        "playedIndicatorFontSize",
        "playedIndicatorShape",
        "hoverEnabled",
        "glowEnabled",
        "previewEnabled",
        "preferredPlayer"
    };

    private readonly IUserManager _userManager;
    private readonly ISessionManager _sessionManager;
    private readonly IDisplayPreferencesManager _displayPreferencesManager;
    private readonly ILogger<MinitigerProfilesController> _logger;

    public MinitigerProfilesController(
        IUserManager userManager,
        ISessionManager sessionManager,
        IDisplayPreferencesManager displayPreferencesManager,
        ILogger<MinitigerProfilesController> logger)
    {
        _userManager = userManager;
        _sessionManager = sessionManager;
        _displayPreferencesManager = displayPreferencesManager;
        _logger = logger;
    }

    [HttpGet("Status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetStatus(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadStateAsync(cancellationToken).ConfigureAwait(false);
            var household = FindHousehold(state, currentUserId);

            return Ok(new
            {
                ready = true,
                version = "18.17.4",
                ownerUserId = household?.OwnerUserId,
                profileCount = household?.Profiles.Count ?? 0,
                currentUserIsOwner = household is null || household.OwnerUserId == currentUserId
            });
        }
        finally
        {
            IoLock.Release();
        }
    }

    [HttpGet("AvatarGallery")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetSharedAvatarGallery(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var preferredUserId = currentUserId;

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadStateAsync(cancellationToken)
                .ConfigureAwait(false);
            var household = FindHousehold(
                state,
                currentUserId);

            if (household is not null)
            {
                preferredUserId = household.OwnerUserId;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Minitiger shared avatar gallery household lookup failed for user {UserId}.",
                currentUserId);
        }
        finally
        {
            IoLock.Release();
        }

        var sharedGallery = FindSharedAvatarGallery(preferredUserId);

        if (string.IsNullOrWhiteSpace(sharedGallery))
        {
            return Ok(new
            {
                items = Array.Empty<object>()
            });
        }

        try
        {
            return Ok(
                JsonNode.Parse(sharedGallery)
                ?? new JsonObject());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Minitiger shared avatar gallery contained invalid JSON.");

            return Ok(new
            {
                items = Array.Empty<object>()
            });
        }
    }

    [HttpPost("Sync")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> SyncProfiles(
        [FromBody] MinitigerProfilesSyncRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        var currentUser = _userManager.GetUserById(currentUserId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        var definitions = request.Profiles ?? new List<MinitigerProfileDefinition>();
        if (definitions.Count > MaxProfilesPerHousehold)
        {
            return BadRequest(
                $"A Minitiger household supports up to {MaxProfilesPerHousehold} subprofiles.");
        }

        var normalized = new List<(string ProfileId, string DisplayName, string Avatar, string AvatarImage)>();
        var seenIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var definition in definitions)
        {
            var candidate = new MinitigerProfileAuthenticateRequest
            {
                ProfileId = definition.ProfileId,
                DisplayName = definition.DisplayName,
                Avatar = definition.Avatar,
                AvatarImage = definition.AvatarImage
            };

            if (!TryNormalizeRequest(
                candidate,
                out var profileId,
                out var displayName,
                out var validationError))
            {
                return BadRequest(validationError);
            }

            if (!seenIds.Add(profileId))
            {
                return BadRequest("Duplicate Minitiger profile id.");
            }

            normalized.Add((
                profileId,
                displayName,
                NormalizeAvatar(definition.Avatar),
                NormalizeAvatarImage(definition.AvatarImage)));
        }

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadStateAsync(cancellationToken).ConfigureAwait(false);
            var household = FindHousehold(state, currentUserId);

            if (household is null)
            {
                if (currentUser.Username.StartsWith(
                    "mt_",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "An orphaned technical Minitiger profile cannot create a new household.");
                }

                household = new MinitigerHouseholdRecord
                {
                    OwnerUserId = currentUserId
                };
                state.Households.Add(household);
            }

            if (household.OwnerUserId != currentUserId)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    "Only the Minitiger household owner can synchronize subprofiles.");
            }

            foreach (var definition in normalized)
            {
                var profile = household.Profiles.FirstOrDefault(candidate =>
                    string.Equals(
                        candidate.ProfileId,
                        definition.ProfileId,
                        StringComparison.Ordinal));

                if (profile is null)
                {
                    profile = new MinitigerProfileRecord
                    {
                        ProfileId = definition.ProfileId,
                        DisplayName = definition.DisplayName,
                        Avatar = definition.Avatar,
                        AvatarImage = definition.AvatarImage,
                        UserId = await CreateTechnicalUserAsync(
                            household.OwnerUserId,
                            definition.ProfileId).ConfigureAwait(false)
                    };
                    household.Profiles.Add(profile);
                }
                else
                {
                    profile.DisplayName = definition.DisplayName;
                    profile.Avatar = definition.Avatar;
                    profile.AvatarImage = definition.AvatarImage;

                    if (
                        profile.UserId == Guid.Empty
                        || _userManager.GetUserById(profile.UserId) is null
                    )
                    {
                        profile.UserId = await CreateTechnicalUserAsync(
                            household.OwnerUserId,
                            definition.ProfileId).ConfigureAwait(false);
                    }
                }

                await EnsureTechnicalUserAsync(
                    household.OwnerUserId,
                    profile).ConfigureAwait(false);
            }

            await SaveStateAsync(state, cancellationToken).ConfigureAwait(false);

            return Ok(new
            {
                ready = true,
                profileCount = household.Profiles.Count
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Minitiger profile synchronization is unavailable.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ex.Message);
        }
        finally
        {
            IoLock.Release();
        }
    }

    [HttpPost("Authenticate")]
    [ProducesResponseType(typeof(AuthenticationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<AuthenticationResult>> AuthenticateProfile(
        [FromBody] MinitigerProfileAuthenticateRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        if (!TryNormalizeRequest(
            request,
            out var profileId,
            out var displayName,
            out var validationError))
        {
            return BadRequest(validationError);
        }

        var currentUser = _userManager.GetUserById(currentUserId);
        if (currentUser is null)
        {
            return Unauthorized();
        }

        MinitigerProfileRecord profile;
        Guid ownerUserId;

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadStateAsync(cancellationToken).ConfigureAwait(false);
            var household = FindHousehold(state, currentUserId);

            if (household is null)
            {
                if (currentUser.Username.StartsWith(
                    "mt_",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "An orphaned technical Minitiger profile cannot create a new household.");
                }

                household = new MinitigerHouseholdRecord
                {
                    OwnerUserId = currentUserId
                };
                state.Households.Add(household);
            }

            ownerUserId = household.OwnerUserId;

            var callerBelongsToHousehold =
                currentUserId == household.OwnerUserId
                || household.Profiles.Any(candidate =>
                    candidate.UserId == currentUserId);

            if (!callerBelongsToHousehold)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    "Current user does not belong to this Minitiger household.");
            }

            profile = household.Profiles.FirstOrDefault(candidate =>
                string.Equals(
                    candidate.ProfileId,
                    profileId,
                    StringComparison.Ordinal))
                ?? new MinitigerProfileRecord();

            if (string.IsNullOrEmpty(profile.ProfileId))
            {
                if (currentUserId != household.OwnerUserId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "Only the Minitiger household owner can initialize a new subprofile.");
                }

                if (household.Profiles.Count >= MaxProfilesPerHousehold)
                {
                    return BadRequest(
                        $"A Minitiger household supports up to {MaxProfilesPerHousehold} subprofiles.");
                }

                profile.ProfileId = profileId;
                profile.DisplayName = displayName;
                profile.Avatar = NormalizeAvatar(request.Avatar);
                profile.AvatarImage = NormalizeAvatarImage(
                    request.AvatarImage);

                profile.UserId = await CreateTechnicalUserAsync(
                    ownerUserId,
                    profileId).ConfigureAwait(false);
                household.Profiles.Add(profile);
            }
            else
            {
                if (currentUserId == household.OwnerUserId)
                {
                    profile.DisplayName = displayName;
                    profile.Avatar = NormalizeAvatar(request.Avatar);
                    profile.AvatarImage = NormalizeAvatarImage(
                        request.AvatarImage);
                }

                if (
                    profile.UserId == Guid.Empty
                    || _userManager.GetUserById(profile.UserId) is null
                )
                {
                    if (currentUserId != household.OwnerUserId)
                    {
                        return StatusCode(
                            StatusCodes.Status403Forbidden,
                            "Only the Minitiger household owner can repair a missing subprofile identity.");
                    }

                    profile.UserId = await CreateTechnicalUserAsync(
                        ownerUserId,
                        profileId).ConfigureAwait(false);
                }
            }

            await EnsureTechnicalUserAsync(
                ownerUserId,
                profile).ConfigureAwait(false);

            await SaveStateAsync(state, cancellationToken).ConfigureAwait(false);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Minitiger profile storage is unavailable.");
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                ex.Message);
        }
        finally
        {
            IoLock.Release();
        }

        var technicalUser = _userManager.GetUserById(profile.UserId);
        if (technicalUser is null)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                "The technical Minitiger profile user could not be loaded.");
        }

        var password = GetTechnicalPassword(
            ownerUserId,
            profile.ProfileId);

        await _userManager.ChangePassword(
            technicalUser.Id,
            password).ConfigureAwait(false);

        var authenticationRequest = new AuthenticationRequest
        {
            Username = technicalUser.Username,
            UserId = technicalUser.Id,
            Password = password,
            App = SafeClientValue(
                request.App,
                "Minitiger",
                80),
            AppVersion = SafeClientValue(
                request.AppVersion,
                "18.17.1",
                40),
            DeviceName = SafeClientValue(
                request.DeviceName,
                "Minitiger",
                80),
            DeviceId = BuildProfileDeviceId(
                request.DeviceId,
                profile.ProfileId),
            RemoteEndPoint =
                HttpContext.Connection.RemoteIpAddress?.ToString()
                ?? string.Empty
        };

        try
        {
            var result = await _sessionManager
                .AuthenticateNewSession(authenticationRequest)
                .ConfigureAwait(false);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Minitiger profile authentication failed for profile {ProfileId}.",
                profile.ProfileId);

            return StatusCode(
                StatusCodes.Status500InternalServerError,
                "The Minitiger subprofile session could not be created.");
        }
    }

    [HttpDelete("{profileId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> DeleteProfile(
        [FromRoute] string profileId,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        if (!SafeProfileId.IsMatch(profileId))
        {
            return NoContent();
        }

        Guid technicalUserId = Guid.Empty;

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadStateAsync(cancellationToken).ConfigureAwait(false);
            var household = FindHousehold(state, currentUserId);

            if (household is null)
            {
                return NoContent();
            }

            if (household.OwnerUserId != currentUserId)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    "Only the Minitiger household owner can delete subprofiles.");
            }

            var profile = household.Profiles.FirstOrDefault(candidate =>
                string.Equals(
                    candidate.ProfileId,
                    profileId,
                    StringComparison.Ordinal));

            if (profile is null)
            {
                return NoContent();
            }

            technicalUserId = profile.UserId;
            household.Profiles.Remove(profile);

            await SaveStateAsync(state, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            IoLock.Release();
        }

        if (
            technicalUserId != Guid.Empty
            && _userManager.GetUserById(technicalUserId) is not null
        )
        {
            try
            {
                await _userManager.DeleteUserAsync(
                    technicalUserId).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Minitiger technical profile user {UserId} could not be deleted.",
                    technicalUserId);
            }
        }

        return NoContent();
    }

    private async Task<Guid> CreateTechnicalUserAsync(
            Guid ownerUserId,
            string profileId)
    {
        var baseName = BuildInternalUsername(
            ownerUserId,
            profileId);
        var userName = baseName;
        var suffix = 1;

        while (_userManager.GetUserByName(userName) is not null)
        {
            userName = $"{baseName}_{suffix}";
            suffix++;

            if (suffix > 50)
            {
                throw new InvalidOperationException(
                    "Could not allocate an internal Minitiger profile user name.");
            }
        }

        var user = await _userManager
            .CreateUserAsync(userName)
            .ConfigureAwait(false);

        var password = GetTechnicalPassword(
            ownerUserId,
            profileId);

        await _userManager.ChangePassword(
            user.Id,
            password).ConfigureAwait(false);

        return user.Id;
    }

    private async Task EnsureTechnicalUserAsync(
        Guid ownerUserId,
        MinitigerProfileRecord profile)
    {
        var technicalUser = _userManager.GetUserById(
            profile.UserId);
        var ownerUser = _userManager.GetUserById(
            ownerUserId);

        if (technicalUser is null || ownerUser is null)
        {
            throw new InvalidOperationException(
                "Minitiger profile users could not be resolved.");
        }

        var ownerDto = _userManager.GetUserDto(ownerUser);
        var source = ownerDto.Policy ?? new UserPolicy();

        var policy = new UserPolicy
        {
            IsAdministrator = false,
            IsHidden = true,
            IsDisabled = false,
            EnableCollectionManagement = false,
            EnableSubtitleManagement = false,
            EnableLyricManagement = false,
            EnableContentDeletion = false,
            EnableContentDeletionFromFolders = Array.Empty<string>(),
            EnablePublicSharing = false,
            EnableRemoteControlOfOtherUsers = false,
            EnableSharedDeviceControl = false,
            EnableUserPreferenceAccess = true,
            EnableMediaPlayback = source.EnableMediaPlayback,
            EnableAudioPlaybackTranscoding = source.EnableAudioPlaybackTranscoding,
            EnableVideoPlaybackTranscoding = source.EnableVideoPlaybackTranscoding,
            EnablePlaybackRemuxing = source.EnablePlaybackRemuxing,
            ForceRemoteSourceTranscoding = source.ForceRemoteSourceTranscoding,
            EnableSyncTranscoding = source.EnableSyncTranscoding,
            EnableMediaConversion = source.EnableMediaConversion,
            EnableContentDownloading = source.EnableContentDownloading,
            EnableRemoteAccess = source.EnableRemoteAccess,
            EnableLiveTvManagement = false,
            EnableLiveTvAccess = source.EnableLiveTvAccess,
            EnableAllFolders = source.EnableAllFolders,
            EnabledFolders = source.EnabledFolders ?? Array.Empty<Guid>(),
            BlockedMediaFolders = source.BlockedMediaFolders ?? Array.Empty<Guid>(),
            EnableAllChannels = source.EnableAllChannels,
            EnabledChannels = source.EnabledChannels ?? Array.Empty<Guid>(),
            BlockedChannels = source.BlockedChannels ?? Array.Empty<Guid>(),
            MaxParentalRating = source.MaxParentalRating,
            MaxParentalSubRating = source.MaxParentalSubRating,
            BlockedTags = source.BlockedTags ?? Array.Empty<string>(),
            AllowedTags = source.AllowedTags ?? Array.Empty<string>(),
            BlockUnratedItems = source.BlockUnratedItems ?? Array.Empty<UnratedItem>(),
            LoginAttemptsBeforeLockout = -1,
            MaxActiveSessions = 0,
            RemoteClientBitrateLimit = source.RemoteClientBitrateLimit,
            SyncPlayAccess = source.SyncPlayAccess,
            AuthenticationProviderId = source.AuthenticationProviderId,
            PasswordResetProviderId = source.PasswordResetProviderId
        };

        await _userManager.UpdatePolicyAsync(
            technicalUser.Id,
            policy).ConfigureAwait(false);

        SyncOwnerHomeSettings(
            ownerUserId,
            technicalUser.Id);
        SyncOwnerAvatarGallery(
            ownerUserId,
            technicalUser.Id);
        SyncProfileAvatarSettings(
            technicalUser.Id,
            profile.AvatarImage);
    }

    private void SyncOwnerHomeSettings(
        Guid ownerUserId,
        Guid technicalUserId)
    {
        const string preferencesClient = "MinitigerWeb";
        const string homeSettingsKey = "homeSettings";

        try
        {
            var itemId = "minitiger".GetMD5();
            var ownerPreferences =
                _displayPreferencesManager
                    .ListCustomItemDisplayPreferences(
                        ownerUserId,
                        itemId,
                        preferencesClient);

            if (
                !ownerPreferences.TryGetValue(
                    homeSettingsKey,
                    out var ownerHomeSettings)
                || string.IsNullOrWhiteSpace(
                    ownerHomeSettings)
            )
            {
                return;
            }

            var targetPreferences =
                _displayPreferencesManager
                    .ListCustomItemDisplayPreferences(
                        technicalUserId,
                        itemId,
                        preferencesClient);

            targetPreferences.TryGetValue(
                homeSettingsKey,
                out var targetHomeSettings);

            var mergedHomeSettings = MergeHomeSettings(
                ownerHomeSettings,
                targetHomeSettings);

            if (string.Equals(
                targetHomeSettings,
                mergedHomeSettings,
                StringComparison.Ordinal))
            {
                return;
            }

            targetPreferences[homeSettingsKey] =
                mergedHomeSettings;

            _displayPreferencesManager
                .SetCustomItemDisplayPreferences(
                    technicalUserId,
                    itemId,
                    preferencesClient,
                    targetPreferences);
        }
        catch (Exception ex)
        {
            /*
             * Profile authentication must remain usable even if a future
             * Jellyfin change prevents the optional Home-layout inheritance.
             */
            _logger.LogWarning(
                ex,
                "Minitiger Home settings could not be inherited for technical profile user {UserId}.",
                technicalUserId);
        }
    }

    private string? FindSharedAvatarGallery(
        Guid preferredUserId)
    {
        var preferred = ReadAvatarGalleryPreference(preferredUserId);

        if (HasAvatarGalleryItems(preferred))
        {
            return preferred;
        }

        foreach (var user in _userManager.GetUsers())
        {
            if (user.Id == preferredUserId)
            {
                continue;
            }

            var candidate = ReadAvatarGalleryPreference(user.Id);

            if (HasAvatarGalleryItems(candidate))
            {
                return candidate;
            }
        }

        return preferred;
    }

    private string? ReadAvatarGalleryPreference(
        Guid userId)
    {
        const string preferencesClient = "MinitigerWeb";
        const string avatarGalleryKey = "avatarGallery";

        try
        {
            var itemId = "minitiger".GetMD5();
            var preferences = _displayPreferencesManager
                .ListCustomItemDisplayPreferences(
                    userId,
                    itemId,
                    preferencesClient);

            return preferences.TryGetValue(
                avatarGalleryKey,
                out var gallery)
                ? gallery
                : null;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "Minitiger avatar gallery preference could not be read for user {UserId}.",
                userId);

            return null;
        }
    }

    private static bool HasAvatarGalleryItems(
        string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        try
        {
            var node = JsonNode.Parse(raw) as JsonObject;

            return node?["items"] is JsonArray items
                && items.Count > 0;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private void SyncOwnerAvatarGallery(
        Guid ownerUserId,
        Guid technicalUserId)
    {
        const string preferencesClient = "MinitigerWeb";
        const string avatarGalleryKey = "avatarGallery";

        try
        {
            var itemId = "minitiger".GetMD5();
            var ownerPreferences =
                _displayPreferencesManager
                    .ListCustomItemDisplayPreferences(
                        ownerUserId,
                        itemId,
                        preferencesClient);

            if (
                !ownerPreferences.TryGetValue(
                    avatarGalleryKey,
                    out var ownerGallery)
                || string.IsNullOrWhiteSpace(
                    ownerGallery)
            )
            {
                return;
            }

            var targetPreferences =
                _displayPreferencesManager
                    .ListCustomItemDisplayPreferences(
                        technicalUserId,
                        itemId,
                        preferencesClient);

            if (
                targetPreferences.TryGetValue(
                    avatarGalleryKey,
                    out var targetGallery)
                && string.Equals(
                    targetGallery,
                    ownerGallery,
                    StringComparison.Ordinal)
            )
            {
                return;
            }

            targetPreferences[avatarGalleryKey] =
                ownerGallery;

            _displayPreferencesManager
                .SetCustomItemDisplayPreferences(
                    technicalUserId,
                    itemId,
                    preferencesClient,
                    targetPreferences);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Minitiger avatar gallery could not be inherited for technical profile user {UserId}.",
                technicalUserId);
        }
    }

    private void SyncProfileAvatarSettings(
        Guid technicalUserId,
        string? avatarImage)
    {
        const string preferencesClient = "MinitigerWeb";
        const string avatarSettingsKey = "avatarSettings";

        try
        {
            var itemId = "minitiger".GetMD5();
            var targetPreferences =
                _displayPreferencesManager
                    .ListCustomItemDisplayPreferences(
                        technicalUserId,
                        itemId,
                        preferencesClient);

            targetPreferences.TryGetValue(
                avatarSettingsKey,
                out var currentRaw);

            var shape = "square";

            if (!string.IsNullOrWhiteSpace(currentRaw))
            {
                try
                {
                    var currentNode =
                        JsonNode.Parse(currentRaw)
                        as JsonObject;

                    var currentShape =
                        currentNode?["shape"]
                            ?.GetValue<string>();

                    if (string.Equals(
                        currentShape,
                        "circle",
                        StringComparison.OrdinalIgnoreCase))
                    {
                        shape = "circle";
                    }
                }
                catch (Exception)
                {
                    // Invalid older preference: use the safe default.
                }
            }

            var normalizedImage =
                NormalizeAvatarImage(avatarImage);

            var nextNode = new JsonObject
            {
                ["enabled"] =
                    !string.IsNullOrWhiteSpace(
                        normalizedImage),
                ["image"] = normalizedImage,
                ["shape"] = shape
            };

            var nextRaw = nextNode.ToJsonString();

            if (string.Equals(
                currentRaw,
                nextRaw,
                StringComparison.Ordinal))
            {
                return;
            }

            targetPreferences[avatarSettingsKey] =
                nextRaw;

            _displayPreferencesManager
                .SetCustomItemDisplayPreferences(
                    technicalUserId,
                    itemId,
                    preferencesClient,
                    targetPreferences);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Minitiger profile avatar settings could not be synchronized for technical profile user {UserId}.",
                technicalUserId);
        }
    }

    private static string MergeHomeSettings(
        string ownerHomeSettings,
        string? targetHomeSettings)
    {
        var ownerNode = JsonNode.Parse(
            ownerHomeSettings) as JsonObject;

        if (ownerNode is null)
        {
            return ownerHomeSettings;
        }

        if (string.IsNullOrWhiteSpace(targetHomeSettings))
        {
            return ownerNode.ToJsonString();
        }

        JsonObject? targetNode;
        try
        {
            targetNode = JsonNode.Parse(
                targetHomeSettings) as JsonObject;
        }
        catch (JsonException)
        {
            targetNode = null;
        }

        if (targetNode is null)
        {
            return ownerNode.ToJsonString();
        }

        foreach (var key in PersonalHomeSettingKeys)
        {
            if (targetNode.TryGetPropertyValue(
                key,
                out var personalValue))
            {
                ownerNode[key] =
                    personalValue?.DeepClone();
            }
        }

        return ownerNode.ToJsonString();
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var raw = User.FindFirst("Jellyfin-UserId")?.Value;
        return Guid.TryParse(raw, out userId)
            && userId != Guid.Empty;
    }

    private static bool TryNormalizeRequest(
        MinitigerProfileAuthenticateRequest request,
        out string profileId,
        out string displayName,
        out string validationError)
    {
        profileId = request.ProfileId?.Trim() ?? string.Empty;
        displayName = request.DisplayName?.Trim() ?? string.Empty;
        validationError = string.Empty;

        if (!SafeProfileId.IsMatch(profileId))
        {
            validationError = "Invalid Minitiger profile id.";
            return false;
        }

        if (string.Equals(profileId, "owner", StringComparison.Ordinal))
        {
            validationError = "The owner profile is handled by the existing Jellyfin login.";
            return false;
        }

        if (
            string.IsNullOrWhiteSpace(displayName)
            || displayName.Length > MaxDisplayNameLength
        )
        {
            validationError = "Invalid Minitiger profile display name.";
            return false;
        }

        return true;
    }

    private static MinitigerHouseholdRecord? FindHousehold(
        MinitigerProfilesState state,
        Guid currentUserId)
    {
        return state.Households.FirstOrDefault(household =>
            household.OwnerUserId == currentUserId
            || household.Profiles.Any(profile =>
                profile.UserId == currentUserId));
    }

    private static string NormalizeAvatar(string? value)
    {
        var cleaned = value?.Trim();
        return string.IsNullOrWhiteSpace(cleaned)
            ? "tiger"
            : cleaned[..Math.Min(cleaned.Length, 32)];
    }

    private static string NormalizeAvatarImage(
        string? value)
    {
        var cleaned = value?.Trim()
            ?? string.Empty;

        if (
            string.IsNullOrWhiteSpace(cleaned)
            || cleaned.Length > 220000)
        {
            return string.Empty;
        }

        if (cleaned.StartsWith(
            "data:image/",
            StringComparison.OrdinalIgnoreCase))
        {
            return cleaned;
        }

        if (
            cleaned.StartsWith(
                "minitiger-gallery:",
                StringComparison.Ordinal)
            && Regex.IsMatch(
                cleaned,
                "^minitiger-gallery:mtavatar_[A-Za-z0-9_-]{1,48}:[1-9][0-9]*$",
                RegexOptions.CultureInvariant))
        {
            return cleaned;
        }

        return string.Empty;
    }

    private static string SafeClientValue(
        string? value,
        string fallback,
        int maxLength)
    {
        var cleaned = value?.Trim();
        if (string.IsNullOrWhiteSpace(cleaned))
        {
            return fallback;
        }

        return cleaned[..Math.Min(cleaned.Length, maxLength)];
    }

    private static string BuildInternalUsername(
        Guid ownerUserId,
        string profileId)
    {
        var profileHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(profileId)))
            .ToLowerInvariant()[..12];

        return $"mt_{ownerUserId:N}"[..11]
            + "_"
            + profileHash;
    }

    private static string BuildProfileDeviceId(
        string? originalDeviceId,
        string profileId)
    {
        var baseId = SafeClientValue(
            originalDeviceId,
            "minitiger-device",
            48);
        var suffix = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(profileId)))
            .ToLowerInvariant()[..10];

        return $"{baseId}-mtp-{suffix}";
    }

    private static string GetTechnicalPassword(
        Guid ownerUserId,
        string profileId)
    {
        var key = GetOrCreateMasterKey();
        using var hmac = new HMACSHA256(key);
        var material = Encoding.UTF8.GetBytes(
            $"{ownerUserId:N}:{profileId}");
        var digest = hmac.ComputeHash(material);

        return $"MtP-{Convert.ToHexString(digest)}-9z!";
    }

    private static byte[] GetOrCreateMasterKey()
    {
        var dataFolder = Plugin.Instance?.DataFolderPath;
        if (string.IsNullOrWhiteSpace(dataFolder))
        {
            throw new InvalidOperationException(
                "Minitiger plugin data folder is unavailable.");
        }

        Directory.CreateDirectory(dataFolder);
        var keyPath = Path.Combine(
            dataFolder,
            "profile-master.key");

        if (System.IO.File.Exists(keyPath))
        {
            var encoded = System.IO.File.ReadAllText(
                keyPath,
                Encoding.UTF8).Trim();

            try
            {
                var existing = Convert.FromBase64String(encoded);
                if (existing.Length >= 32)
                {
                    return existing;
                }
            }
            catch (FormatException)
            {
                // A damaged key is replaced below. Existing profile
                // passwords are reset on their next authentication.
            }
        }

        var key = RandomNumberGenerator.GetBytes(32);
        System.IO.File.WriteAllText(
            keyPath,
            Convert.ToBase64String(key),
            Encoding.UTF8);

        if (!OperatingSystem.IsWindows())
        {
            try
            {
                System.IO.File.SetUnixFileMode(
                    keyPath,
                    UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
            catch
            {
                // The plugin still works on filesystems that do not expose
                // Unix permission bits. The Jellyfin plugin data directory
                // remains the outer protection layer in that case.
            }
        }

        return key;
    }

    private static string GetStatePath()
    {
        var dataFolder = Plugin.Instance?.DataFolderPath;
        if (string.IsNullOrWhiteSpace(dataFolder))
        {
            throw new InvalidOperationException(
                "Minitiger plugin data folder is unavailable.");
        }

        Directory.CreateDirectory(dataFolder);
        return Path.Combine(dataFolder, "profiles.json");
    }

    private static async Task<MinitigerProfilesState> LoadStateAsync(
        CancellationToken cancellationToken)
    {
        var path = GetStatePath();

        if (!System.IO.File.Exists(path))
        {
            return new MinitigerProfilesState();
        }

        try
        {
            var json = await System.IO.File.ReadAllTextAsync(
                path,
                Encoding.UTF8,
                cancellationToken).ConfigureAwait(false);

            return JsonSerializer.Deserialize<MinitigerProfilesState>(
                json,
                JsonOptions)
                ?? new MinitigerProfilesState();
        }
        catch (JsonException)
        {
            return new MinitigerProfilesState();
        }
    }

    private static async Task SaveStateAsync(
        MinitigerProfilesState state,
        CancellationToken cancellationToken)
    {
        var path = GetStatePath();
        var temporaryPath = path + ".tmp";
        var json = JsonSerializer.Serialize(state, JsonOptions);

        try
        {
            await System.IO.File.WriteAllTextAsync(
                temporaryPath,
                json,
                Encoding.UTF8,
                cancellationToken).ConfigureAwait(false);
            System.IO.File.Move(
                temporaryPath,
                path,
                true);
        }
        finally
        {
            if (System.IO.File.Exists(temporaryPath))
            {
                System.IO.File.Delete(temporaryPath);
            }
        }
    }
}

public sealed class MinitigerProfilesSyncRequest
{
    public List<MinitigerProfileDefinition>? Profiles { get; set; }
}

public sealed class MinitigerProfileDefinition
{
    public string? ProfileId { get; set; }

    public string? DisplayName { get; set; }

    public string? Avatar { get; set; }

    public string? AvatarImage { get; set; }
}

public sealed class MinitigerProfileAuthenticateRequest
{
    public string? ProfileId { get; set; }

    public string? DisplayName { get; set; }

    public string? Avatar { get; set; }

    public string? AvatarImage { get; set; }

    public string? App { get; set; }

    public string? AppVersion { get; set; }

    public string? DeviceName { get; set; }

    public string? DeviceId { get; set; }
}

public sealed class MinitigerProfilesState
{
    public int Version { get; set; } = 1;

    public List<MinitigerHouseholdRecord> Households { get; set; } = new();
}

public sealed class MinitigerHouseholdRecord
{
    public Guid OwnerUserId { get; set; }

    public List<MinitigerProfileRecord> Profiles { get; set; } = new();
}

public sealed class MinitigerProfileRecord
{
    public string ProfileId { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string Avatar { get; set; } = "tiger";

    public string AvatarImage { get; set; } = string.Empty;

    public Guid UserId { get; set; }
}

// MINITIGER_PATCH_MARKER: PHASE_18_17_1_PROFILE_SERVER_IDENTITY

// MINITIGER_PATCH_MARKER: PHASE_18_17_1A_HOME_SETTINGS_INHERITANCE

// MINITIGER_PATCH_MARKER: PHASE_18_17_4_PROFILE_AVATAR_SERVER_SYNC

// MINITIGER_PATCH_MARKER: PHASE_18_17_4A_SHARED_AVATAR_GALLERY_ENDPOINT
