# Changelog

## v1.0.5 — 2026-07-14

### Added
- **Edit Episode now edits times too**: the pencil (Edit Episode) dialog gains a Start time field next to Start date, and — for closed episodes — End date and End time fields. End time before the episode start is rejected ("End time cannot be before episode start"). Previously only the start date was editable (saved at midnight).

## v1.0.4 — 2026-07-14

### Added
- **Closed time shown on episodes**: a closed episode's detail header now shows `Closed [date, time]` after the Started date, and closed cards in the Episodes list show the date range (`12 Jul – 14 Jul`).

### Changed
- **Episode actions moved to the top**: Log Medicine / Close Episode / Re-open Episode / Delete Episode buttons now sit directly under the episode header, above the log list — no more scrolling past every log to reach them.
- **Close Episode defaults to last log time**: the End date/time in the Close Episode dialog now pre-fills with the most recent medicine/temperature log's date and time (falls back to now if the episode has no logs or the last log is before the episode start). Still editable before confirming.

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
