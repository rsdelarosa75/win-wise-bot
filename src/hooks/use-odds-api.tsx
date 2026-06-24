import { useState, useEffect, useCallback } from 'react';

interface OddsData {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
        point?: number; // For spread markets
      }>;
    }>;
  }>;
}

interface ProcessedGame {
  id: string;
  sport: string;
  team1: string;
  team2: string;
  odds1: string;
  odds2: string;
  draw?: string;
  spread1?: string;
  spread2?: string;
  commence_time: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'win' | 'neutral' | 'loss';
}

type OddsSport = "NBA" | "MLB" | "WNBA" | "NHL" | "NFL" | "NCAAFB" | "Soccer";

const SPORT_CONFIGS: Record<OddsSport, { key: string; markets: string }> = {
  NBA:    { key: 'basketball_nba',           markets: 'h2h,spreads' },
  MLB:    { key: 'baseball_mlb',             markets: 'h2h,spreads,totals' },
  WNBA:   { key: 'basketball_wnba',          markets: 'h2h,spreads' },
  NHL:    { key: 'icehockey_nhl',            markets: 'h2h,spreads' },
  NFL:    { key: 'americanfootball_nfl',     markets: 'h2h,spreads' },
  NCAAFB: { key: 'americanfootball_ncaaf',   markets: 'h2h,spreads' },
  Soccer: { key: 'soccer_fifa_world_cup',    markets: 'h2h,spreads' },
};

export const useOddsApi = (sport: OddsSport = "NBA") => {
  const [games, setGames] = useState<ProcessedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiKey] = useState<string>(
    import.meta.env.VITE_ODDS_API_KEY || ''
  );

  const processOddsData = useCallback((rawGames: OddsData[]): ProcessedGame[] => {
    return rawGames.slice(0, 10).map((game) => {
      let homeOdds = 'N/A';
      let awayOdds = 'N/A';
      let homeSpread = 'N/A';
      let awaySpread = 'N/A';
      
      // Extract moneyline and spread odds by scanning bookmakers until both teams are found
      let drawOdds: string | undefined;

      if (game.bookmakers?.length > 0) {
        // Moneyline: find a bookmaker that has both outcomes
        for (const bm of game.bookmakers) {
          const h2h = bm.markets?.find(m => m.key === 'h2h');
          if (h2h?.outcomes) {
            const h = h2h.outcomes.find(o => o.name === game.home_team);
            const a = h2h.outcomes.find(o => o.name === game.away_team);
            if (h && a) {
              homeOdds = h.price > 0 ? `+${h.price}` : `${h.price}`;
              awayOdds = a.price > 0 ? `+${a.price}` : `${a.price}`;
              const d = h2h.outcomes.find(o => o.name === 'Draw');
              if (d) drawOdds = d.price > 0 ? `+${d.price}` : `${d.price}`;
              break;
            }
          }
        }

        // Spreads: find first market that has points for both teams
        for (const bm of game.bookmakers) {
          const spreads = bm.markets?.find(m => m.key === 'spreads');
          if (spreads?.outcomes) {
            const h = spreads.outcomes.find(o => o.name === game.home_team);
            const a = spreads.outcomes.find(o => o.name === game.away_team);
            if (h?.point !== undefined && a?.point !== undefined) {
              homeSpread = h.point > 0 ? `+${h.point}` : `${h.point}`;
              awaySpread = a.point > 0 ? `+${a.point}` : `${a.point}`;
              break;
            }
          }
        }
      }

      // Simple confidence calculation based on odds difference
      const getConfidence = (odds1: string, odds2: string): 'High' | 'Medium' | 'Low' => {
        const num1 = Math.abs(parseInt(odds1.replace('+', '')) || 0);
        const num2 = Math.abs(parseInt(odds2.replace('+', '')) || 0);
        const diff = Math.abs(num1 - num2);
        
        if (diff > 200) return 'High';
        if (diff > 100) return 'Medium';
        return 'Low';
      };

      // Simple status based on odds favorability
      const getStatus = (odds1: string, odds2: string): 'win' | 'neutral' | 'loss' => {
        const num1 = parseInt(odds1.replace('+', '')) || 0;
        const num2 = parseInt(odds2.replace('+', '')) || 0;
        
        if (Math.min(num1, num2) < -150) return 'win';
        if (Math.max(num1, num2) > 200) return 'loss';
        return 'neutral';
      };

      const confidence = getConfidence(homeOdds, awayOdds);
      const status = getStatus(homeOdds, awayOdds);

      return {
        id: game.id,
        sport: game.sport_title,
        team1: game.away_team,
        team2: game.home_team,
        odds1: awayOdds,
        odds2: homeOdds,
        draw: drawOdds,
        spread1: awaySpread,
        spread2: homeSpread,
        commence_time: game.commence_time,
        confidence,
        status
      };
    });
  }, []);

  const fetchOdds = useCallback(async () => {
    if (!apiKey) {
      console.log('[OddsAPI] No API key — check VITE_ODDS_API_KEY in .env');
      setError('API key not configured');
      return;
    }

    const { key: sportKey, markets } = SPORT_CONFIGS[sport];
    console.log(`[OddsAPI] Fetching ${sport} (${sportKey})`);
    setLoading(true);
    setError(null);

    try {
      const allGames: OddsData[] = [];

      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?` +
          new URLSearchParams({
            apiKey: apiKey,
            regions: 'us',
            markets,
            oddsFormat: 'american',
            dateFormat: 'iso',
          })
        );

        console.log(`[OddsAPI] ${sport} response status:`, response.status);

        if (response.ok) {
          const data = await response.json();
          console.log(`[OddsAPI] ${sport} games returned:`, Array.isArray(data) ? data.length : data);
          if (Array.isArray(data)) allGames.push(...data);
        } else if (response.status === 401) {
          throw new Error('Invalid API key');
        } else if (response.status === 429) {
          throw new Error('API rate limit exceeded');
        }
      } catch (err) {
        console.warn(`[OddsAPI] Failed to fetch ${sport}:`, err);
      }

      const now = new Date();
      console.log('[OddsAPI] Total games fetched:', allGames.length, '| Now:', now.toISOString());
      console.log('[OddsAPI] Game start times:', allGames.map(g => g.commence_time));

      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const upcoming = allGames
        .filter(g => new Date(g.commence_time) > threeHoursAgo)
        .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

      console.log('[OddsAPI] Upcoming games after filter:', upcoming.length);

      setLastUpdated(new Date());

      if (upcoming.length === 0) {
        setError('No upcoming games found');
        setGames([]);
      } else {
        const processedGames = processOddsData(upcoming.slice(0, 10));
        setGames(processedGames);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch odds data';
      setError(errorMessage);
      setGames([]);
      console.error('Odds API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiKey, sport, processOddsData]);

  // Fetch on load and whenever sport changes, then auto-refresh every 5 minutes
  useEffect(() => {
    if (!apiKey) return;
    fetchOdds();
    const interval = setInterval(fetchOdds, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey, fetchOdds]);

  return {
    games,
    loading,
    error,
    lastUpdated,
    fetchOdds,
    hasApiKey: !!apiKey
  };
};