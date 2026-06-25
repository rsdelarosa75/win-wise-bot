#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           BOBBY VEGAS LOAD TEST — MANUAL TRIGGER ONLY       ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  ⚠️  WARNING: Consumes real API credits on every run.       ║
 * ║     OpenAI, Odds API, Supabase, N8N execution minutes.      ║
 * ║     Run ONLY when intentionally stress testing at scale.    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node load-test-bobby.js --agents 10 --duration 5m
 *   node load-test-bobby.js --agents 50 --duration 1h
 *   node load-test-bobby.js --agents 5  --duration 2m --sport MLB
 *   node load-test-bobby.js --agents 10 --duration 5m --dry-run
 *
 * Options:
 *   --agents   N       Number of concurrent virtual users (1–50, default 10)
 *   --duration Xm|Xh  How long to run (e.g. 5m, 30m, 1h, default 5m)
 *   --sport    KEY     Lock all agents to one sport (optional)
 *   --stagger  Ms      Ms between each agent start (default 1000)
 *   --dry-run          Print config and exit without firing any requests
 */

// ── Credentials ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://mocdziwqxbvjibylqxoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI';

// ── Sports registry ──────────────────────────────────────────────────────────
const SPORTS = [
  {
    key: 'Soccer', emoji: '⚽',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/soccer-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
    fixtures: [
      { teams: 'LA Galaxy vs Inter Miami', team1: 'LA Galaxy', team2: 'Inter Miami' },
      { teams: 'LAFC vs Seattle Sounders', team1: 'LAFC', team2: 'Seattle Sounders' },
      { teams: 'Atlanta United vs Orlando City', team1: 'Atlanta United', team2: 'Orlando City' },
    ],
  },
  {
    key: 'NHL', emoji: '🏒',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nhl-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    fixtures: [
      { teams: 'Carolina Hurricanes vs Vegas Golden Knights', team1: 'Carolina Hurricanes', team2: 'Vegas Golden Knights' },
      { teams: 'Florida Panthers vs Edmonton Oilers', team1: 'Florida Panthers', team2: 'Edmonton Oilers' },
      { teams: 'Boston Bruins vs Tampa Bay Lightning', team1: 'Boston Bruins', team2: 'Tampa Bay Lightning' },
    ],
  },
  {
    key: 'WNBA', emoji: '🏀',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/wnba-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
    fixtures: [
      { teams: 'Indiana Fever vs New York Liberty', team1: 'Indiana Fever', team2: 'New York Liberty' },
      { teams: 'Las Vegas Aces vs Seattle Storm', team1: 'Las Vegas Aces', team2: 'Seattle Storm' },
      { teams: 'Chicago Sky vs Atlanta Dream', team1: 'Chicago Sky', team2: 'Atlanta Dream' },
    ],
  },
  {
    key: 'MLB', emoji: '⚾',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/mlb-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    fixtures: [
      { teams: 'New York Yankees vs Boston Red Sox', team1: 'New York Yankees', team2: 'Boston Red Sox' },
      { teams: 'Los Angeles Dodgers vs San Francisco Giants', team1: 'Los Angeles Dodgers', team2: 'San Francisco Giants' },
      { teams: 'St. Louis Cardinals vs Chicago Cubs', team1: 'St. Louis Cardinals', team2: 'Chicago Cubs' },
    ],
  },
  {
    key: 'NFL', emoji: '🏈',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nfl-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    fixtures: [
      { teams: 'Kansas City Chiefs vs Buffalo Bills', team1: 'Kansas City Chiefs', team2: 'Buffalo Bills' },
      { teams: 'Dallas Cowboys vs Philadelphia Eagles', team1: 'Dallas Cowboys', team2: 'Philadelphia Eagles' },
      { teams: 'San Francisco 49ers vs Seattle Seahawks', team1: 'San Francisco 49ers', team2: 'Seattle Seahawks' },
    ],
  },
  {
    key: 'NCAAFB', emoji: '🏈',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/ncaafb-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    fixtures: [
      { teams: 'Alabama Crimson Tide vs Georgia Bulldogs', team1: 'Alabama Crimson Tide', team2: 'Georgia Bulldogs' },
      { teams: 'Ohio State Buckeyes vs Michigan Wolverines', team1: 'Ohio State Buckeyes', team2: 'Michigan Wolverines' },
      { teams: 'Texas Longhorns vs Oklahoma Sooners', team1: 'Texas Longhorns', team2: 'Oklahoma Sooners' },
    ],
  },
  {
    key: 'NBA', emoji: '🏀',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nba-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    fixtures: [
      { teams: 'Los Angeles Lakers vs Golden State Warriors', team1: 'Los Angeles Lakers', team2: 'Golden State Warriors' },
      { teams: 'Boston Celtics vs Miami Heat', team1: 'Boston Celtics', team2: 'Miami Heat' },
      { teams: 'Denver Nuggets vs Phoenix Suns', team1: 'Denver Nuggets', team2: 'Phoenix Suns' },
    ],
  },
  {
    key: 'F1', emoji: '🏎️',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/f1-picks',
    espnUrl: 'https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard',
    fixtures: [
      { teams: 'Max Verstappen vs Lando Norris', team1: 'Max Verstappen', team2: 'Lando Norris' },
      { teams: 'Lewis Hamilton vs Charles Leclerc', team1: 'Lewis Hamilton', team2: 'Charles Leclerc' },
      { teams: 'George Russell vs Oscar Piastri', team1: 'George Russell', team2: 'Oscar Piastri' },
    ],
    isF1: true,
  },
];

// ── Arg parser ───────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  const has = (flag) => args.includes(flag);

  const rawAgents = parseInt(get('--agents', '10'), 10);
  const agents = Math.min(50, Math.max(1, isNaN(rawAgents) ? 10 : rawAgents));

  const rawDur = get('--duration', '5m');
  const durMs  = parseDuration(rawDur);

  const sportFilter = get('--sport', null);
  const staggerMs   = parseInt(get('--stagger', '1000'), 10);
  const dryRun      = has('--dry-run');

  return { agents, durMs, rawDur, sportFilter, staggerMs, dryRun };
}

function parseDuration(s) {
  const n = parseFloat(s);
  if (s.endsWith('h')) return n * 3_600_000;
  if (s.endsWith('m')) return n * 60_000;
  if (s.endsWith('s')) return n * 1_000;
  return 5 * 60_000; // default 5m
}

// ── ESPN game fetcher (cached once at startup) ────────────────────────────────
const espnCache = {};

async function warmEspnCache(sports) {
  process.stdout.write('Warming ESPN cache');
  await Promise.allSettled(
    sports.map(async (sport) => {
      try {
        const res = await fetch(sport.espnUrl, { signal: AbortSignal.timeout(8_000) });
        if (!res.ok) return;
        const data = await res.json();
        const events = data.events ?? [];
        const games = events
          .map((e) => {
            const comps = e.competitions?.[0]?.competitors ?? [];
            const away = comps.find((c) => c.homeAway === 'away');
            const home = comps.find((c) => c.homeAway === 'home');
            if (sport.isF1) {
              const dA = comps[0]?.athlete?.displayName ?? comps[0]?.team?.displayName ?? '';
              const dB = comps[1]?.athlete?.displayName ?? comps[1]?.team?.displayName ?? '';
              if (!dA) return null;
              return { teams: dA && dB ? `${dA} vs ${dB}` : e.name, team1: dA, team2: dB };
            }
            const t1 = away?.team?.displayName ?? '';
            const t2 = home?.team?.displayName ?? '';
            if (!t1 || !t2) return null;
            return { teams: `${t1} vs ${t2}`, team1: t1, team2: t2 };
          })
          .filter(Boolean);
        if (games.length > 0) espnCache[sport.key] = games;
        process.stdout.write('.');
      } catch (_) {
        process.stdout.write('x');
      }
    })
  );
  console.log(' done.\n');
}

function pickGame(sport) {
  const pool = espnCache[sport.key]?.length ? espnCache[sport.key] : sport.fixtures;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Supabase poller (F1 async) ────────────────────────────────────────────────
async function pollSupabase(table, jobId, timeoutMs = 120_000) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4_000));
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(jobId)}&select=status,analysis`,
        { headers, signal: AbortSignal.timeout(8_000) }
      );
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (row?.status === 'complete' && row.analysis) return;
    } catch (_) {}
  }
  throw new Error('supabase_poll_timeout');
}

// ── Error classifier ──────────────────────────────────────────────────────────
function classifyError(err) {
  const msg = (err?.message ?? '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('abort')) return 'timeout';
  if (msg.includes('supabase_poll_timeout')) return 'f1_poll_timeout';
  if (msg.includes('http ')) return 'http_error';
  if (msg.includes('json') || msg.includes('token')) return 'parse_error';
  if (msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('enotfound')) return 'network_error';
  return 'unknown';
}

// ── Metrics store ─────────────────────────────────────────────────────────────
const results = []; // { agentId, sport, game, startMs, endMs, success, errorType, stage }

function record(entry) {
  results.push(entry);
}

// ── Single pick request ───────────────────────────────────────────────────────
async function firePick(agentId, sport, game) {
  const startMs = Date.now();
  let stage = 'webhook';

  try {
    const res = await fetch(sport.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sport: sport.key, teams: game.teams, team1: game.team1, team2: game.team2 }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!res.ok) throw new Error(`http ${res.status}`);
    const rawText = await res.text();

    if (sport.isF1) {
      stage = 'supabase_poll';
      let json;
      try { json = JSON.parse(rawText); } catch { throw new Error('parse_error'); }
      const body = Array.isArray(json) ? json[0] : json;
      const jobId = body?.jobId;
      if (!jobId) throw new Error('no_job_id');
      await pollSupabase('f1_picks', jobId);
    }

    const endMs = Date.now();
    record({ agentId, sport: sport.key, game: game.teams, startMs, endMs, success: true, errorType: null, stage: 'complete' });
    return true;
  } catch (err) {
    const endMs = Date.now();
    record({ agentId, sport: sport.key, game: game.teams, startMs, endMs, success: false, errorType: classifyError(err), stage });
    return false;
  }
}

// ── Agent loop ────────────────────────────────────────────────────────────────
async function runAgent(agentId, sports, durationMs, startAt) {
  // Wait for staggered start
  const waitUntil = startAt - Date.now();
  if (waitUntil > 0) await new Promise((r) => setTimeout(r, waitUntil));

  const deadline = Date.now() + durationMs;
  let reqCount = 0;

  while (Date.now() < deadline) {
    const sport = sports[Math.floor(Math.random() * sports.length)];
    const game  = pickGame(sport);

    process.stdout.write(`  [A${String(agentId).padStart(2, '0')}] ${sport.emoji} ${sport.key}: ${game.teams.slice(0, 40)}...\n`);
    await firePick(agentId, sport, game);
    reqCount++;

    // Think time: 8–25s between requests per agent (realistic user pacing)
    const thinkTime = 8_000 + Math.random() * 17_000;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(thinkTime, remaining)));
  }

  return reqCount;
}

// ── Stats helpers ─────────────────────────────────────────────────────────────
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function ms(n) {
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)}m`;
  return `${(n / 1000).toFixed(1)}s`;
}

function pct(a, b) {
  return b === 0 ? '–' : `${((a / b) * 100).toFixed(1)}%`;
}

function pad(s, n) {
  return String(s).padEnd(n);
}

// ── Report printer ────────────────────────────────────────────────────────────
function printReport(cfg, wallMs) {
  const total    = results.length;
  const successes = results.filter((r) => r.success).length;
  const failures  = total - successes;
  const times     = results.map((r) => r.endMs - r.startMs).sort((a, b) => a - b);
  const avgMs     = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const p50       = percentile(times, 50);
  const p95       = percentile(times, 95);
  const p99       = percentile(times, 99);

  // Per-sport breakdown
  const sportStats = {};
  for (const r of results) {
    if (!sportStats[r.sport]) sportStats[r.sport] = { total: 0, ok: 0, times: [], errors: {} };
    const s = sportStats[r.sport];
    s.total++;
    if (r.success) { s.ok++; s.times.push(r.endMs - r.startMs); }
    else { s.errors[r.errorType] = (s.errors[r.errorType] ?? 0) + 1; }
  }

  // Slowest sport (by avg response time, successes only)
  let slowestSport = null, slowestAvg = 0;
  for (const [key, s] of Object.entries(sportStats)) {
    const avg = s.times.length ? s.times.reduce((a, b) => a + b, 0) / s.times.length : 0;
    if (avg > slowestAvg) { slowestAvg = avg; slowestSport = key; }
  }

  // Error tally
  const errorTally = {};
  for (const r of results.filter((r) => !r.success)) {
    errorTally[r.errorType] = (errorTally[r.errorType] ?? 0) + 1;
  }

  const W = 62;
  const line  = '─'.repeat(W);
  const dline = '═'.repeat(W);

  console.log('\n' + dline);
  console.log('  BOBBY VEGAS LOAD TEST — FINAL REPORT');
  console.log(dline);
  console.log(`  Agents:       ${cfg.agents}`);
  console.log(`  Duration:     ${cfg.rawDur}  (actual wall time: ${ms(wallMs)})`);
  console.log(`  Sport filter: ${cfg.sportFilter ?? 'all'}`);
  console.log(`  Finished:     ${new Date().toLocaleString()}`);
  console.log(line);

  console.log('\n  SUMMARY');
  console.log(line);
  console.log(`  Total picks requested:  ${total}`);
  console.log(`  Successes:              ${successes}  (${pct(successes, total)})`);
  console.log(`  Failures:               ${failures}  (${pct(failures, total)})`);
  console.log(`  Avg response time:      ${ms(avgMs)}`);
  console.log(`  Median (P50):           ${ms(p50)}`);
  console.log(`  P95 response time:      ${ms(p95)}`);
  console.log(`  P99 response time:      ${ms(p99)}`);
  console.log(`  Fastest:                ${ms(times[0] ?? 0)}`);
  console.log(`  Slowest:                ${ms(times[times.length - 1] ?? 0)}`);

  console.log('\n  BY SPORT');
  console.log(line);
  console.log(`  ${pad('Sport', 10)} ${pad('Reqs', 6)} ${pad('Success%', 10)} ${pad('Avg', 8)} ${pad('P95', 8)}`);
  console.log(`  ${pad('─────', 10)} ${pad('────', 6)} ${pad('────────', 10)} ${pad('───', 8)} ${pad('───', 8)}`);

  const sportEntries = Object.entries(sportStats).sort((a, b) => {
    const avgA = a[1].times.length ? a[1].times.reduce((x, y) => x + y, 0) / a[1].times.length : 0;
    const avgB = b[1].times.length ? b[1].times.reduce((x, y) => x + y, 0) / b[1].times.length : 0;
    return avgB - avgA; // slowest first
  });

  for (const [key, s] of sportEntries) {
    const sportObj = SPORTS.find((x) => x.key === key);
    const emoji = sportObj?.emoji ?? '  ';
    const sortedT = [...s.times].sort((a, b) => a - b);
    const avg = sortedT.length ? sortedT.reduce((a, b) => a + b, 0) / sortedT.length : 0;
    const p95s = percentile(sortedT, 95);
    const flag = key === slowestSport ? ' ← SLOWEST' : '';
    console.log(`  ${pad(emoji + ' ' + key, 10)} ${pad(s.total, 6)} ${pad(pct(s.ok, s.total), 10)} ${pad(ms(avg), 8)} ${pad(ms(p95s), 8)}${flag}`);
  }

  if (Object.keys(errorTally).length > 0) {
    console.log('\n  ERRORS BY TYPE');
    console.log(line);
    for (const [type, count] of Object.entries(errorTally).sort((a, b) => b[1] - a[1])) {
      const explain = {
        timeout:          'Webhook did not respond within 90s (OpenAI or Odds API slow)',
        f1_poll_timeout:  'Supabase F1 poll did not complete within 120s',
        http_error:       'N8N returned non-200 HTTP status',
        parse_error:      'Webhook response was not valid JSON',
        network_error:    'TCP/DNS failure reaching N8N cloud',
        unknown:          'Unclassified error',
      }[type] ?? type;
      console.log(`  ${pad(type, 22)}  ×${count}  ${explain}`);
    }
  } else {
    console.log('\n  ERRORS BY TYPE');
    console.log(line);
    console.log('  No errors. ✓');
  }

  console.log('\n  BOTTLENECK ANALYSIS');
  console.log(line);
  if (slowestSport) {
    console.log(`  Slowest sport:    ${slowestSport} (avg ${ms(slowestAvg)})`);
    const note = {
      MLB:    'Likely: Kalshi edge + Odds API chain adding latency',
      F1:     'Likely: OpenAI + Supabase async poll overhead',
      Soccer: 'Likely: multi-league odds aggregation in workflow',
      NBA:    'Likely: injury report fetch + back-to-back detection',
    }[slowestSport] ?? 'Likely: OpenAI response time variance';
    console.log(`  Probable cause:   ${note}`);
  }

  const f1Stats = sportStats['F1'];
  if (f1Stats) {
    const f1PollFails = f1Stats.errors?.f1_poll_timeout ?? 0;
    console.log(`  F1 Supabase poll: ${f1Stats.total - f1PollFails}/${f1Stats.total} resolved successfully`);
  }

  const webhookFailRate = pct(failures, total);
  const health = failures === 0 ? '✓ Healthy' : failures / total < 0.05 ? '⚠ Degraded (<5% fail)' : '✗ Unhealthy (>5% fail)';

  console.log('\n  API HEALTH');
  console.log(line);
  console.log(`  Bobby Vegas Webhooks:   ${health}  (${webhookFailRate} failure rate)`);
  console.log(`  ESPN Scoreboard cache:  ${Object.keys(espnCache).length}/${SPORTS.length} sports cached`);
  if (f1Stats) {
    const f1Health = (f1Stats.errors?.f1_poll_timeout ?? 0) === 0 ? '✓ Healthy' : '⚠ Poll timeouts detected';
    console.log(`  Supabase F1 polling:    ${f1Health}`);
  }

  console.log('\n' + dline + '\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║        BOBBY VEGAS LOAD TEST — STARTING                     ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  ⚠️  This will consume real API credits (OpenAI, Odds API,  ║');
  console.log('║     Supabase, N8N execution minutes).                       ║');
  console.log('║     Ctrl+C to abort at any time.                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const cfg = parseArgs();

  // Validate sport filter
  const activeSports = cfg.sportFilter
    ? SPORTS.filter((s) => s.key.toLowerCase() === cfg.sportFilter.toLowerCase())
    : SPORTS;

  if (activeSports.length === 0) {
    console.error(`Unknown sport filter: "${cfg.sportFilter}". Valid options: ${SPORTS.map((s) => s.key).join(', ')}`);
    process.exit(1);
  }

  console.log(`  Agents:       ${cfg.agents}`);
  console.log(`  Duration:     ${cfg.rawDur}`);
  console.log(`  Sports:       ${activeSports.map((s) => s.key).join(', ')}`);
  console.log(`  Stagger:      ${cfg.staggerMs}ms between agent starts`);
  console.log(`  Dry run:      ${cfg.dryRun ? 'YES — no requests will fire' : 'no'}`);
  console.log();

  if (cfg.dryRun) {
    console.log('Dry run complete. Remove --dry-run to execute.');
    return;
  }

  // 5-second countdown so you can abort
  console.log('Starting in 5 seconds... (Ctrl+C to abort)\n');
  await new Promise((r) => setTimeout(r, 5_000));

  await warmEspnCache(activeSports);

  const wallStart = Date.now();
  const now = Date.now();

  // Spawn all agents with staggered start times
  const agentPromises = Array.from({ length: cfg.agents }, (_, i) =>
    runAgent(i + 1, activeSports, cfg.durMs, now + i * cfg.staggerMs)
  );

  // Progress ticker — print a summary line every 30s
  const tickInterval = setInterval(() => {
    const elapsed  = Date.now() - wallStart;
    const remaining = cfg.durMs - elapsed;
    if (remaining <= 0) return;
    const ok   = results.filter((r) => r.success).length;
    const fail = results.filter((r) => !r.success).length;
    console.log(
      `  [${ms(elapsed)} elapsed | ${ms(remaining)} left]  ` +
      `${results.length} reqs | ${ok} ok | ${fail} fail`
    );
  }, 30_000);

  await Promise.all(agentPromises);
  clearInterval(tickInterval);

  const wallMs = Date.now() - wallStart;
  printReport(cfg, wallMs);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
