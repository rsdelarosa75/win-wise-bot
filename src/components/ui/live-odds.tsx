import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOddsApi } from '@/hooks/use-odds-api';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

export const LiveOdds = () => {
  const { games, loading, error, fetchOdds, hasApiKey } = useOddsApi();

  if (!hasApiKey) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center p-8 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
            <div>
              <div className="font-medium">API Key Required</div>
              <div className="text-sm text-muted-foreground">
                Configure your Odds API key below to see live odds
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && games.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="h-6 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-loss/10 border border-loss/20 rounded-lg">
          <div className="flex items-center gap-2 text-loss">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error: {error}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchOdds}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < 0) {
      return 'Live';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          )}
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
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {games.map((game) => (
        <div key={game.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="font-medium">{game.team1}</span> vs <span className="font-medium">{game.team2}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground">{game.odds1}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{game.odds2}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTime(game.commence_time)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs
                ${game.status === 'win' ? 'border-win/30 text-win' : ''}
                ${game.status === 'neutral' ? 'border-neutral/30 text-neutral' : ''}
                ${game.status === 'loss' ? 'border-loss/30 text-loss' : ''}
              `}
            >
              {game.confidence}
            </Badge>
            <Badge variant="outline" className="text-xs border-muted-foreground/30">
              {game.sport === 'MLB' ? 'MLB' : 
               game.sport === 'NFL' ? 'NFL' : 
               game.sport.includes('NCAAF') || game.sport.includes('College') ? 'CFB' : 
               game.sport}
            </Badge>
          </div>
        </div>
      ))}
      
      {games.length === 0 && !loading && !error && (
        <div className="flex items-center justify-center p-8 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-center space-y-2">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto" />
            <div className="text-sm text-muted-foreground">
              No games available right now
            </div>
          </div>
        </div>
      )}
    </div>
  );
};