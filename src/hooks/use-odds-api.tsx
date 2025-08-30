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
  commence_time: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'win' | 'neutral' | 'loss';
}

const SPORT_KEYS = {
  MLB: 'baseball_mlb',
  NFL: 'americanfootball_nfl', 
  'College Football': 'americanfootball_ncaaf'
};

export const useOddsApi = () => {
  const [games, setGames] = useState<ProcessedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('odds_api_key') || '';
  });

  const saveApiKey = useCallback((key: string) => {
    localStorage.setItem('odds_api_key', key);
    setApiKey(key);
  }, []);

  const removeApiKey = useCallback(() => {
    localStorage.removeItem('odds_api_key');
    setApiKey('');
  }, []);

  const processOddsData = useCallback((rawGames: OddsData[]): ProcessedGame[] => {
    return rawGames.slice(0, 6).map((game) => {
      let homeOdds = 'N/A';
      let awayOdds = 'N/A';
      
      // Extract moneyline odds from first available bookmaker
      if (game.bookmakers?.length > 0) {
        const bookmaker = game.bookmakers[0];
        const h2hMarket = bookmaker.markets?.find(m => m.key === 'h2h');
        
        if (h2hMarket?.outcomes) {
          const homeOutcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
          const awayOutcome = h2hMarket.outcomes.find(o => o.name === game.away_team);
          
          if (homeOutcome) {
            homeOdds = homeOutcome.price > 0 ? `+${homeOutcome.price}` : `${homeOutcome.price}`;
          }
          if (awayOutcome) {
            awayOdds = awayOutcome.price > 0 ? `+${awayOutcome.price}` : `${awayOutcome.price}`;
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
        commence_time: game.commence_time,
        confidence,
        status
      };
    });
  }, []);

  const fetchOdds = useCallback(async () => {
    if (!apiKey) {
      setError('API key not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allGames: OddsData[] = [];
      
      // Fetch odds for each sport
      for (const [sportName, sportKey] of Object.entries(SPORT_KEYS)) {
        try {
          const response = await fetch(
            `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?` +
            new URLSearchParams({
              apiKey: apiKey,
              regions: 'us',
              markets: 'h2h',
              oddsFormat: 'american',
              dateFormat: 'iso'
            })
          );

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              allGames.push(...data.slice(0, 2)); // Limit per sport
            }
          } else if (response.status === 401) {
            throw new Error('Invalid API key');
          } else if (response.status === 429) {
            throw new Error('API rate limit exceeded');
          }
        } catch (err) {
          console.warn(`Failed to fetch ${sportName}:`, err);
        }
      }

      if (allGames.length === 0) {
        setError('No games found for the selected sports');
        // Fallback to demo data if no real data available
        setGames([
          { id: 'demo1', sport: 'MLB', team1: 'Yankees', team2: 'Red Sox', odds1: '+120', odds2: '-140', commence_time: new Date().toISOString(), confidence: 'High', status: 'win' },
          { id: 'demo2', sport: 'NFL', team1: 'Chiefs', team2: 'Bills', odds1: '-110', odds2: '+95', commence_time: new Date().toISOString(), confidence: 'Medium', status: 'neutral' },
          { id: 'demo3', sport: 'College Football', team1: 'Alabama', team2: 'Georgia', odds1: '+180', odds2: '-220', commence_time: new Date().toISOString(), confidence: 'Low', status: 'loss' }
        ]);
      } else {
        const processedGames = processOddsData(allGames);
        setGames(processedGames);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch odds data';
      setError(errorMessage);
      console.error('Odds API Error:', err);
      
      // Fallback to demo data on error
      setGames([
        { id: 'demo1', sport: 'MLB', team1: 'Yankees', team2: 'Red Sox', odds1: '+120', odds2: '-140', commence_time: new Date().toISOString(), confidence: 'High', status: 'win' },
        { id: 'demo2', sport: 'NFL', team1: 'Chiefs', team2: 'Bills', odds1: '-110', odds2: '+95', commence_time: new Date().toISOString(), confidence: 'Medium', status: 'neutral' },
        { id: 'demo3', sport: 'College Football', team1: 'Alabama', team2: 'Georgia', odds1: '+180', odds2: '-220', commence_time: new Date().toISOString(), confidence: 'Low', status: 'loss' }
      ]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, processOddsData]);

  // Auto-refresh every 2 minutes when API key is available
  useEffect(() => {
    if (apiKey) {
      fetchOdds();
      const interval = setInterval(fetchOdds, 2 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [apiKey, fetchOdds]);

  return {
    games,
    loading,
    error,
    apiKey,
    saveApiKey,
    removeApiKey,
    fetchOdds,
    hasApiKey: !!apiKey
  };
};