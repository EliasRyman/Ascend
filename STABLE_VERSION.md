# Stable Fallback Version

This file marks a known stable state of the application.

**Commit:** `802ebdd70ea479166972e32d0f296186e62be0c5`
**Date:** 2024-12-16
**Tag:** `stable-dec16-colorfix`

## Features in this version

- Google Calendar 404 error handling (auto-recreates deleted calendars)
- Supabase notes 406 fix (using maybeSingle)
- Color sync TO Google Calendar (hex-to-colorId mapping)
- Color sync FROM Google Calendar (colorId-to-hex mapping)
- Default color: Grape (Vindruva) = colorId "3"
- Debug logging for:
  - Color mapping (📤 📥)
  - Task loading (📋 ✅ ❌)
  - Schedule block loading (📅)
  - Logout safety (🔒)

## How to restore to this version

```bash
git checkout 802ebdd70ea479166972e32d0f296186e62be0c5 -- .
git add -A
git commit -m "Restore to stable version"
npm run deploy
```

Or use the tag:
```bash
git checkout stable-dec16-colorfix -- .
git add -A
git commit -m "Restore to stable version"
npm run deploy
```
