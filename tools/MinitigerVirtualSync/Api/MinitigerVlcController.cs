using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Session;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/Vlc")]
public sealed class MinitigerVlcController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, MinitigerVlcJobRecord> Jobs = new(StringComparer.Ordinal);
    private static readonly ConcurrentDictionary<string, MinitigerVlcSessionRecord> Sessions = new(StringComparer.Ordinal);
    private static readonly TimeSpan JobLifetime = TimeSpan.FromSeconds(90);
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(18);
    private const int MaxQueueItems = 100;
    private const string BridgeVersion = "18.23.1e";

    private readonly IUserManager _userManager;
    private readonly ISessionManager _sessionManager;
    private readonly ILogger<MinitigerVlcController> _logger;

    public MinitigerVlcController(
        IUserManager userManager,
        ISessionManager sessionManager,
        ILogger<MinitigerVlcController> logger)
    {
        _userManager = userManager;
        _sessionManager = sessionManager;
        _logger = logger;
    }

    [HttpGet("Status")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetStatus()
    {
        CleanupExpired();

        return Ok(new
        {
            ready = true,
            version = "1.3.1",
            bridgeVersion = BridgeVersion,
            activeJobs = Jobs.Count,
            activeSessions = Sessions.Count
        });
    }

    [HttpPost("Jobs")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult CreateJob([FromBody] MinitigerVlcJobRequest request)
    {
        CleanupExpired();

        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var requestedItems = request.Queue is { Count: > 0 }
            ? request.Queue
            : new List<MinitigerVlcQueueItemRequest>
            {
                new()
                {
                    StreamUrl = request.StreamUrl,
                    Title = request.Title,
                    ItemId = request.ItemId,
                    ItemType = request.ItemType,
                    MediaSourceId = request.MediaSourceId,
                    StartPositionTicks = request.StartPositionTicks,
                    DurationTicks = request.DurationTicks,
                    AudioStreamIndex = request.AudioStreamIndex,
                    SubtitleStreamIndex = request.SubtitleStreamIndex,
                    PlayMethod = request.PlayMethod,
                    PlaySessionId = request.PlaySessionId
                }
            };

        if (requestedItems.Count == 0 || requestedItems.Count > MaxQueueItems)
        {
            return BadRequest($"VLC queue must contain between 1 and {MaxQueueItems} items.");
        }

        var normalizedQueue = new List<MinitigerVlcQueueItemRecord>(requestedItems.Count);
        foreach (var candidate in requestedItems)
        {
            if (!TryNormalizeQueueItem(candidate, out var normalized, out var error))
            {
                return BadRequest(error);
            }

            normalizedQueue.Add(normalized);
        }

        var callbackBaseUrl = NormalizeCallbackBaseUrl(request.CallbackBaseUrl);
        var jobId = RandomHex(24);

        Jobs[jobId] = new MinitigerVlcJobRecord
        {
            UserId = userId,
            CallbackBaseUrl = callbackBaseUrl,
            Queue = normalizedQueue,
            ExpiresAtUtc = DateTimeOffset.UtcNow.Add(JobLifetime)
        };

        return Ok(new
        {
            jobId,
            expiresAtUtc = Jobs[jobId].ExpiresAtUtc
        });
    }

    [HttpGet("Jobs/{jobId}")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> ConsumeJob([FromRoute] string jobId)
    {
        CleanupExpired();

        if (string.IsNullOrWhiteSpace(jobId)
            || jobId.Length != 48
            || !Jobs.TryRemove(jobId, out var job)
            || job.ExpiresAtUtc <= DateTimeOffset.UtcNow)
        {
            return NotFound();
        }

        var user = _userManager.GetUserById(job.UserId);
        if (user is null)
        {
            return NotFound();
        }

        // Minitiger VLC supports one active local VLC session per Jellyfin user.
        // Clean up an older bridge session before registering a new one so the
        // dashboard cannot retain a stale "now playing" card.
        await CloseExistingUserSessionsAsync(job.UserId).ConfigureAwait(false);

        var publicSessionId = RandomHex(18);
        var sessionSecret = RandomHex(32);
        // Keep one stable Jellyfin device identity per user. This lets
        // Jellyfin reuse the VLC device card instead of accumulating a new
        // random device entry for every manual playback.
        var deviceId = $"minitiger-vlc-{job.UserId:N}";
        var remoteEndPoint = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        var jellyfinSession = await _sessionManager.LogSessionActivity(
            "Minitiger VLC",
            BridgeVersion,
            deviceId,
            "VLC Media Player",
            remoteEndPoint,
            user).ConfigureAwait(false);

        var session = new MinitigerVlcSessionRecord
        {
            UserId = job.UserId,
            Secret = sessionSecret,
            JellyfinSessionId = jellyfinSession.Id,
            Queue = job.Queue,
            LastActivityUtc = DateTimeOffset.UtcNow
        };

        Sessions[publicSessionId] = session;

        var callbackBase = string.IsNullOrWhiteSpace(job.CallbackBaseUrl)
            ? $"{Request.Scheme}://{Request.Host}{Request.PathBase}/Minitiger/Vlc"
            : job.CallbackBaseUrl;
        var eventUrl = $"{callbackBase.TrimEnd('/')}/Sessions/{publicSessionId}/Events?secret={sessionSecret}";

        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
        Response.Headers["Pragma"] = "no-cache";

        return Ok(new
        {
            sessionId = publicSessionId,
            eventUrl,
            queue = session.Queue.Select((item, index) => new
            {
                queueIndex = index,
                streamUrl = item.StreamUrl,
                title = item.Title,
                itemId = item.ItemId.ToString("D"),
                itemType = item.ItemType,
                mediaSourceId = item.MediaSourceId,
                startPositionTicks = item.StartPositionTicks,
                durationTicks = item.DurationTicks,
                audioStreamIndex = item.AudioStreamIndex,
                subtitleStreamIndex = item.SubtitleStreamIndex,
                playMethod = item.PlayMethod.ToString(),
                playSessionId = item.PlaySessionId
            })
        });
    }

    [HttpPost("Sessions/{sessionId}/Events")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> ReportEvent(
        [FromRoute] string sessionId,
        [FromQuery] string? secret,
        [FromBody] MinitigerVlcPlaybackEvent request)
    {
        CleanupExpired();

        if (!Sessions.TryGetValue(sessionId, out var session)
            || !SecretEquals(session.Secret, secret))
        {
            return NotFound();
        }

        await session.Gate.WaitAsync(HttpContext.RequestAborted).ConfigureAwait(false);
        try
        {
            session.LastActivityUtc = DateTimeOffset.UtcNow;
            var state = (request.State ?? string.Empty).Trim().ToLowerInvariant();

            if (state == "session-end")
            {
                await StopActiveItemAsync(session, request, false).ConfigureAwait(false);
                Sessions.TryRemove(sessionId, out _);
                await TryEndJellyfinSessionAsync(session.JellyfinSessionId).ConfigureAwait(false);
                return NoContent();
            }

            if (request.QueueIndex < 0 || request.QueueIndex >= session.Queue.Count)
            {
                return BadRequest("Invalid VLC queue index.");
            }

            var item = session.Queue[request.QueueIndex];
            var positionTicks = ClampPosition(request.PositionTicks, item.DurationTicks);

            switch (state)
            {
                case "start":
                    await EnsureStartedAsync(
                        session,
                        request.QueueIndex,
                        positionTicks,
                        request.IsPaused,
                        request.VolumeLevel).ConfigureAwait(false);
                    break;

                case "progress":
                    await EnsureStartedAsync(
                        session,
                        request.QueueIndex,
                        positionTicks,
                        request.IsPaused,
                        request.VolumeLevel).ConfigureAwait(false);
                    await _sessionManager.OnPlaybackProgress(
                        CreateProgressInfo(
                            session,
                            item,
                            positionTicks,
                            request.IsPaused,
                            request.VolumeLevel)).ConfigureAwait(false);
                    session.LastPositionTicks = positionTicks;
                    break;

                case "stop":
                    if (session.ActiveQueueIndex != request.QueueIndex)
                    {
                        await EnsureStartedAsync(
                            session,
                            request.QueueIndex,
                            positionTicks,
                            request.IsPaused,
                            request.VolumeLevel).ConfigureAwait(false);
                    }

                    await StopActiveItemAsync(session, request, request.Failed).ConfigureAwait(false);
                    break;

                default:
                    return BadRequest("Unknown VLC playback event.");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Minitiger VLC playback event failed for session {SessionId}.", sessionId);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
        finally
        {
            session.Gate.Release();
        }
    }

    private async Task EnsureStartedAsync(
        MinitigerVlcSessionRecord session,
        int queueIndex,
        long positionTicks,
        bool isPaused,
        int? volumeLevel)
    {
        if (session.ActiveQueueIndex == queueIndex)
        {
            session.LastPositionTicks = positionTicks;
            return;
        }

        if (session.ActiveQueueIndex >= 0)
        {
            await StopActiveItemAsync(
                session,
                new MinitigerVlcPlaybackEvent
                {
                    QueueIndex = session.ActiveQueueIndex,
                    PositionTicks = session.LastPositionTicks
                },
                false).ConfigureAwait(false);
        }

        var item = session.Queue[queueIndex];
        var info = new PlaybackStartInfo
        {
            CanSeek = true,
            ItemId = item.ItemId,
            SessionId = session.JellyfinSessionId,
            MediaSourceId = item.MediaSourceId,
            AudioStreamIndex = item.AudioStreamIndex,
            SubtitleStreamIndex = item.SubtitleStreamIndex,
            IsPaused = isPaused,
            IsMuted = false,
            PositionTicks = positionTicks,
            VolumeLevel = volumeLevel,
            PlayMethod = item.PlayMethod,
            PlaySessionId = item.PlaySessionId,
            RepeatMode = RepeatMode.RepeatNone
        };

        await _sessionManager.OnPlaybackStart(info).ConfigureAwait(false);
        session.ActiveQueueIndex = queueIndex;
        session.LastPositionTicks = positionTicks;
    }

    private static PlaybackProgressInfo CreateProgressInfo(
        MinitigerVlcSessionRecord session,
        MinitigerVlcQueueItemRecord item,
        long positionTicks,
        bool isPaused,
        int? volumeLevel)
        => new()
        {
            CanSeek = true,
            ItemId = item.ItemId,
            SessionId = session.JellyfinSessionId,
            MediaSourceId = item.MediaSourceId,
            AudioStreamIndex = item.AudioStreamIndex,
            SubtitleStreamIndex = item.SubtitleStreamIndex,
            IsPaused = isPaused,
            IsMuted = false,
            PositionTicks = positionTicks,
            VolumeLevel = volumeLevel,
            PlayMethod = item.PlayMethod,
            PlaySessionId = item.PlaySessionId,
            RepeatMode = RepeatMode.RepeatNone
        };

    private async Task StopActiveItemAsync(
        MinitigerVlcSessionRecord session,
        MinitigerVlcPlaybackEvent request,
        bool failed)
    {
        if (session.ActiveQueueIndex < 0 || session.ActiveQueueIndex >= session.Queue.Count)
        {
            return;
        }

        var activeIndex = session.ActiveQueueIndex;
        var item = session.Queue[activeIndex];
        var position = request.QueueIndex == activeIndex
            ? ClampPosition(request.PositionTicks, item.DurationTicks)
            : session.LastPositionTicks;

        var nextMediaType = activeIndex + 1 < session.Queue.Count
            ? session.Queue[activeIndex + 1].ItemType
            : null;

        await _sessionManager.OnPlaybackStopped(new PlaybackStopInfo
        {
            ItemId = item.ItemId,
            SessionId = session.JellyfinSessionId,
            MediaSourceId = item.MediaSourceId,
            PositionTicks = position,
            PlaySessionId = item.PlaySessionId,
            Failed = failed,
            NextMediaType = nextMediaType
        }).ConfigureAwait(false);

        session.ActiveQueueIndex = -1;
        session.LastPositionTicks = 0;
    }

    private async Task CloseExistingUserSessionsAsync(Guid userId)
    {
        foreach (var pair in Sessions.ToArray())
        {
            var existing = pair.Value;
            if (existing.UserId != userId)
            {
                continue;
            }

            await existing.Gate.WaitAsync(HttpContext.RequestAborted).ConfigureAwait(false);
            try
            {
                if (!Sessions.TryRemove(pair.Key, out _))
                {
                    continue;
                }

                if (existing.ActiveQueueIndex >= 0
                    && existing.ActiveQueueIndex < existing.Queue.Count)
                {
                    await StopActiveItemAsync(
                        existing,
                        new MinitigerVlcPlaybackEvent
                        {
                            QueueIndex = existing.ActiveQueueIndex,
                            PositionTicks = existing.LastPositionTicks
                        },
                        false).ConfigureAwait(false);
                }

                await TryEndJellyfinSessionAsync(existing.JellyfinSessionId).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Older Minitiger VLC session {SessionId} could not be closed cleanly.",
                    pair.Key);
            }
            finally
            {
                existing.Gate.Release();
            }
        }
    }

    private async Task TryEndJellyfinSessionAsync(string sessionId)
    {
        try
        {
            await _sessionManager.ReportSessionEnded(sessionId).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Minitiger VLC Jellyfin session {SessionId} was already gone.", sessionId);
        }
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var raw = User.FindFirst("Jellyfin-UserId")?.Value;
        return Guid.TryParse(raw, out userId) && userId != Guid.Empty;
    }

    private string NormalizeCallbackBaseUrl(string? value)
    {
        if (!string.IsNullOrWhiteSpace(value)
            && value.Length <= 2048
            && Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            return value.TrimEnd('/');
        }

        return $"{Request.Scheme}://{Request.Host}{Request.PathBase}/Minitiger/Vlc";
    }

    private static bool TryNormalizeQueueItem(
        MinitigerVlcQueueItemRequest request,
        out MinitigerVlcQueueItemRecord result,
        out string error)
    {
        result = new MinitigerVlcQueueItemRecord();
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(request.StreamUrl)
            || request.StreamUrl.Length > 16384
            || !Uri.TryCreate(request.StreamUrl, UriKind.Absolute, out var streamUri)
            || (streamUri.Scheme != Uri.UriSchemeHttp && streamUri.Scheme != Uri.UriSchemeHttps))
        {
            error = "Every VLC queue item needs a valid HTTP(S) media URL.";
            return false;
        }

        if (!Guid.TryParse(request.ItemId, out var itemId) || itemId == Guid.Empty)
        {
            error = "Every VLC queue item needs a valid Jellyfin item id.";
            return false;
        }

        result = new MinitigerVlcQueueItemRecord
        {
            StreamUrl = request.StreamUrl,
            Title = NormalizeText(request.Title, 300),
            ItemId = itemId,
            ItemType = NormalizeText(request.ItemType, 64),
            MediaSourceId = NormalizeText(request.MediaSourceId, 128),
            StartPositionTicks = Math.Max(0, request.StartPositionTicks),
            DurationTicks = Math.Max(0, request.DurationTicks),
            AudioStreamIndex = request.AudioStreamIndex,
            SubtitleStreamIndex = request.SubtitleStreamIndex,
            PlayMethod = ParsePlayMethod(request.PlayMethod),
            PlaySessionId = NormalizeText(request.PlaySessionId, 128)
        };

        return true;
    }

    private static PlayMethod ParsePlayMethod(string? value)
        => Enum.TryParse<PlayMethod>(value, true, out var parsed)
            ? parsed
            : PlayMethod.DirectPlay;

    private static long ClampPosition(long? positionTicks, long durationTicks)
    {
        var value = Math.Max(0, positionTicks ?? 0);
        return durationTicks > 0
            ? Math.Min(value, durationTicks)
            : value;
    }

    private static string NormalizeText(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }

    private static string RandomHex(int byteCount)
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(byteCount)).ToLowerInvariant();

    private static bool SecretEquals(string expected, string? actual)
    {
        if (string.IsNullOrEmpty(actual) || expected.Length != actual.Length)
        {
            return false;
        }

        var a = Encoding.UTF8.GetBytes(expected);
        var b = Encoding.UTF8.GetBytes(actual);
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    private static void CleanupExpired()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var pair in Jobs)
        {
            if (pair.Value.ExpiresAtUtc <= now)
            {
                Jobs.TryRemove(pair.Key, out _);
            }
        }

        foreach (var pair in Sessions)
        {
            if (pair.Value.LastActivityUtc + SessionLifetime <= now)
            {
                Sessions.TryRemove(pair.Key, out _);
            }
        }
    }

    private sealed class MinitigerVlcJobRecord
    {
        public Guid UserId { get; init; }
        public string CallbackBaseUrl { get; init; } = string.Empty;
        public List<MinitigerVlcQueueItemRecord> Queue { get; init; } = new();
        public DateTimeOffset ExpiresAtUtc { get; init; }
    }

    private sealed class MinitigerVlcSessionRecord
    {
        public Guid UserId { get; init; }
        public string Secret { get; init; } = string.Empty;
        public string JellyfinSessionId { get; init; } = string.Empty;
        public List<MinitigerVlcQueueItemRecord> Queue { get; init; } = new();
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public int ActiveQueueIndex { get; set; } = -1;
        public long LastPositionTicks { get; set; }
        public DateTimeOffset LastActivityUtc { get; set; }
    }

    private sealed class MinitigerVlcQueueItemRecord
    {
        public string StreamUrl { get; init; } = string.Empty;
        public string Title { get; init; } = string.Empty;
        public Guid ItemId { get; init; }
        public string ItemType { get; init; } = string.Empty;
        public string MediaSourceId { get; init; } = string.Empty;
        public long StartPositionTicks { get; init; }
        public long DurationTicks { get; init; }
        public int? AudioStreamIndex { get; init; }
        public int? SubtitleStreamIndex { get; init; }
        public PlayMethod PlayMethod { get; init; } = PlayMethod.DirectPlay;
        public string PlaySessionId { get; init; } = string.Empty;
    }
}

public sealed class MinitigerVlcJobRequest
{
    public string? CallbackBaseUrl { get; set; }
    public List<MinitigerVlcQueueItemRequest>? Queue { get; set; }

    // 18.23.0c compatibility while web and Companion are being updated.
    public string StreamUrl { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? ItemId { get; set; }
    public string? ItemType { get; set; }
    public string? MediaSourceId { get; set; }
    public long StartPositionTicks { get; set; }
    public long DurationTicks { get; set; }
    public int? AudioStreamIndex { get; set; }
    public int? SubtitleStreamIndex { get; set; }
    public string? PlayMethod { get; set; }
    public string? PlaySessionId { get; set; }
}

public sealed class MinitigerVlcQueueItemRequest
{
    public string StreamUrl { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? ItemId { get; set; }
    public string? ItemType { get; set; }
    public string? MediaSourceId { get; set; }
    public long StartPositionTicks { get; set; }
    public long DurationTicks { get; set; }
    public int? AudioStreamIndex { get; set; }
    public int? SubtitleStreamIndex { get; set; }
    public string? PlayMethod { get; set; }
    public string? PlaySessionId { get; set; }
}

public sealed class MinitigerVlcPlaybackEvent
{
    public string? State { get; set; }
    public int QueueIndex { get; set; }
    public long? PositionTicks { get; set; }
    public long? DurationTicks { get; set; }
    public bool IsPaused { get; set; }
    public int? VolumeLevel { get; set; }
    public bool Failed { get; set; }
}
