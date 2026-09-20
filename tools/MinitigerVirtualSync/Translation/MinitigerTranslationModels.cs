using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.MinitigerVirtualSync.Translation;

public sealed class MinitigerTranslationBackgroundSettings
{
    public bool Enabled { get; set; }

    public string Mode { get; set; } = "scheduled";

    public int IntervalMinutes { get; set; } = 30;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gpt-5.6-luna";

    public int MinTitleWords { get; set; } = 3;

    public bool ProtectFranchise { get; set; } = true;

    public bool ScanTitles { get; set; } = true;

    public bool ScanOverviews { get; set; } = true;

    public bool ItemSeries { get; set; } = true;

    public bool ItemSeasons { get; set; } = true;

    public bool ItemEpisodes { get; set; } = true;

    public bool ItemMovies { get; set; } = true;

    public string[] LibraryIds { get; set; } = [];

    public int BatchSize { get; set; } = 5;

    public int MaxPerRun { get; set; } = 50;

    public bool CleanMetadata { get; set; } = true;

    [JsonIgnore]
    public bool HasApiKey => !string.IsNullOrWhiteSpace(ApiKey);

    [JsonIgnore]
    public bool IsContinuous111 =>
        string.Equals(
            Mode,
            "continuous111",
            StringComparison.OrdinalIgnoreCase);

    public MinitigerTranslationBackgroundSettings Normalize()
    {
        var model = (Model ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(model))
        {
            model = "gpt-5.6-luna";
        }

        if (model.Length > 100)
        {
            model = model[..100];
        }

        var mode =
            string.Equals(
                Mode,
                "continuous111",
                StringComparison.OrdinalIgnoreCase)
                ? "continuous111"
                : "scheduled";

        return new MinitigerTranslationBackgroundSettings
        {
            Enabled = Enabled,
            Mode = mode,
            IntervalMinutes = Math.Clamp(IntervalMinutes, 1, 1440),
            ApiKey = (ApiKey ?? string.Empty).Trim(),
            Model = model,
            MinTitleWords = Math.Clamp(MinTitleWords, 3, 12),
            ProtectFranchise = ProtectFranchise,
            ScanTitles = ScanTitles,
            ScanOverviews = ScanOverviews,
            ItemSeries = ItemSeries,
            ItemSeasons = ItemSeasons,
            ItemEpisodes = ItemEpisodes,
            ItemMovies = ItemMovies,
            LibraryIds = (LibraryIds ?? [])
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray(),
            BatchSize = Math.Clamp(BatchSize, 1, 10),
            MaxPerRun = Math.Clamp(MaxPerRun, 1, 1000),
            CleanMetadata = CleanMetadata
        };
    }
}

public sealed class MinitigerTranslationBackgroundStatus
{
    public bool WorkerOnline { get; set; }

    public DateTimeOffset? WorkerStartedUtc { get; set; }

    public DateTimeOffset? HeartbeatUtc { get; set; }

    public bool Enabled { get; set; }

    public bool Running { get; set; }

    public string State { get; set; } = "offline";

    public string Mode { get; set; } = "scheduled";

    public string Message { get; set; } = "Hintergrunddienst wartet.";

    public string CurrentItem { get; set; } = string.Empty;

    public string LastError { get; set; } = string.Empty;

    public DateTimeOffset? LastRunUtc { get; set; }

    public DateTimeOffset? NextRunUtc { get; set; }

    public DateTimeOffset? LastApiTestUtc { get; set; }

    public bool? LastApiTestOk { get; set; }

    public string LastApiTestMessage { get; set; } = string.Empty;

    public int ConfiguredLibraries { get; set; }

    public int ResolvedLibraries { get; set; }

    public int Checked { get; set; }

    public int Found { get; set; }

    public int Applied { get; set; }

    public int Errors { get; set; }

    public long InputTokens { get; set; }

    public long OutputTokens { get; set; }
}

public sealed class MinitigerTranslationLibraryInfo
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string CollectionType { get; set; } = string.Empty;
}

public sealed class MinitigerTranslationApiTestRequest
{
    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;
}

public sealed class MinitigerTranslationApiTestResult
{
    public bool Ok { get; set; }

    public int StatusCode { get; set; }

    public string Model { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}

internal sealed class MinitigerTranslationCandidate
{
    public required MediaBrowser.Controller.Entities.BaseItem Item { get; init; }

    public required string RawName { get; init; }

    public required string RawOverview { get; init; }

    public required string CleanName { get; init; }

    public required string CleanOverview { get; init; }

    public bool TranslateTitle { get; init; }

    public bool TranslateOverview { get; init; }
}

internal sealed class MinitigerTranslatedValue
{
    public string Id { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Overview { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;
}

// MINITIGER_PATCH_MARKER: PHASE_18_18_2_BACKGROUND_CONTROL_MODELS
