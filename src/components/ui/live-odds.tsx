import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOddsApi } from '@/hooks/use-odds-api';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

export const LiveOdds = () => {
  const { games, loading, error, fetchOdds, hasApiKey } = useOddsApi();

  const mockGames = [
    {
      id: 'mock1',
      team1: 'Lakers',
      team2: 'Celtics',
      odds1: '+110',
      odds2: '-130',
      confidence: 'Medium',
      status: 'neutral',
      sport: 'NBA',
      commence_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock2',
      team1: 'Warriors',
      team2: 'Bucks',
      odds1: '-120',
      odds2: '+100',
      confidence: 'High',
      status: 'win',
      sport: 'NBA',
      commence_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'mock3',
      team1: 'Heat',
      team2: 'Nets',
      odds1: '-150',
      odds2: '+130',
      confidence: 'High',
      status: 'win',
      sport: 'NBA',
      commence_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) return 'Live';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h`;
    return date.toLocaleDateString();
  };

  const sportLabel = (sport: string) => {
    if (sport === 'MLB') return 'MLB';
    if (sport === 'NFL') return 'NFL';
    if (sport.includes('NCAAF') || sport.includes('College')) return 'CFB';
    return sport;
  };

  const GameCard = ({ game }: { game: typeof mockGames[0] & { spread1?: string; spread2?: string } }) => (
    <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors space-y-2 overflow-hidden max-w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium truncate">
          <span className="font-semibold">{game.team1}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-semibold">{game.team2}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          {formatTime(game.commence_time)}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          <span>{game.odds1}</span>
          <span>/</span>
          <span>{game.odds2}</span>
          <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">ML</span>
          {'spread1' in game && game.spread1 && game.spread1 !== 'N/A' && 'spread2' in game && game.spread2 && game.spread2 !== 'N/A' && (
            <>
              <span className="ml-1">{game.spread1}/{game.spread2}</span>
              <span className="text-[10px] bg-accent/20 text-accent px-1 rounded">SPR</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0
              ${game.status === 'win' ? 'border-win/30 text-win' : ''}
              ${game.status === 'neutral' ? 'border-neutral/30 text-neutral' : ''}
              ${game.status === 'loss' ? 'border-loss/30 text-loss' : ''}
            `}
          >
            {game.confidence}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/30">
            {sportLabel(game.sport)}
          </Badge>
        </div>
      </div>
    </div>
  );

  if (!hasApiKey) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center p-6 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
            <div className="text-sm font-medium">Live Odds Unavailable</div>
            <div className="text-xs text-muted-foreground">Set VITE_ODDS_API_KEY to enable</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground py-1">Demo data</div>
          {mockGames.map((game) => <GameCard key={game.id} game={game} />)}
        </div>
      </div>
    );
  }

  if (loading && games.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border/50 animate-pulse space-y-2">
            <div className="h-3 w-3/4 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/20 rounded-lg text-loss">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">
            {error.includes('quota') ? 'API quota exceeded — showing demo data' : `Error: ${error}`}
          </span>
        </div>
        {mockGames.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
          {error && (
            <div className="text-xs text-loss flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchOdds}
          disabled={loading}
          className="text-xs h-7"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {games.map((game) => <GameCard key={game.id} game={game} />)}

      {games.length === 0 && !loading && !error && (
        <div className="flex items-center justify-center p-6 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-center space-y-1">
            <Clock className="w-5 h-5 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">No games available right now</div>
          </div>
        </div>
      )}
    </div>
  );
};
