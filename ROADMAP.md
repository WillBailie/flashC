# Feature Roadmap

Status legend: `todo` `in-progress` `done` `wontfix`

---

## High Impact, Low Effort

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Export deck as CSV/JSON | done | CSV header row + JSON array, share sheet via expo-sharing |
| 2 | Global card search | todo | SQL LIKE across all decks |
| 3 | Pull-to-refresh | done | RefreshControl on deck/card lists, home, templates, stats |
| 4 | Session complete celebration | done | Confetti burst + animated trophy/stats |
| 5 | Card detail: show review schedule | done | ease_factor, interval, next_review_date on edit screen |

## Medium Impact, Medium Effort

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 6 | Reverse practice mode | done | Practice back→front, toggle at practice initiation, persisted |
| 7 | Bulk select & move cards | todo | Long-press selection mode, move/delete |
| 8 | Custom SM-2 parameters per deck | todo | Per-deck ease/interval overrides |
| 9 | Tags | todo | #verb, #irregular; filter by tag |
| 10 | Onboarding walkthrough | todo | 3-step overlay for new users |

## High Impact, Higher Effort

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 11 | Rich text / Markdown in fields | todo | Bold, italic, code blocks |
| 12 | Audio attachments | todo | expo-av for record/playback |
| 13 | Daily review notification | done | expo-notifications, configurable time, tap-to-practice |
| 14 | Detailed statistics screen | todo | Retention curve, charts via react-native-svg |
| 15 | Cram mode | todo | All cards in deck, in-session short-term SR |

---

## Completed

| # | Feature | Notes |
|---|---------|-------|
| 3 | Pull-to-refresh | RefreshControl on HomeScreen, DeckListScreen, DeckDetailScreen, TemplateListScreen, StatsScreen |
| 13 | Daily review notification | expo-notifications, configurable time via settings, tap opens daily practice |

---

## Quick Wins (suggested first)

1. **Export + pull-to-refresh** — sub-hour each, high polish
2. **Session complete screen** — big UX payoff for minimal code
3. **Card detail scheduling info** — surface hidden SM-2 data
