# Changelog

## v1.0.3 — 2026-07-11

### Fixed
- **Backup export no longer creates a stray text file**: the share-sheet `title` was being saved by iOS "Save to Files" as a separate .txt containing just the app name. Removed the title so only `kidhealth-backup.json` is written.

## v1.0.2 — 2026-07-11

### Changed
- **Backup export uses a fixed filename** (`kidhealth-backup.json`, previously dated like `kidhealth-backup-2026-07-11.json`): saving to the same iCloud folder now replaces the previous backup instead of accumulating copies. The export time remains visible via the file's modified date in the Files app, the `exportedAt` field inside the file, and a new "Last export: [date, time]" line under the Export button in Settings → Data Backup.

## v1.0.1 — 2026-07-11

UAT doc: v2.3 · PRD doc: v1.3

### Fixed
- **Quick Log stale timestamp**: the date/time fields were captured once at page mount and never refreshed, so two logs made an hour apart could save with identical times. The fields now tick with the current time (refresh every ~30 s and on returning to the foreground), pause when manually edited (back-dating stays safe), and reset after each save.

### Added
- **Always open on Quick Log**: cold launches land on Quick Log regardless of the entry URL (e.g. a home-screen bookmark saved on /settings). Returning from >5 min in the background also jumps back to Quick Log; shorter app switches stay on the current page.
- **Daily-limit context on drug cards**: when "X/X doses in 24h — limit reached" shows, the card now also shows `Last Dose: [time] (Xh Ym ago)` and `Next dose in Xh Ym ([time])`. The unlock time is when the oldest dose ages out of the rolling 24 h window, or the 4 h/6 h minimum interval if that is later.

### Changed
- **Settings layout**: after Pro activation the "Permanent Pro activated" card moves from the top of Settings to just above About (after Feedback). The free-tier Upgrade card stays at the top.

## v1.0.0

Initial release: Quick Log, Episodes, Dashboard, Settings, NHS medication safety locks, temperature units, Pro paywall (mock IAP), data export/import.
