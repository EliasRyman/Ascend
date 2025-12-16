# Stable Fallback Version

This file marks a known stable state of the application.

**Commit:** `196243b10f650f07d20975d6ae4c361007ea3f39`
**Date:** 2024-12-16
**Tag:** `fallback-google-color-sync`

## Features in this version

- Google Calendar 404 error handling (auto-recreates deleted calendars)
- Supabase notes 406 fix (using maybeSingle)
- Color sync to Google Calendar with hex-to-colorId mapping
- Default color: Grape (Vindruva) = colorId "3"
- Debug logging for color mapping

## How to restore to this version

```bash
git checkout 196243b10f650f07d20975d6ae4c361007ea3f39 -- .
git add -A
git commit -m "Restore to stable version"
npm run deploy
```

Or use the tag:
```bash
git checkout fallback-google-color-sync -- .
git add -A
git commit -m "Restore to stable version"
npm run deploy
```
