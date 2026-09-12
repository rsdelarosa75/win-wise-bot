const GAMMA_API = import.meta.env.VITE_POLYMARKET_GAMMA_API ?? 'https://gamma-api.polymarket.com';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  groupItemTitle: string;
  outcomePrices: string;   // JSON string: ["yes_price", "no_price"] as 0–1 decimals
  volume: string;
  volume24hr: number;
  liquidity: string;
  active: boolean;
  closed: boolean;
}

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  endDate: string;
  volume: number;
  volume24hr: number;
  liquidity: number;
  openInterest: number;
  negRisk: boolean;
  markets: PolymarketMarket[];
}

// Signal 1 — one entry per outcome that has a computable divergence
export interface PolymarketProbDivergence {
  outcome: string;          // "Spain" | "Argentina" | "Draw"
  polymarketPct: number;    // Polymarket implied win %, e.g. 42.4
  sbPct: number;            // Sportsbook implied win %, e.g. 38.0
  gap: number;              // polymarketPct − sbPct (positive = poly rates it higher)
  direction: 'poly_higher' | 'sb_higher';
}

// Signal 2 — volume concentration across all three outcomes
export interface PolymarketVolumeSkew {
  skewedOutcome: string;    // outcome absorbing the majority of volume
  skewPct: number;          // % of total event volume on that outcome, e.g. 69.9
  teamVolume: number;       // USD on the skewed outcome
  totalVolume: number;      // USD across all three outcomes
  isSignificant: boolean;   // true when skewPct >= 70
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function yesPrice(market: PolymarketMarket): number {
  try {
    const prices = JSON.parse(market.outcomePrices) as [string, string];
    return parseFloat(prices[0]);
  } catch {
    return 0;
  }
}

function isDrawMarket(market: PolymarketMarket): boolean {
  return /draw|tie/i.test(market.groupItemTitle);
}

function marketMatchesTeam(market: PolymarketMarket, team: string): boolean {
  if (isDrawMarket(market)) return false;
  const title = market.groupItemTitle.toLowerCase();
  const t = team.toLowerCase();
  const words = t.split(/\s+/).filter(w => w.length > 3);
  return title.includes(t) || words.some(w => title.includes(w));
}

// ── Exported functions ───────────────────────────────────────────────────────

/**
 * Constructs the Polymarket event slug for a FIFA World Cup match.
 * team1Code and team2Code are the 3-letter FIFA codes, e.g. "esp", "arg".
 * date is ISO date string "yyyy-mm-dd".
 */
export function buildMatchSlug(team1Code: string, team2Code: string, date: string): string {
  return `fifwc-${team1Code.toLowerCase()}-${team2Code.toLowerCase()}-${date}`;
}

/**
 * Fetches live Polymarket event data for a given slug.
 * Returns null if the event doesn't exist or the fetch fails.
 */
export async function fetchPolymarketMatch(slug: string): Promise<PolymarketEvent | null> {
  try {
    const res = await fetch(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as PolymarketEvent[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Signal 1 — Probability Divergence.
 * Compares Polymarket implied win % to sportsbook implied win % for each outcome.
 * Only returns entries where a sportsbook probability is available.
 *
 * sbImplied values are 0–100 (e.g. 38.0 for 38%).
 * Use americanToImplied() from n8n-integration or convert before calling.
 */
export function computeProbDivergence(
  event: PolymarketEvent,
  sbImplied: { home: number; away: number; draw?: number },
  homeTeam: string,
  awayTeam: string,
): PolymarketProbDivergence[] {
  const results: PolymarketProbDivergence[] = [];

  for (const market of event.markets) {
    if (!market.active || market.closed) continue;

    const polyPct = Math.round(yesPrice(market) * 1000) / 10;
    let sbPct: number | undefined;

    if (isDrawMarket(market)) {
      sbPct = sbImplied.draw;
    } else if (marketMatchesTeam(market, homeTeam)) {
      sbPct = sbImplied.home;
    } else if (marketMatchesTeam(market, awayTeam)) {
      sbPct = sbImplied.away;
    }

    if (sbPct === undefined) continue;

    const gap = Math.round((polyPct - sbPct) * 10) / 10;
    results.push({
      outcome: market.groupItemTitle,
      polymarketPct: polyPct,
      sbPct: Math.round(sbPct * 10) / 10,
      gap,
      direction: gap >= 0 ? 'poly_higher' : 'sb_higher',
    });
  }

  return results;
}

/**
 * Fetches all currently open FIFA World Cup events from Polymarket.
 * Use this to do a single batch fetch, then match with matchEventToTeams().
 */
export async function fetchAllOpenWorldCupEvents(): Promise<PolymarketEvent[]> {
  try {
    const res = await fetch(`${GAMMA_API}/events?tag_id=102232&closed=false&limit=50`);
    if (!res.ok) return [];
    return (await res.json()) as PolymarketEvent[];
  } catch {
    return [];
  }
}

/**
 * Finds the Polymarket event for a given team pair from a pre-fetched event list.
 * Matches on event title and market groupItemTitles using fuzzy team name matching.
 */
export function matchEventToTeams(
  events: PolymarketEvent[],
  team1: string,
  team2: string,
): PolymarketEvent | null {
  const norm = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const t1 = norm(team1);
  const t2 = norm(team2);

  // Pass 1: event title contains both team names (match-specific events like "Spain vs. Argentina")
  for (const event of events) {
    if (event.closed) continue;
    const title = norm(event.title);
    if (title.includes(t1) && title.includes(t2)) return event;
  }

  // Pass 2: fall back to market groupItemTitle matching — avoids matching tournament futures
  // (e.g. "World Cup Winner" has "Spain" and "Argentina" as market titles but is not the match)
  for (const event of events) {
    if (event.closed) continue;
    const nonDraw = event.markets.filter(m => !/draw|tie/i.test(m.groupItemTitle));
    const mTitles = nonDraw.map(m => norm(m.groupItemTitle));
    const hasT1 = mTitles.some(mt => mt.includes(t1) || t1.includes(mt));
    const hasT2 = mTitles.some(mt => mt.includes(t2) || t2.includes(mt));
    if (hasT1 && hasT2) return event;
  }
  return null;
}

/**
 * Signal 2 — Volume Skew.
 * Detects when 70%+ of total match volume is concentrated on one outcome,
 * indicating sharp-money consensus.
 *
 * This is architecturally separate from Probability Divergence and must
 * never be merged with it into a combined signal object.
 */
export function computeVolumeSkew(event: PolymarketEvent): PolymarketVolumeSkew | null {
  const SKEW_THRESHOLD = 0.70;

  const marketVolumes = event.markets
    .filter(m => m.active && !m.closed)
    .map(m => ({
      outcome: m.groupItemTitle,
      volume: parseFloat(m.volume) || 0,
    }));

  const totalVolume = marketVolumes.reduce((sum, m) => sum + m.volume, 0);
  if (totalVolume === 0) return null;

  const top = marketVolumes.reduce((best, cur) => (cur.volume > best.volume ? cur : best));
  const skewPct = Math.round((top.volume / totalVolume) * 1000) / 10;

  return {
    skewedOutcome: top.outcome,
    skewPct,
    teamVolume: Math.round(top.volume),
    totalVolume: Math.round(totalVolume),
    isSignificant: top.volume / totalVolume >= SKEW_THRESHOLD,
  };
}
