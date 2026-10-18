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
// The favorite is COMPUTED from each race's field (lowest decimal odds), not
// hardcoded — a hand-picked favorite drifted out of sync with the field once
// (Bayou Bandit at 3-1 was shown while Chalk Eater at 5-2, a shorter price,
// was sitting right there in the same field).
//
// Race 5's field matches the existing hand-built Keeneland sample race card
// in the Bobby Vegas Horse Racing Picks (PROTOTYPE) n8n workflow exactly (6
// Furlongs, Dirt, 9 horses) so tapping it is a real end-to-end test, not just
// a UI mock.
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

interface SampleEntrant {
  name: string;
  morningLine: string; // "5-2" style, odds-to-1
}

interface SampleRaceInfo {
  distance: string;
  surface: string;
  condition: string;
  horses: SampleEntrant[];
}

// "8-1" / "5-2" -> decimal price (odds-to-1). Lower = more favored.
function parseMorningLine(ml: string): number | null {
  const m = ml.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  const den = parseFloat(m[2]);
  return den ? num / den : null;
}

function computeFavorite(horses: SampleEntrant[]): { name: string; morningLine: string } {
  let best: SampleEntrant = horses[0];
  let bestPrice = parseMorningLine(best.morningLine) ?? Infinity;
  for (const h of horses.slice(1)) {
    const price = parseMorningLine(h.morningLine) ?? Infinity;
    if (price < bestPrice) {
      best = h;
      bestPrice = price;
    }
  }
  return { name: best.name, morningLine: best.morningLine };
}

// Race 5's field matches the n8n Sample Race Card node exactly.
const RACE_FIELDS: Record<number, SampleRaceInfo> = {
  3: {
    distance: "5 Furlongs", surface: "Dirt", condition: "Fast",
    horses: [
      { name: "Quick Draw McGraw", morningLine: "2-1" },
      { name: "Silver Bullet", morningLine: "3-1" },
      { name: "Hot Ticket", morningLine: "9-2" },
      { name: "Night Owl", morningLine: "5-1" },
      { name: "Lucky Strike", morningLine: "6-1" },
      { name: "Final Word", morningLine: "8-1" },
      { name: "Morning Glory", morningLine: "10-1" },
      { name: "Cash Only", morningLine: "12-1" },
    ],
  },
  4: {
    distance: "1 Mile", surface: "Turf", condition: "Firm",
    horses: [
      { name: "Turf Baron", morningLine: "7-2" },
      { name: "Ocean Drive", morningLine: "3-1" },
      { name: "Grass Stain", morningLine: "9-2" },
      { name: "Linen Suit", morningLine: "5-1" },
      { name: "Silk Road", morningLine: "6-1" },
      { name: "Emerald Isle", morningLine: "8-1" },
      { name: "Fairway Dancer", morningLine: "10-1" },
      { name: "Lawn Order", morningLine: "12-1" },
      { name: "Green Light Go", morningLine: "15-1" },
      { name: "Meadow Lark", morningLine: "20-1" },
    ],
  },
  5: {
    distance: "6 Furlongs", surface: "Dirt", condition: "Fast",
    horses: [
      { name: "Harborline", morningLine: "8-1" },
      { name: "Quiet Larceny", morningLine: "5-1" },
      { name: "Mo Stable Genius", morningLine: "9-2" },
      { name: "Bayou Bandit", morningLine: "3-1" },
      { name: "Off The Record", morningLine: "15-1" },
      { name: "Sloppy Sam", morningLine: "12-1" },
      { name: "Chalk Eater", morningLine: "5-2" },
      { name: "Turf Tantrum", morningLine: "10-1" },
      { name: "Night Shift Nancy", morningLine: "20-1" },
    ],
  },
  6: {
    distance: "6.5 Furlongs", surface: "Dirt", condition: "Fast",
    horses: [
      { name: "Night Train", morningLine: "5-2" },
      { name: "Midnight Express", morningLine: "2-1" },
      { name: "Full Throttle", morningLine: "7-2" },
      { name: "Steel Wheels", morningLine: "9-2" },
      { name: "Last Call", morningLine: "6-1" },
      { name: "Iron Horse", morningLine: "8-1" },
      { name: "Copper Line", morningLine: "10-1" },
    ],
  },
  7: {
    distance: "1 1/16 Mile", surface: "Dirt", condition: "Fast",
    horses: [
      { name: "Final Call", morningLine: "9-5" },
      { name: "Second Wind", morningLine: "5-2" },
      { name: "Long Shot Lonnie", morningLine: "7-2" },
      { name: "Home Stretch", morningLine: "4-1" },
      { name: "Morning Line Mike", morningLine: "9-2" },
      { name: "Back Straight", morningLine: "6-1" },
      { name: "Photo Finish", morningLine: "8-1" },
      { name: "Dead Heat", morningLine: "10-1" },
      { name: "Also Eligible", morningLine: "15-1" },
    ],
  },
  8: {
    distance: "7 Furlongs", surface: "Turf", condition: "Firm",
    horses: [
      { name: "Last Call Lily", morningLine: "3-1" },
      { name: "Grass Note", morningLine: "5-2" },
      { name: "Fairway Flyer", morningLine: "7-2" },
      { name: "Divot Dancer", morningLine: "9-2" },
      { name: "Rough Cut", morningLine: "6-1" },
      { name: "Sand Trap Sally", morningLine: "8-1" },
      { name: "Out Of Bounds", morningLine: "10-1" },
      { name: "Birdie Belle", morningLine: "12-1" },
    ],
  },
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
    const { distance, surface, condition, horses } = RACE_FIELDS[raceNumber];
    return {
      id: `keeneland-r${raceNumber}`,
      track: "Keeneland",
      raceNumber,
      postTime: postTime.toISOString(),
      distance,
      surface,
      condition,
      horseCount: horses.length,
      favorite: computeFavorite(horses),
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
