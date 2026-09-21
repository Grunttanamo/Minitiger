using System.Globalization;
using Jellyfin.Data.Enums;
using Jellyfin.Database.Implementations.Enums;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/SeasonFix")]
[Authorize(Policy = Policies.RequiresElevation)]
public sealed class MinitigerSeasonFixController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;
    private readonly ILogger<MinitigerSeasonFixController> _logger;

    public MinitigerSeasonFixController(
        ILibraryManager libraryManager,
        ILogger<MinitigerSeasonFixController> logger)
    {
        _libraryManager = libraryManager;
        _logger = logger;
    }

    [HttpGet("Scan")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult Scan()
    {
        var scan = ScanSeasons();
        return Ok(ToScanResponse(scan));
    }

    [HttpPost("Apply")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> Apply(
        CancellationToken cancellationToken)
    {
        var before = ScanSeasons();
        var corrected = 0;
        var errors = new List<object>();

        foreach (var candidate in before.Candidates)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                candidate.Season.Name = candidate.ExpectedName;

                await candidate.Season
                    .UpdateToRepositoryAsync(
                        ItemUpdateType.MetadataEdit,
                        cancellationToken)
                    .ConfigureAwait(false);

                corrected++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Minitiger Staffel Fix could not rename season {SeasonId} from {CurrentName} to {ExpectedName}.",
                    candidate.Season.Id,
                    candidate.CurrentName,
                    candidate.ExpectedName);

                errors.Add(new
                {
                    seasonId = candidate.Season.Id,
                    seriesName = candidate.SeriesName,
                    currentName = candidate.CurrentName,
                    expectedName = candidate.ExpectedName,
                    message = ex.Message
                });
            }
        }

        var after = ScanSeasons();

        return Ok(new
        {
            requested = before.Candidates.Count,
            corrected,
            failed = errors.Count,
            remainingMismatchCount = after.Candidates.Count,
            scannedSeasons = after.ScannedSeasons,
            skippedWithoutIndex = after.Skipped.Count,
            errors = errors.ToArray()
        });
    }

    private SeasonFixScan ScanSeasons()
    {
        var items = _libraryManager.GetItemList(
            new InternalItemsQuery
            {
                Recursive = true,
                IncludeItemTypes = new[]
                {
                    BaseItemKind.Season
                },
                IsVirtualItem = false,
                GroupByPresentationUniqueKey = false,
                EnableTotalRecordCount = false
            });

        var scanned = 0;
        var skipped = new List<SeasonFixSkipped>();
        var candidates = new List<SeasonFixCandidate>();

        foreach (var season in items.OfType<Season>())
        {
            scanned++;

            if (
                !season.IndexNumber.HasValue
                || season.IndexNumber.Value < 0)
            {
                skipped.Add(
                    new SeasonFixSkipped(
                        season.Id,
                        ResolveSeriesName(season),
                        season.Name?.Trim() ?? string.Empty,
                        !season.IndexNumber.HasValue
                            ? "Keine IndexNumber vorhanden"
                            : $"Ungültige IndexNumber: {season.IndexNumber.Value.ToString(CultureInfo.InvariantCulture)}"));
                continue;
            }

            var indexNumber = season.IndexNumber.Value;
            var expectedName = indexNumber == 0
                ? "Specials"
                : $"Staffel {indexNumber.ToString(CultureInfo.InvariantCulture)}";
            var currentName = season.Name?.Trim() ?? string.Empty;

            if (string.Equals(
                currentName,
                expectedName,
                StringComparison.Ordinal))
            {
                continue;
            }

            candidates.Add(
                new SeasonFixCandidate(
                    season,
                    ResolveSeriesName(season),
                    currentName,
                    expectedName,
                    indexNumber));
        }

        candidates.Sort((left, right) =>
        {
            var bySeries = string.Compare(
                left.SeriesName,
                right.SeriesName,
                StringComparison.CurrentCultureIgnoreCase);

            if (bySeries != 0)
            {
                return bySeries;
            }

            return left.IndexNumber.CompareTo(right.IndexNumber);
        });

        skipped.Sort((left, right) =>
        {
            var bySeries = string.Compare(
                left.SeriesName,
                right.SeriesName,
                StringComparison.CurrentCultureIgnoreCase);

            if (bySeries != 0)
            {
                return bySeries;
            }

            return string.Compare(
                left.CurrentName,
                right.CurrentName,
                StringComparison.CurrentCultureIgnoreCase);
        });

        return new SeasonFixScan(
            scanned,
            skipped,
            candidates);
    }

    private string ResolveSeriesName(Season season)
    {
        if (!string.IsNullOrWhiteSpace(season.SeriesName))
        {
            return season.SeriesName.Trim();
        }

        if (season.SeriesId != Guid.Empty)
        {
            try
            {
                var series = _libraryManager.GetItemById(season.SeriesId);
                if (!string.IsNullOrWhiteSpace(series?.Name))
                {
                    return series.Name.Trim();
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(
                    ex,
                    "Minitiger Staffel Fix could not resolve series name for season {SeasonId}.",
                    season.Id);
            }
        }

        return "Unbekannte Serie";
    }

    private static object ToScanResponse(SeasonFixScan scan)
    {
        var correctCount = Math.Max(
            0,
            scan.ScannedSeasons
            - scan.Skipped.Count
            - scan.Candidates.Count);

        return new
        {
            scannedSeasons = scan.ScannedSeasons,
            correctCount,
            skippedWithoutIndex = scan.Skipped.Count,
            mismatchCount = scan.Candidates.Count,
            skipped = scan.Skipped
                .Select(item => new
                {
                    seasonId = item.SeasonId,
                    seriesName = item.SeriesName,
                    currentName = item.CurrentName,
                    reason = item.Reason
                })
                .ToArray(),
            changes = scan.Candidates
                .Select(candidate => new
                {
                    seasonId = candidate.Season.Id,
                    seriesName = candidate.SeriesName,
                    currentName = candidate.CurrentName,
                    expectedName = candidate.ExpectedName,
                    indexNumber = candidate.IndexNumber
                })
                .ToArray()
        };
    }

    private sealed record SeasonFixSkipped(
        Guid SeasonId,
        string SeriesName,
        string CurrentName,
        string Reason);

    private sealed record SeasonFixCandidate(
        Season Season,
        string SeriesName,
        string CurrentName,
        string ExpectedName,
        int IndexNumber);

    private sealed record SeasonFixScan(
        int ScannedSeasons,
        List<SeasonFixSkipped> Skipped,
        List<SeasonFixCandidate> Candidates);
}

// MINITIGER_PATCH_MARKER: PHASE_18_21_0_SEASON_FIX_API
// MINITIGER_PATCH_MARKER: PHASE_18_21_1_SEASON_FIX_SKIPPED_DETAILS_API
