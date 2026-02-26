import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, RefreshCw, Bookmark, Check } from 'lucide-react';
import { testAddAnalysis } from '@/utils/webhook-handler';
import { usePicks } from '@/hooks/use-picks';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { VipGate } from '@/components/ui/vip-gate';

// ── Types ─────────────────────────────────────────────────────
interface TelegramAnalysis {
  id: string;
  timestamp: string;
  command: string;
  teams: string;
  persona: string;
  analysis: string;
  confidence: 'High' | 'Medium' | 'Low';
  status: 'win' | 'neutral' | 'loss';
  odds?: string;
  sport?: string;
  recommendation?: string;
  bet_type?: string;
  confidence_percentage?: number;
  units?: number;
  key_factors?: string[];
}

interface TelegramAnalysesProps {
  onUpgradeClick: () => void;
}

// ── Helpers ────────────────────────────────────────────────────
const extractField = (text: string, ...keys: string[]): string | null => {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*[:\\-]\\s*([^\\n]+)`, 'i');
    const m = text.match(re);
    if (m) return m[1].replace(/\*\*/g, '').trim();
  }
  return null;
};

const WIN_PROB: Record<string, string> = {
  High: '75–85%',
  Medium: '60–70%',
  Low: '50–55%',
};

const UNITS: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

interface Metrics {
  recommendation: string | null;
  betType: string | null;
  winProbability: string;
  units: number;
  odds: string | null;
  reasoning: string;
}

const extractMetrics = (analysis: TelegramAnalysis): Metrics => {
  let parsed: Record<string, unknown> | null = null;
  try {
    const raw = typeof analysis.analysis === 'string'
      ? JSON.parse(analysis.analysis)
      : analysis.analysis;
    parsed = Array.isArray(raw) ? raw[0] : raw;
  } catch { /* plain text */ }

  const reasoning =
    (parsed?.analysis ?? parsed?.output ?? parsed?.text ??
     (typeof analysis.analysis === 'string' ? analysis.analysis : '')) as string;

  const recommendation =
    (parsed?.recommendation as string | undefined) ??
    analysis.recommendation ??
    extractField(reasoning, "Bobby's Pick", "BOBBY'S PICK", "Pick", "Recommendation", "BET");

  const betType =
    (parsed?.bet_type as string | undefined) ??
    analysis.bet_type ??
    extractField(reasoning, 'Bet Type', 'BET TYPE');

  const rawProb = parsed?.confidence_percentage as string | number | undefined;
  const winProbability = rawProb
    ? `${Math.round(parseFloat(String(rawProb)))}%`
    : WIN_PROB[analysis.confidence] ?? '60–70%';

  const units =
    (parsed?.units as number | undefined) ??
    analysis.units ??
    UNITS[analysis.confidence] ?? 2;

  const odds =
    analysis.odds ??
    (parsed?.odds as string | undefined) ??
    extractField(reasoning, 'Current Odds', 'ODDS', 'Moneyline', 'Line');

  return { recommendation, betType, winProbability, units, odds, reasoning };
};

const formatTimeAgo = (timestamp: string) => {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

// ── Markdown renderer ──────────────────────────────────────────
const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p:          ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  strong:     ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em:         ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
  h1:         ({ children }) => <h1 className="font-bold text-base mt-3 mb-1 text-primary">{children}</h1>,
  h2:         ({ children }) => <h2 className="font-semibold text-sm mt-2 mb-1 text-primary">{children}</h2>,
  h3:         ({ children }) => <h3 className="font-medium text-sm mt-2 mb-0.5 text-primary/80">{children}</h3>,
  ul:         ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1.5 pl-1">{children}</ul>,
  ol:         ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1.5 pl-1">{children}</ol>,
  li:         ({ children }) => <li className="leading-snug">{children}</li>,
  code:       ({ children }) => <code className="bg-primary/10 text-primary px-1 rounded text-xs font-mono">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic">{children}</blockquote>,
};

// ── PickCard ───────────────────────────────────────────────────
interface PickCardProps {
  analysis: TelegramAnalysis;
  isSaved: boolean;
  isExpanded: boolean;
  onSave: () => void;
  onToggleExpand: () => void;
  showSaveButton: boolean;
}

const PickCard = ({ analysis, isSaved, isExpanded, onSave, onToggleExpand, showSaveButton }: PickCardProps) => {
  const m = extractMetrics(analysis);

  return (
    <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground leading-tight truncate">{analysis.teams}</h4>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {analysis.sport && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{analysis.sport}</Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatTimeAgo(analysis.timestamp)}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 ml-2 text-xs px-2 py-0.5 font-semibold
            ${analysis.confidence === 'High'   ? 'border-win/40 text-win bg-win/5' : ''}
            ${analysis.confidence === 'Medium' ? 'border-primary/40 text-primary bg-primary/5' : ''}
            ${analysis.confidence === 'Low'    ? 'border-loss/40 text-loss bg-loss/5' : ''}
          `}
        >
          {analysis.confidence}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-background/50 rounded-lg border border-border/20">
          <div className="text-[10px] text-muted-foreground mb-0.5">Odds</div>
          <div className="font-semibold text-xs text-foreground truncate">{m.odds ?? '—'}</div>
        </div>
        <div className="text-center p-2 bg-win/10 rounded-lg border border-win/20">
          <div className="text-[10px] text-muted-foreground mb-0.5">Win Prob</div>
          <div className="font-bold text-xs text-win">{m.winProbability}</div>
        </div>
        <div className="text-center p-2 bg-accent/10 rounded-lg border border-accent/20">
          <div className="text-[10px] text-muted-foreground mb-0.5">Units</div>
          <div className="font-bold text-xs text-accent">{m.units}u</div>
        </div>
      </div>

      {/* Recommendation — gold box */}
      {m.recommendation && (
        <div
          className="mb-3 p-3 rounded-lg border"
          style={{ backgroundColor: 'rgba(245,161,0,0.08)', borderColor: 'rgba(245,161,0,0.3)' }}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Bobby's Pick</div>
          <div className="font-black text-sm" style={{ color: '#F5A100' }}>{m.recommendation}</div>
          {m.betType && <div className="text-xs text-muted-foreground mt-0.5 capitalize">{m.betType}</div>}
        </div>
      )}

      {/* Reasoning — expandable */}
      {m.reasoning && (
        <div className="relative mb-2">
          <div
            className={`bg-background/70 rounded-lg p-3 border border-border/20 overflow-hidden transition-all duration-200 ${isExpanded ? '' : 'max-h-32'}`}
          >
            <ReactMarkdown className="text-sm leading-relaxed" components={mdComponents}>
              {m.reasoning}
            </ReactMarkdown>
          </div>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary/30 to-transparent pointer-events-none rounded-b-lg" />
          )}
          <button
            onClick={onToggleExpand}
            className="mt-1 text-xs text-primary hover:underline w-full text-left pl-1"
          >
            {isExpanded ? 'Show less ↑' : 'Read more ↓'}
          </button>
        </div>
      )}

      {/* Save Pick */}
      {showSaveButton && (
        <button
          onClick={onSave}
          disabled={isSaved}
          className={`w-full min-h-[40px] flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg border transition-colors
            ${isSaved
              ? 'border-win/40 text-win bg-win/5 cursor-default'
              : 'border-0 text-black'
            }`}
          style={isSaved ? {} : { backgroundColor: '#F5A100' }}
        >
          {isSaved
            ? <><Check className="w-3.5 h-3.5" /> Saved to Tracker!</>
            : <><Bookmark className="w-3.5 h-3.5" /> Save Pick 🎲</>
          }
        </button>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────
export const TelegramAnalyses = ({ onUpgradeClick }: TelegramAnalysesProps) => {
  const { user } = useAuth();
  const { savePick } = usePicks();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const loadFromStorage = (): TelegramAnalysis[] => {
    try {
      const stored = localStorage.getItem('webhook_analyses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [analyses, setAnalyses] = useState<TelegramAnalysis[]>(loadFromStorage);

  // Deduplicate by ID
  const uniqueAnalyses = useMemo(() => {
    const seen = new Set<string>();
    return analyses.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [analyses]);

  useEffect(() => {
    const handleNew = (e: CustomEvent) => {
      setAnalyses(prev => {
        const updated = [e.detail, ...prev].filter((a, i, arr) =>
          arr.findIndex(x => x.id === a.id) === i
        ).slice(0, 10);
        return updated;
      });
    };

    const refreshFromStorage = () => {
      const fresh = loadFromStorage();
      if (fresh.length > 0) setAnalyses(fresh);
    };

    window.addEventListener('webhookAnalysisAdded', handleNew as EventListener);
    const interval = setInterval(refreshFromStorage, 5000);
    return () => {
      window.removeEventListener('webhookAnalysisAdded', handleNew as EventListener);
      clearInterval(interval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const fresh = loadFromStorage();
    if (fresh.length > 0) setAnalyses(fresh);
    await new Promise(r => setTimeout(r, 500));
    setIsRefreshing(false);
  };

  const handleSavePick = async (analysis: TelegramAnalysis) => {
    if (!user) {
      toast('Sign in to save picks.');
      return;
    }
    const m = extractMetrics(analysis);
    await savePick({
      teams: analysis.teams,
      sport: analysis.sport ?? 'NBA',
      pick: m.recommendation ?? null,
      confidence: analysis.confidence,
      analysis: m.reasoning,
      odds: m.odds ?? null,
      bet_type: m.betType ?? null,
    });
    setSavedIds(prev => new Set([...prev, analysis.id]));
    toast('Saved to Tracker! 🎲✅');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">Bobby's Picks</h3>
            <p className="text-xs text-muted-foreground">Live AI betting insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uniqueAnalyses.length > 0 && (
            <Badge variant="outline" className="border-accent/30 text-accent text-xs px-2 py-0.5">
              {uniqueAnalyses.length}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowImporter(v => !v)} className="text-xs h-8 px-2">
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8 p-0">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* JSON Importer */}
      {showImporter && (
        <div className="mb-4 rounded-lg border border-border/30 p-3 bg-background/60">
          <div className="text-sm mb-2 text-muted-foreground">Paste Bobby's Engine JSON analysis</div>
          <Textarea
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='{"teams":"Lakers vs Warriors","analysis":"..."}'
            className="mb-2 text-xs"
            rows={5}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { const ok = testAddAnalysis(jsonInput); if (ok) { setJsonInput(''); setShowImporter(false); } }}>
              Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowImporter(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-3">
        {uniqueAnalyses.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No picks yet</p>
            <p className="text-xs mt-1">Trigger Bobby's Engine to get today's picks</p>
          </div>
        ) : (
          uniqueAnalyses.map((analysis, index) => {
            const card = (
              <PickCard
                key={analysis.id}
                analysis={analysis}
                isSaved={savedIds.has(analysis.id)}
                isExpanded={expandedIds.has(analysis.id)}
                onSave={() => handleSavePick(analysis)}
                onToggleExpand={() => toggleExpand(analysis.id)}
                showSaveButton={!!user}
              />
            );
            if (index === 0) return <div key={analysis.id}>{card}</div>;
            return <VipGate key={analysis.id} onUpgradeClick={onUpgradeClick}>{card}</VipGate>;
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Bobby's Engine</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Live</span>
          <div className="w-1.5 h-1.5 bg-win rounded-full animate-pulse" />
        </div>
      </div>
    </Card>
  );
};
