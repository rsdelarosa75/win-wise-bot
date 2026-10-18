import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toLocalYmd } from "@/lib/dates";
import { Clock3 } from "lucide-react";

// ============================================================================
// PREVIEW ONLY — SAMPLE DATA. Backs the horse-racing-preview branch's
// "Upcoming Races" feed. getUpcomingRaces() returns data in the same shape a
// real race-schedule provider would (track, raceNumber, postTime ISO string,
// distance, surface, condition, horseCount, favorite) — swap its body for a
// real API call later; nothing in this file's UI or Dashboard's wiring needs
// to change as long as the returned shape is preserved.
//
// Race 5 intentionally matches the existing hand-built Keeneland sample race
// card in the Bobby Vegas Horse Racing Picks (PROTOTYPE) n8n workflow (6
// Furlongs, Dirt, 9 horses, favorite Bayou Bandit at 3-1) so tapping it is a
// real end-to-end test, not just a UI mock.
// ============================================================================

export interface UpcomingRace {
  id: string;
  track: string;
  raceNumber: number;
  postTime: string; // ISO timestamp
  distance: string;
  surface: string;
  condition: string;
  horseCount: number;
  favorite: { name: string; morningLine: string };
}

const RACE_DETAILS: Record<number, Omit<UpcomingRace, "id" | "track" | "raceNumber" | "postTime">> = {
  3: { distance: "5 Furlongs", surface: "Dirt", condition: "Fast", horseCount: 8, favorite: { name: "Quick Draw McGraw", morningLine: "2-1" } },
  4: { distance: "1 Mile", surface: "Turf", condition: "Firm", horseCount: 10, favorite: { name: "Turf Baron", morningLine: "7-2" } },
  5: { distance: "6 Furlongs", surface: "Dirt", condition: "Fast", horseCount: 9, favorite: { name: "Bayou Bandit", morningLine: "3-1" } },
  6: { distance: "6.5 Furlongs", surface: "Dirt", condition: "Fast", horseCount: 7, favorite: { name: "Night Train", morningLine: "5-2" } },
  7: { distance: "1 1/16 Mile", surface: "Dirt", condition: "Fast", horseCount: 9, favorite: { name: "Final Call", morningLine: "9-5" } },
  8: { distance: "7 Furlongs", surface: "Turf", condition: "Firm", horseCount: 8, favorite: { name: "Last Call Lily", morningLine: "3-1" } },
};

/**
 * Sample schedule: Keeneland races 3-8, staggered ~30 min apart starting from
 * the next upcoming half hour. Computed once per call — callers that want a
 * "live" feed should call this once (e.g. on mount) and filter against a
 * ticking clock for display, not re-call it every tick, or the anchor time
 * drifts forward each render.
 */
export function getUpcomingRaces(): UpcomingRace[] {
  const anchor = new Date();
  anchor.setSeconds(0, 0);
  const minutes = anchor.getMinutes();
  const addMin = minutes < 30 ? 30 - minutes : 60 - minutes;
  anchor.setMinutes(minutes + addMin);

  return [3, 4, 5, 6, 7, 8].map((raceNumber, i) => {
    const postTime = new Date(anchor.getTime() + i * 30 * 60 * 1000);
    const details = RACE_DETAILS[raceNumber];
    return {
      id: `keeneland-r${raceNumber}`,
      track: "Keeneland",
      raceNumber,
      postTime: postTime.toISOString(),
      ...details,
    };
  });
}

function formatCountdown(postTimeIso: string, nowMs: number): string {
  const diffMin = Math.round((new Date(postTimeIso).getTime() - nowMs) / 60000);
  if (diffMin <= 0) return "At post";
  if (diffMin < 60) return `Post in ${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `Post in ${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function formatPostTime(postTimeIso: string): string {
  return new Date(postTimeIso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface RaceCardProps {
  race: UpcomingRace;
  nowMs: number;
  featured?: boolean;
  onSelect: (track: string, raceNumber: number, date: string) => void;
}

const RaceCard = ({ race, nowMs, featured, onSelect }: RaceCardProps) => {
  const handleTap = () => onSelect(race.track, race.raceNumber, toLocalYmd(race.postTime));

  return (
    <div
      onClick={handleTap}
      className={`rounded-lg border space-y-2 overflow-x-hidden w-full cursor-pointer transition-all duration-150
        bg-secondary/30 border-border/50 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] active:border-primary
        ${featured ? "p-4" : "p-3"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`font-semibold min-w-0 flex-1 ${featured ? "text-sm" : "text-xs"}`}>
          {race.track} — Race {race.raceNumber}
        </div>
        <div
          className={`flex items-center gap-1 shrink-0 font-bold ${featured ? "text-sm" : "text-xs"}`}
          style={{ color: "hsl(var(--bv-accent-text))" }}
        >
          <Clock3 className={featured ? "w-4 h-4" : "w-3 h-3"} />
          {formatCountdown(race.postTime, nowMs)}
        </div>
      </div>
      <div className={`flex items-center gap-2 flex-wrap text-muted-foreground ${featured ? "text-xs" : "text-[11px]"}`}>
        <span>{formatPostTime(race.postTime)}</span>
        <span>·</span>
        <span>{race.distance}</span>
        <span>·</span>
        <span>{race.surface}</span>
        <span>·</span>
        <span>{race.horseCount} horses</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1.5 ${featured ? "text-xs" : "text-[11px]"}`}>
          <span className="text-muted-foreground">Favorite:</span>
          <span className="font-semibold">{race.favorite.name}</span>
          <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">{race.favorite.morningLine}</span>
        </div>
        <span className="text-[11px] font-bold" style={{ color: "hsl(var(--bv-accent-text))" }}>
          Get Bobby's Pick →
        </span>
      </div>
    </div>
  );
};

interface UpcomingRacesProps {
  onRaceSelect: (track: string, raceNumber: number, date: string) => void;
}

export const UpcomingRaces = ({ onRaceSelect }: UpcomingRacesProps) => {
  // Schedule is generated once per mount; `nowMs` ticks to drive the live
  // countdown and to drop races whose post time has passed from the list.
  const [races] = useState(() => getUpcomingRaces());
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const upcoming = races.filter((r) => new Date(r.postTime).getTime() > nowMs);
  const [nextRace, ...restRaces] = upcoming;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Upcoming Races</span>
        <Badge
          variant="outline"
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-amber-500/15 text-amber-500 border-amber-500/30"
        >
          Sample Data
        </Badge>
      </div>

      {!nextRace && (
        <div className="flex items-center justify-center p-6 bg-secondary/30 rounded-lg border border-border/50">
          <div className="text-center space-y-1">
            <Clock3 className="w-5 h-5 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">No more sample races today</div>
          </div>
        </div>
      )}

      {nextRace && (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
            Next Race
          </div>
          <RaceCard race={nextRace} nowMs={nowMs} featured onSelect={onRaceSelect} />
        </>
      )}

      {restRaces.length > 0 && (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5 pt-1">
            Later Today
          </div>
          <div className="space-y-2">
            {restRaces.map((race) => (
              <RaceCard key={race.id} race={race} nowMs={nowMs} onSelect={onRaceSelect} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
