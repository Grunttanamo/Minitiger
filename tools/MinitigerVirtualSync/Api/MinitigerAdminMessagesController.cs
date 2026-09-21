using System.Text;
using System.Text.Json;
using MediaBrowser.Common.Api;
using MediaBrowser.Common.Extensions;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/AdminMessages")]
[Authorize]
public sealed class MinitigerAdminMessagesController : ControllerBase
{
    private const int MaxTitleLength = 80;
    private const int MaxBodyLength = 4000;
    private const int MaxStoredMessages = 500;
    private const int MaxHistoryItems = 100;
    private const int MaxPendingItems = 20;

    private static readonly SemaphoreSlim IoLock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IUserManager _userManager;
    private readonly IDisplayPreferencesManager _displayPreferencesManager;
    private readonly ILogger<MinitigerAdminMessagesController> _logger;

    public MinitigerAdminMessagesController(
        IUserManager userManager,
        IDisplayPreferencesManager displayPreferencesManager,
        ILogger<MinitigerAdminMessagesController> logger)
    {
        _userManager = userManager;
        _displayPreferencesManager = displayPreferencesManager;
        _logger = logger;
    }

    [HttpGet("Recipients")]
    [Authorize(Policy = Policies.RequiresElevation)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> GetRecipients(
        CancellationToken cancellationToken)
    {
        var recipients = await BuildRecipientsAsync(
            cancellationToken).ConfigureAwait(false);

        return Ok(recipients);
    }

    [HttpGet("History")]
    [Authorize(Policy = Policies.RequiresElevation)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> GetHistory(
        CancellationToken cancellationToken)
    {
        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadMessagesStateAsync(
                cancellationToken).ConfigureAwait(false);

            return Ok(
                state.Messages
                    .OrderByDescending(message => message.SentAtUtc)
                    .Take(MaxHistoryItems)
                    .Select(ToResponse)
                    .ToList());
        }
        finally
        {
            IoLock.Release();
        }
    }

    [HttpGet("Pending")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> GetPending(
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadMessagesStateAsync(
                cancellationToken).ConfigureAwait(false);

            return Ok(
                state.Messages
                    .Where(message =>
                        message.RecipientUserId == currentUserId
                        && message.ReadAtUtc is null)
                    .OrderBy(message => message.SentAtUtc)
                    .Take(MaxPendingItems)
                    .Select(ToResponse)
                    .ToList());
        }
        finally
        {
            IoLock.Release();
        }
    }

    [HttpPost]
    [Authorize(Policy = Policies.RequiresElevation)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult> SendMessage(
        [FromBody] MinitigerAdminMessageCreateRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var senderUserId))
        {
            return Unauthorized();
        }

        if (
            !Guid.TryParse(request.RecipientUserId, out var recipientUserId)
            || recipientUserId == Guid.Empty)
        {
            return BadRequest("Invalid recipient user id.");
        }

        var title = request.Title?.Trim() ?? string.Empty;
        var body = request.Body?.Trim() ?? string.Empty;

        if (
            string.IsNullOrWhiteSpace(title)
            || title.Length > MaxTitleLength)
        {
            return BadRequest(
                $"Title must contain 1-{MaxTitleLength} characters.");
        }

        if (
            string.IsNullOrWhiteSpace(body)
            || body.Length > MaxBodyLength)
        {
            return BadRequest(
                $"Message must contain 1-{MaxBodyLength} characters.");
        }

        var recipients = await BuildRecipientsAsync(
            cancellationToken).ConfigureAwait(false);
        var recipient = recipients.FirstOrDefault(value =>
            value.Id == recipientUserId);

        if (recipient is null)
        {
            return BadRequest("The selected recipient no longer exists.");
        }

        var sender = _userManager.GetUserById(senderUserId);
        var senderName = sender is null
            ? "Administrator"
            : _userManager.GetUserDto(sender).Name?.Trim()
                ?? "Administrator";

        var record = new MinitigerAdminMessageRecord
        {
            Id = Guid.NewGuid(),
            RecipientUserId = recipientUserId,
            RecipientName = recipient.Name,
            SenderUserId = senderUserId,
            SenderName = senderName,
            Title = title,
            Body = body,
            SentAtUtc = DateTimeOffset.UtcNow
        };

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadMessagesStateAsync(
                cancellationToken).ConfigureAwait(false);

            state.Messages.Add(record);

            if (state.Messages.Count > MaxStoredMessages)
            {
                state.Messages = state.Messages
                    .OrderByDescending(message => message.SentAtUtc)
                    .Take(MaxStoredMessages)
                    .OrderBy(message => message.SentAtUtc)
                    .ToList();
            }

            await SaveMessagesStateAsync(
                state,
                cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            IoLock.Release();
        }

        _logger.LogInformation(
            "Minitiger admin message {MessageId} sent to user {RecipientUserId}.",
            record.Id,
            record.RecipientUserId);

        return Ok(ToResponse(record));
    }

    [HttpPost("{messageId:guid}/Read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> MarkRead(
        [FromRoute] Guid messageId,
        CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
        {
            return Unauthorized();
        }

        await IoLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var state = await LoadMessagesStateAsync(
                cancellationToken).ConfigureAwait(false);

            var message = state.Messages.FirstOrDefault(value =>
                value.Id == messageId
                && value.RecipientUserId == currentUserId);

            if (message is null)
            {
                return NotFound();
            }

            if (message.ReadAtUtc is null)
            {
                message.ReadAtUtc = DateTimeOffset.UtcNow;

                await SaveMessagesStateAsync(
                    state,
                    cancellationToken).ConfigureAwait(false);
            }

            return NoContent();
        }
        finally
        {
            IoLock.Release();
        }
    }

    private MinitigerAdminMessageResponse ToResponse(
        MinitigerAdminMessageRecord record)
    {
        return new MinitigerAdminMessageResponse
        {
            Id = record.Id,
            RecipientUserId = record.RecipientUserId,
            RecipientName = record.RecipientName,
            SenderUserId = record.SenderUserId,
            SenderName = record.SenderName,
            SenderAvatarImage = ReadMinitigerAvatarImage(
                record.SenderUserId),
            Title = record.Title,
            Body = record.Body,
            SentAtUtc = record.SentAtUtc,
            ReadAtUtc = record.ReadAtUtc
        };
    }

    private string ReadMinitigerAvatarImage(
        Guid userId)
    {
        const string preferencesClient = "MinitigerWeb";
        const string avatarSettingsKey = "avatarSettings";

        try
        {
            var itemId = "minitiger".GetMD5();
            var preferences = _displayPreferencesManager
                .ListCustomItemDisplayPreferences(
                    userId,
                    itemId,
                    preferencesClient);

            if (
                !preferences.TryGetValue(
                    avatarSettingsKey,
                    out var raw)
                || string.IsNullOrWhiteSpace(raw))
            {
                return string.Empty;
            }

            using var document = JsonDocument.Parse(raw);
            var root = document.RootElement;

            if (root.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }

            if (
                root.TryGetProperty("enabled", out var enabled)
                && enabled.ValueKind == JsonValueKind.False)
            {
                return string.Empty;
            }

            if (
                !root.TryGetProperty("image", out var imageElement)
                || imageElement.ValueKind != JsonValueKind.String)
            {
                return string.Empty;
            }

            var image = imageElement.GetString()?.Trim()
                ?? string.Empty;

            if (
                string.IsNullOrWhiteSpace(image)
                || image.Length > 220000)
            {
                return string.Empty;
            }

            if (
                image.StartsWith(
                    "data:image/",
                    StringComparison.OrdinalIgnoreCase)
                || image.StartsWith(
                    "minitiger-gallery:",
                    StringComparison.Ordinal))
            {
                return image;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "Minitiger sender avatar could not be read for user {UserId}.",
                userId);
        }

        return string.Empty;
    }

    private async Task<List<MinitigerAdminMessageRecipient>> BuildRecipientsAsync(
        CancellationToken cancellationToken)
    {
        var profileState = await LoadProfilesStateAsync(
            cancellationToken).ConfigureAwait(false);

        var technicalProfiles = profileState.Households
            .SelectMany(household => household.Profiles.Select(profile => new
            {
                household.OwnerUserId,
                Profile = profile
            }))
            .ToList();

        var technicalUserIds = technicalProfiles
            .Select(value => value.Profile.UserId)
            .ToHashSet();

        var recipients = new List<MinitigerAdminMessageRecipient>();

        foreach (var user in _userManager.GetUsers())
        {
            if (technicalUserIds.Contains(user.Id))
            {
                continue;
            }

            var dto = _userManager.GetUserDto(user);
            var name = dto.Name?.Trim();

            if (string.IsNullOrWhiteSpace(name))
            {
                name = user.Id.ToString("N");
            }

            recipients.Add(new MinitigerAdminMessageRecipient
            {
                Id = user.Id,
                Name = name,
                Kind = "jellyfin",
                IsAdministrator = dto.Policy?.IsAdministrator == true
            });
        }

        foreach (var value in technicalProfiles)
        {
            if (_userManager.GetUserById(value.Profile.UserId) is null)
            {
                continue;
            }

            var owner = _userManager.GetUserById(value.OwnerUserId);
            var ownerName = owner is null
                ? string.Empty
                : _userManager.GetUserDto(owner).Name?.Trim()
                    ?? string.Empty;

            recipients.Add(new MinitigerAdminMessageRecipient
            {
                Id = value.Profile.UserId,
                Name = string.IsNullOrWhiteSpace(value.Profile.DisplayName)
                    ? "Minitiger-Profil"
                    : value.Profile.DisplayName,
                Kind = "profile",
                ParentName = ownerName,
                IsAdministrator = false
            });
        }

        return recipients
            .OrderBy(recipient =>
                recipient.Kind == "jellyfin" ? 0 : 1)
            .ThenBy(
                recipient => recipient.Name,
                StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var raw = User.FindFirst("Jellyfin-UserId")?.Value;

        return Guid.TryParse(raw, out userId)
            && userId != Guid.Empty;
    }

    private static string GetMessagesStatePath()
    {
        var dataFolder = Plugin.Instance?.DataFolderPath;

        if (string.IsNullOrWhiteSpace(dataFolder))
        {
            throw new InvalidOperationException(
                "Minitiger plugin data folder is unavailable.");
        }

        Directory.CreateDirectory(dataFolder);
        return Path.Combine(dataFolder, "admin-messages.json");
    }

    private static string? GetProfilesStatePath()
    {
        var dataFolder = Plugin.Instance?.DataFolderPath;

        if (string.IsNullOrWhiteSpace(dataFolder))
        {
            return null;
        }

        return Path.Combine(dataFolder, "profiles.json");
    }

    private static async Task<MinitigerProfilesState> LoadProfilesStateAsync(
        CancellationToken cancellationToken)
    {
        var path = GetProfilesStatePath();

        if (
            string.IsNullOrWhiteSpace(path)
            || !System.IO.File.Exists(path))
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
        catch (Exception)
        {
            return new MinitigerProfilesState();
        }
    }

    private static async Task<MinitigerAdminMessagesState> LoadMessagesStateAsync(
        CancellationToken cancellationToken)
    {
        var path = GetMessagesStatePath();

        if (!System.IO.File.Exists(path))
        {
            return new MinitigerAdminMessagesState();
        }

        try
        {
            var json = await System.IO.File.ReadAllTextAsync(
                path,
                Encoding.UTF8,
                cancellationToken).ConfigureAwait(false);

            return JsonSerializer.Deserialize<MinitigerAdminMessagesState>(
                json,
                JsonOptions)
                ?? new MinitigerAdminMessagesState();
        }
        catch (JsonException)
        {
            return new MinitigerAdminMessagesState();
        }
    }

    private static async Task SaveMessagesStateAsync(
        MinitigerAdminMessagesState state,
        CancellationToken cancellationToken)
    {
        var path = GetMessagesStatePath();
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

public sealed class MinitigerAdminMessageCreateRequest
{
    public string? RecipientUserId { get; set; }

    public string? Title { get; set; }

    public string? Body { get; set; }
}

public sealed class MinitigerAdminMessagesState
{
    public int Version { get; set; } = 1;

    public List<MinitigerAdminMessageRecord> Messages { get; set; } = new();
}

public sealed class MinitigerAdminMessageRecord
{
    public Guid Id { get; set; }

    public Guid RecipientUserId { get; set; }

    public string RecipientName { get; set; } = string.Empty;

    public Guid SenderUserId { get; set; }

    public string SenderName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public DateTimeOffset SentAtUtc { get; set; }

    public DateTimeOffset? ReadAtUtc { get; set; }
}

public sealed class MinitigerAdminMessageResponse
{
    public Guid Id { get; set; }

    public Guid RecipientUserId { get; set; }

    public string RecipientName { get; set; } = string.Empty;

    public Guid SenderUserId { get; set; }

    public string SenderName { get; set; } = string.Empty;

    public string SenderAvatarImage { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Body { get; set; } = string.Empty;

    public DateTimeOffset SentAtUtc { get; set; }

    public DateTimeOffset? ReadAtUtc { get; set; }
}

public sealed class MinitigerAdminMessageRecipient
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Kind { get; set; } = "jellyfin";

    public string ParentName { get; set; } = string.Empty;

    public bool IsAdministrator { get; set; }
}

// MINITIGER_PATCH_MARKER: PHASE_18_19_0_ADMIN_MESSAGES_CONTROLLER

// MINITIGER_PATCH_MARKER: PHASE_18_19_1C_CUSTOM_SENDER_AVATAR_API
