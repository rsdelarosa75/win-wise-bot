import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, RefreshCw, Bookmark, Check } from 'lucide-react';
import { usePicks } from '@/hooks/use-picks';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

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
  onUpgradeClick?: () => void;
  onPicksTabClick?: () => void;
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
  confidence: 'High' | 'Medium' | 'Low';
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

  // Extract confidence from the analysis text first (🔥 CONFIDENCE: line)
  // This overrides the stored field which can be hardcoded as "High" by n8n
  const confFromText = (() => {
    const m = reasoning.match(/CONFIDENCE[^:\n]*:\s*\*{0,2}(High|Medium|Low)\*{0,2}/i);
    return m ? (m[1] as 'High' | 'Medium' | 'Low') : null;
  })();
  const confidence: 'High' | 'Medium' | 'Low' = confFromText ?? analysis.confidence ?? 'Medium';

  const rawProb = parsed?.confidence_percentage as string | number | undefined;
  const winProbability = rawProb
    ? `${Math.round(parseFloat(String(rawProb)))}%`
    : WIN_PROB[confidence] ?? '60–70%';

  const units =
    (parsed?.units as number | undefined) ??
    analysis.units ??
    UNITS[confidence] ?? 2;

  const odds =
    analysis.odds ??
    (parsed?.odds as string | undefined) ??
    extractField(reasoning, 'Current Odds', 'ODDS', 'Moneyline', 'Line');

  return { recommendation, betType, confidence, winProbability, units, odds, reasoning };
};

const formatTimeAgo = (timestamp: string) => {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(timestamp).toLocaleDateString();
};

// ── Plain text renderer (replaces ReactMarkdown for Safari compat) ──
const renderInline = (raw: string) => {
  const parts = raw.split('**');
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <span key={i}>{part}</span>
  );
};

const renderAnalysis = (text: string) => {
  if (!text) return null;
  return (
    <div className="text-sm leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      {text.split('\n').map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-2" />;
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <p key={idx} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-muted-foreground mt-0.5">•</span>
              <span>{renderInline(trimmed.replace(/^[-•]\s+/, ''))}</span>
            </p>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <p key={idx} className="flex gap-1.5 mb-0.5">
              <span className="shrink-0 text-muted-foreground">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </p>
          );
        }
        return <p key={idx} className="mb-1">{renderInline(line)}</p>;
      })}
    </div>
  );
};

// ── PickCard ───────────────────────────────────────────────────
interface PickCardProps {
  analysis: TelegramAnalysis;
  isSaved: boolean;
  onSave: () => void;
  showSaveButton: boolean;
}

const PickCard = ({ analysis, isSaved, onSave, showSaveButton }: PickCardProps) => {
  const m = extractMetrics(analysis);

  return (
    <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/10 rounded-xl border border-border/30 hover:border-primary/30 transition-all duration-200 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground leading-tight">{analysis.teams}</h4>
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
            ${m.confidence === 'High'   ? 'border-win/40 text-win bg-win/5' : ''}
            ${m.confidence === 'Medium' ? 'border-primary/40 text-primary bg-primary/5' : ''}
            ${m.confidence === 'Low'    ? 'border-loss/40 text-loss bg-loss/5' : ''}
          `}
        >
          {m.confidence}
        </Badge>
      </div>

      {/* Full analysis — no truncation */}
      {m.reasoning && (
        <div className="bg-background/70 rounded-lg p-3 border border-border/20 mb-3 w-full">
          {renderAnalysis(m.reasoning)}
        </div>
      )}

      {/* Save Pick */}
      {showSaveButton && (
        <button
          onClick={onSave}
          disabled={isSaved}
          className={`w-full min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg border transition-colors
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
export const TelegramAnalyses = ({ onPicksTabClick }: TelegramAnalysesProps) => {
  const { user } = useAuth();
  const { savePick } = usePicks();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isRealAnalysis = (text: string): boolean => {
    if (!text || text.trim().length < 50) return false;
    const lower = text.toLowerCase();
    if (lower.includes('"status"') || lower.includes('"jobid"') || lower.includes('"processing"')) return false;
    return /GAME:|PICK:|CONFIDENCE:|MONEYLINE|BOBBY'S PICK|BET TYPE/i.test(text);
  };

  const loadFromStorage = (): TelegramAnalysis[] => {
    try {
      const stored = localStorage.getItem('webhook_analyses');
      if (!stored) return [];
      const all: TelegramAnalysis[] = JSON.parse(stored);
      const clean = all.filter(a => isRealAnalysis(a.analysis ?? ""));
      // Persist the cleaned list so stale entries don't re-appear
      if (clean.length !== all.length) {
        localStorage.setItem('webhook_analyses', JSON.stringify(clean));
      }
      return clean;
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

  return (
    <Card className="p-4 bg-gradient-to-br from-card to-card/50 border-primary/20 overflow-x-hidden w-full">
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
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-11 w-11 p-0">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {uniqueAnalyses.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-3">
            <span className="text-4xl">🎲</span>
            <p className="text-sm font-semibold text-foreground/80">No picks yet</p>
            <p className="text-xs text-muted-foreground">Ask Bobby for today's picks</p>
            {onPicksTabClick && (
              <button
                onClick={onPicksTabClick}
                className="mt-1 px-5 py-2.5 rounded-lg text-sm font-black text-black min-h-[44px]"
                style={{ backgroundColor: '#F5A100' }}
              >
                Ask Bobby 🎲
              </button>
            )}
          </div>
        ) : (
          uniqueAnalyses.slice(0, 3).map((analysis) => (
            <div key={analysis.id}>
              <PickCard
                analysis={analysis}
                isSaved={savedIds.has(analysis.id)}
                onSave={() => handleSavePick(analysis)}
                showSaveButton={!!user}
              />
            </div>
          ))
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
