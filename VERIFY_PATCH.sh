#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/minitiger-web"

MODEL='src/apps/modern/routes/minitiger/home/config/homeSettings.ts'
PANEL='src/apps/modern/routes/minitiger/home/components/MinitigerSettingsPanel.tsx'
HERO='src/apps/modern/routes/minitiger/home/components/MinitigerHero.tsx'
HOME='src/apps/modern/routes/minitiger/home/MinitigerHome.tsx'
CSS='src/apps/modern/routes/minitiger/home/MinitigerHome.scss'
DETAIL_CSS='src/apps/modern/routes/minitiger/details/MinitigerVideoDetails.scss'
DETAILS='src/apps/modern/routes/minitiger/details/MinitigerVideoDetails.tsx'
TOOLBAR='src/apps/modern/components/AppToolbar/index.tsx'
VANILLA='src/apps/modern/routes/minitiger/home/components/MinitigerVanillaHomeSections.tsx'
BUILDER='src/apps/modern/routes/minitiger/home/components/MinitigerHomeBuilderSettings.tsx'

ok() { printf '[OK] %s\n' "$1"; }
fail() { printf '[FAIL] %s\n' "$1" >&2; exit 1; }

for f in "$MODEL" "$PANEL" "$HERO" "$HOME" "$CSS" "$DETAIL_CSS" "$DETAILS" "$TOOLBAR" "$VANILLA" "$BUILDER" .gitignore; do
    [[ -f "$f" ]] || fail "Missing $f"
done

# Optional custom home + independent hero.
grep -q 'customHomeRowsEnabled' "$MODEL" || fail 'custom home switch missing'
grep -q 'MinitigerVanillaHomeSections' "$VANILLA" || fail 'vanilla home fallback missing'
grep -q 'showNavigation' "$HERO" || fail 'banner navigation toggle missing'
grep -q 'showFsk' "$HERO" || fail 'banner FSK toggle missing'
ok 'optional custom home / independent banner'

# Banner controls and extra rotation times.
for token in bannerHeightOffset bannerOverlayOffset bannerFadeSize bannerFadeStrength; do
    grep -q "$token" "$MODEL" || fail "missing $token"
done
grep -q '45 Sekunden' "$PANEL" || fail '45 second rotation missing'
grep -q '60 Sekunden' "$PANEL" || fail '60 second rotation missing'
grep -q 'minitigerHeroMediaLayer' "$HERO" || fail 'composited transparent hero media layer missing'
ok 'banner size/position/fade/navigation controls'

# Main library gaps, including confirmed negative main -> virtual range.
grep -q 'libraryCardGap' "$MODEL" || fail 'main library card gap missing'
grep -q 'libraryVirtualGap' "$MODEL" || fail 'main -> virtual gap missing'
grep -A7 'libraryVirtualGap: clampNumber' "$MODEL" | grep -q -- '-120' || fail 'main -> virtual minimum is not -120'
grep -B4 -A9 'value={settings.libraryVirtualGap}' "$PANEL" | grep -q "min='-120'" || fail 'main -> virtual UI minimum is not -120'
grep -q 'margin-top: var(--mt-library-virtual-gap, 64px)' "$CSS" || fail 'main -> virtual CSS wiring missing'
ok 'library gaps'

# Glow preview is live and Glow size no longer controls layout spacing.
grep -q 'previewGlowStrength={settings.glowStrength}' "$PANEL" || fail 'live Glow strength preview missing'
grep -q 'previewGlowSize={settings.glowSize}' "$PANEL" || fail 'live Glow size preview missing'
grep -q -- '--mt-glow-layout-reserve: 72px' "$CSS" || fail 'fixed Glow layout reserve missing'
TAIL="$(tail -n 150 "$CSS")"
if printf '%s' "$TAIL" | grep -q -- 'mt-glow-size'; then
    fail 'final Glow layout guards still depend on Glow size'
fi
ok 'Glow preview and layout spacing are decoupled'

# Cast retry experiment must be completely gone.
for token in IMAGE_REFRESH_STORAGE_KEY imageRefreshToken setImageRefreshToken MinitigerPersonImage minitiger:refresh-images refreshMinitigerImages imageRefreshMessage; do
    if grep -q "$token" "$DETAILS" "$PANEL"; then
        fail "stale cast image-refresh experiment remains: $token"
    fi
done
ok 'cast image-refresh experiment removed'

# Public release cleanup/version.
grep -q '🐯 Minitiger Native · Phase 18.7.0' "$HOME" || fail 'footer is not Phase 18.7.0'
if grep -q 'PHASE 18\.6\.[0-9].*TEST' "$CSS" "$DETAIL_CSS"; then
    fail 'old 18.6 TEST source comment remains'
fi
grep -Fxq 'Minitiger_Gedaechtnis/' .gitignore || fail 'Minitiger_Gedaechtnis is not ignored'
grep -Fxq '.phase18_*_test_backup/' .gitignore || fail 'test backup directories are not ignored'
for f in APPLY_TEST_PATCH.py ROLLBACK_TEST_PATCH.py CHANGELOG_Minitiger_Web_TEST.txt; do
    [[ ! -e "$f" ]] || fail "test helper still exists: $f"
done
ok 'public release cleanup'

git diff --check || fail 'git diff --check reported whitespace errors'
ok 'git diff --check'

printf '\n[18.7.0 PUBLIC] Verification passed.\n'
printf 'UI behavior was already user-confirmed through Phase 18.6.9 TEST.\n'
printf 'Next: untrack Minitiger_Gedaechtnis, stage the listed public files, commit, then push.\n'
