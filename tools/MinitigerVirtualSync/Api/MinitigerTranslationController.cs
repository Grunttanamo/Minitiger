using Jellyfin.Plugin.MinitigerVirtualSync.Translation;
using MediaBrowser.Common.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/Translation")]
[Authorize(Policy = Policies.RequiresElevation)]
public sealed class MinitigerTranslationController : ControllerBase
{
    private readonly MinitigerTranslationBackgroundService _service;

    public MinitigerTranslationController(
        MinitigerTranslationBackgroundService service)
    {
        _service = service;
    }

    [HttpGet("Settings")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> GetSettings(
        CancellationToken cancellationToken)
    {
        var settings = await _service
            .GetSettingsAsync(cancellationToken)
            .ConfigureAwait(false);

        return Ok(new
        {
            enabled = settings.Enabled,
            mode = settings.Mode,
            intervalMinutes = settings.IntervalMinutes,
            hasApiKey = settings.HasApiKey,
            model = settings.Model,
            minTitleWords = settings.MinTitleWords,
            protectFranchise = settings.ProtectFranchise,
            scanTitles = settings.ScanTitles,
            scanOverviews = settings.ScanOverviews,
            itemSeries = settings.ItemSeries,
            itemSeasons = settings.ItemSeasons,
            itemEpisodes = settings.ItemEpisodes,
            itemMovies = settings.ItemMovies,
            libraryIds = settings.LibraryIds,
            batchSize = settings.BatchSize,
            maxPerRun = settings.MaxPerRun,
            cleanMetadata = settings.CleanMetadata
        });
    }

    [HttpPut("Settings")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> PutSettings(
        [FromBody] MinitigerTranslationBackgroundSettings settings,
        CancellationToken cancellationToken)
    {
        await _service
            .SaveSettingsAsync(
                settings,
                cancellationToken)
            .ConfigureAwait(false);

        return NoContent();
    }

    [HttpGet("Libraries")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetLibraries()
    {
        return Ok(
            _service
                .GetLibraries()
                .Select(library => new
                {
                    id = library.Id,
                    name = library.Name,
                    collectionType =
                        library.CollectionType
                })
                .ToArray());
    }

    [HttpGet("Status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetStatus()
    {
        var status = _service.GetStatus();

        return Ok(new
        {
            workerOnline =
                status.WorkerOnline,
            workerStartedUtc =
                status.WorkerStartedUtc,
            heartbeatUtc =
                status.HeartbeatUtc,
            enabled =
                status.Enabled,
            running =
                status.Running,
            state =
                status.State,
            mode =
                status.Mode,
            message =
                status.Message,
            currentItem =
                status.CurrentItem,
            lastError =
                status.LastError,
            lastRunUtc =
                status.LastRunUtc,
            nextRunUtc =
                status.NextRunUtc,
            lastApiTestUtc =
                status.LastApiTestUtc,
            lastApiTestOk =
                status.LastApiTestOk,
            lastApiTestMessage =
                status.LastApiTestMessage,
            configuredLibraries =
                status.ConfiguredLibraries,
            resolvedLibraries =
                status.ResolvedLibraries,
            @checked =
                status.Checked,
            found =
                status.Found,
            applied =
                status.Applied,
            errors =
                status.Errors,
            inputTokens =
                status.InputTokens,
            outputTokens =
                status.OutputTokens
        });
    }

    [HttpPost("TestApi")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> TestApi(
        [FromBody] MinitigerTranslationApiTestRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service
                .TestApiAsync(
                    request,
                    cancellationToken)
                .ConfigureAwait(false);

        return Ok(new
        {
            ok =
                result.Ok,
            statusCode =
                result.StatusCode,
            model =
                result.Model,
            message =
                result.Message
        });
    }

    [HttpPost("RunNow")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public ActionResult RunNow()
    {
        _service.RequestRunNow();

        return Accepted(new
        {
            queued = true,
            message =
                "Minitiger background translation run queued."
        });
    }

    [HttpPost("Stop")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> Stop(
        CancellationToken cancellationToken)
    {
        await _service
            .StopAsync(cancellationToken)
            .ConfigureAwait(false);

        return Ok(new
        {
            stopped = true,
            message =
                "Minitiger background translation stopped."
        });
    }
}

// MINITIGER_PATCH_MARKER: PHASE_18_18_2_BACKGROUND_CONTROL_API

// MINITIGER_PATCH_MARKER: PHASE_18_18_2A_CAMELCASE_API_PAYLOADS
