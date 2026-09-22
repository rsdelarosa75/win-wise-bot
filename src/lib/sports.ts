// Single source of truth for sport ordering across the app: the Dashboard Live
// Odds pills, the matchup-input sport selector, and their default selections all
// derive from SPORT_ORDER so they stay consistent. These seven have a Live Odds
// feed; F1 has no odds feed and is offered only in the manual matchup selector
// (appended there), so it is intentionally absent here.
export const SPORT_ORDER = ["NFL", "NCAAFB", "MLB", "NBA", "NHL", "WNBA", "Soccer"] as const;

export type OrderedSport = (typeof SPORT_ORDER)[number];

// Default selection everywhere the order is used.
export const DEFAULT_SPORT: OrderedSport = SPORT_ORDER[0]; // "NFL"
