using Jellyfin.Plugin.MinitigerVirtualSync.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.MinitigerVirtualSync;

public sealed class Plugin : BasePlugin<PluginConfiguration>
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "Minitiger Virtual Sync";

    public override Guid Id => Guid.Parse("e4e52bec-56f8-4c38-88e4-4b862a3cb93b");

    public static Plugin? Instance { get; private set; }
}
