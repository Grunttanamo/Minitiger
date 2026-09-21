using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Api;

[ApiController]
[Route("Minitiger/SeasonFix")]
[Authorize(Policy = Policies.RequiresElevation)]
public sealed class MinitigerSeasonRemovalController : ControllerBase
{
    private readonly ILibraryManager _libraryManager;

    public MinitigerSeasonRemovalController(
        ILibraryManager libraryManager)
    {
        _libraryManager = libraryManager;
    }

    [HttpDelete("Season/{seasonId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public ActionResult RemoveSeasonFromJellyfin(Guid seasonId)
    {
        var season = _libraryManager.GetItemById<Season>(seasonId);

        if (season is null)
        {
            return NotFound(new
            {
                message = "Staffel wurde in Jellyfin nicht gefunden."
            });
        }

        /*
         * This command exists specifically for stale/virtual season records.
         * Never allow it to become a shortcut for deleting a real season
         * directory. Physical files must remain completely untouched.
         */
        if (
            !string.IsNullOrWhiteSpace(season.Path)
            && Directory.Exists(season.Path))
        {
            return Conflict(new
            {
                message =
                    "Diese Staffel besitzt einen realen Ordner und wurde aus Sicherheitsgründen nicht entfernt.",
                path = season.Path
            });
        }

        var removedName = season.Name ?? "Staffel";
        var removedSeriesId = season.SeriesId;
        var wasVirtual = season.IsVirtualItem;

        _libraryManager.DeleteItem(
            season,
            new DeleteOptions
            {
                DeleteFileLocation = false
            },
            true);

        return Ok(new
        {
            removed = true,
            seasonId,
            seriesId = removedSeriesId,
            name = removedName,
            wasVirtual,
            filesDeleted = false
        });
    }
}

// MINITIGER_PATCH_MARKER: PHASE_18_21_2_SAFE_SEASON_REMOVAL_API
