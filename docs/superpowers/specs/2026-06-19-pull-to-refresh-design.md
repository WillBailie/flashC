# Pull-to-Refresh Design

## Summary

Add `RefreshControl` to all scrollable list screens: Home, DeckList, DeckDetail, TemplateList, Stats.

## Pattern

Each screen gets:
- `const [refreshing, setRefreshing] = useState(false)`
- `onRefresh` callback: set refreshing → await load function → clear refreshing
- `<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />` on the ScrollView/FlatList

## Screens

| Screen | Component | Refreshes | Notes |
|--------|-----------|-----------|-------|
| HomeScreen | `ScrollView` | `loadStats()` + settings/daily words | Mirrors `useFocusEffect` data |
| DeckListScreen | `FlatList` | `loadDecks()` | — |
| DeckDetailScreen | `FlatList` | `loadCards()` | Remove `bounces={false}` (blocks iOS pull-to-refresh) |
| TemplateListScreen | `FlatList` | `loadTemplates()` | — |
| StatsScreen | `ScrollView` | `getGlobalStats()` | `refreshing` separate from `null`-based skeleton state |

## Platform

- iOS: `tintColor={colors.primary}`
- Android: `colors={[colors.primary]}`
- Both props provided for cross-platform

## No new dependencies

Uses React Native's built-in `RefreshControl`.
