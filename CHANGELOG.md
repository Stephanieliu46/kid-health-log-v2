# Changelog

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
