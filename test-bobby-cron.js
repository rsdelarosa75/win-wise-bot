#!/usr/bin/env node
/**
 * Bobby Vegas Daily Picks — cron script
 * Runs every day at 9 AM Pacific.
 * Fetches today's first game from ESPN per sport, fires Bobby Vegas webhooks,
 * then sends a formatted Telegram summary.
 *
 * Run once:      node test-bobby-cron.js --now
 * Keep alive:    pm2 start test-bobby-cron.js --name bobby-cron
 */

import cron from 'node-cron';

// ── Credentials ─────────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = '8808471611:AAFJB7e9KK4dlC1fOfhPAIpjKzMx6cjTLrU';
const TELEGRAM_CHAT_ID   = '5110528412';

const SUPABASE_URL      = 'https://mocdziwqxbvjibylqxoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI';

// ── Sports config ─────────────────────────────────────────────────────────────
// Listed in priority order. Sports with no games today are silently skipped.
const SPORTS = [
  {
    key: 'Soccer',
    emoji: '⚽',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/soccer-picks',
    espnUrls: [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
    ],
  },
  {
    key: 'NHL',
    emoji: '🏒',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nhl-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard'],
  },
  {
    key: 'WNBA',
    emoji: '🏀',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/wnba-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard'],
  },
  {
    key: 'MLB',
    emoji: '⚾',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/mlb-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'],
  },
  {
    key: 'NFL',
    emoji: '🏈',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nfl-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'],
  },
  {
    key: 'NCAAFB',
    emoji: '🏈',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/ncaafb-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard'],
  },
  {
    key: 'NBA',
    emoji: '🏀',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nba-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'],
  },
  {
    key: 'F1',
    emoji: '🏎️',
    webhook: 'https://eleven48ai.app.n8n.cloud/webhook/f1-picks',
    espnUrls: ['https://site.api.espn.com/apis/site/v2/sports/racing/f1/scoreboard'],
    isF1: true,
  },
];

// ── ESPN: fetch first game of the day ────────────────────────────────────────
async function fetchFirstGame(sport) {
  const todayYmd = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });

  for (const url of sport.espnUrls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events ?? [];
      if (!events.length) continue;

      // F1: grab the upcoming race name + top two drivers if available
      if (sport.isF1) {
        const evt = events[0];
        const comps = evt.competitions?.[0]?.competitors ?? [];
        const driverA = comps[0]?.athlete?.displayName ?? comps[0]?.team?.displayName ?? '';
        const driverB = comps[1]?.athlete?.displayName ?? comps[1]?.team?.displayName ?? '';
        const teams = driverA && driverB ? `${driverA} vs ${driverB}` : (evt.name ?? evt.shortName ?? 'F1 Race');
        return { teams, team1: driverA || teams, team2: driverB || '' };
      }

      // Team sports: prefer today's games, fall back to next scheduled
      const todays = events.filter((e) => {
        const raw = e.date ?? e.competitions?.[0]?.date ?? '';
        return raw && new Date(raw).toLocaleDateString('en-CA', {
          timeZone: 'America/Los_Angeles',
        }) === todayYmd;
      });
      const pool = todays.length > 0 ? todays : events;

      const game = [...pool].sort((a, b) => {
        const ta = new Date(a.date ?? a.competitions?.[0]?.date ?? 0).getTime();
        const tb = new Date(b.date ?? b.competitions?.[0]?.date ?? 0).getTime();
        return ta - tb;
      })[0];

      const comps = game.competitions?.[0]?.competitors ?? [];
      const away = comps.find((c) => c.homeAway === 'away');
      const home = comps.find((c) => c.homeAway === 'home');
      const team1 = away?.team?.displayName ?? away?.team?.name ?? '';
      const team2 = home?.team?.displayName ?? home?.team?.name ?? '';
      if (!team1 || !team2) continue;

      return { teams: `${team1} vs ${team2}`, team1, team2 };
    } catch (err) {
      console.warn(`[ESPN][${sport.key}] ${url} — ${err.message}`);
    }
  }
  return null;
}

// ── Supabase poller (F1 async webhook) ───────────────────────────────────────
async function pollSupabase(table, jobId, timeoutMs = 120_000) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
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
      if (row?.status === 'complete' && row.analysis) return row.analysis;
    } catch (_) {}
  }
  throw new Error(`Supabase poll timeout for ${table}/${jobId}`);
}

// ── Fire Bobby Vegas webhook ──────────────────────────────────────────────────
async function callWebhook(sport, game) {
  const res = await fetch(sport.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sport: sport.key,
      teams: game.teams,
      team1: game.team1,
      team2: game.team2,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const rawText = await res.text();

  // F1 async path — needs jobId from JSON
  if (sport.isF1) {
    const json = JSON.parse(rawText);
    const body = Array.isArray(json) ? json[0] : json;
    const jobId = body?.jobId;
    if (!jobId) throw new Error('No jobId in F1 webhook response');
    console.log(`[F1] Polling Supabase for job ${jobId}...`);
    return pollSupabase('f1_picks', jobId);
  }

  // Try JSON first (Soccer, NBA return JSON with .analysis field)
  // Other sports return plain text/markdown directly — use as-is
  try {
    const json = JSON.parse(rawText);
    const body = Array.isArray(json) ? json[0] : json;
    return body?.analysis ?? body?.output ?? body?.response ?? rawText;
  } catch (_) {
    return rawText;
  }
}

// ── Parse Bobby Vegas analysis HTML → pick summary ───────────────────────────
function parseAnalysis(rawHtml) {
  // Strip HTML, markdown bold/italic, and normalize whitespace
  const text = (rawHtml ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,3}\s/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Explicit labeled pick sections (colon required — avoids partial word matches)
  const explicitPat = /(?:PICK|MY PICK|BEST BET|FINAL PICK|RECOMMENDED BET|RECOMMENDATION|WAGER)[:\s]+([A-Z][^\n!?]{5,110})/i;
  const explicitMatch = text.match(explicitPat);

  // 2. "Take the X" / "Bet on X" / "Back X" as standalone phrase (require capital start after keyword)
  const actionPat = /\b(?:Take the|Bet on|Backing|Back the|Lean toward|Go with)\s+([A-Z][^\n.!?]{5,100})/;
  const actionMatch = text.match(actionPat);

  // 3. Team name followed by odds like "+140" or "-115" — reliable pick indicator
  const oddsPat = /([A-Z][a-zA-Z '.'-]{3,35})\s*(?:\()?([+-]\d{2,4})(?:\))?/;
  const oddsMatch = text.match(oddsPat);

  // Truncate a matched string to first clause boundary
  const clip = (s) => s.split(/[.!?\n]|(?:\s+BET\s+TYPE|\s+CONFIDENCE|\s+REASONING)/i)[0].trim().slice(0, 100);

  let pick = null;
  if (explicitMatch) {
    pick = clip(explicitMatch[1]);
  } else if (actionMatch) {
    pick = clip(actionMatch[0]);
  } else if (oddsMatch) {
    pick = `${oddsMatch[1].trim()} ${oddsMatch[2]}`;
  }

  const confMatch = text.match(/confidence[:\s]+(high|medium|low)/i);
  const confidence = confMatch
    ? confMatch[1].charAt(0).toUpperCase() + confMatch[1].slice(1).toLowerCase()
    : null;

  const edgePctMatch = text.match(/(\d{1,2}\.?\d*)\s*%\s*(?:kalshi\s+)?edge/i);
  const edgePct = edgePctMatch?.[1] ?? null;
  const hasEdge = /EDGE\s*ALERT|kalshi\s+edge/i.test(text);

  // Fallback: first sentence that looks like a take (contains a team name or odds)
  if (!pick) {
    const sentences = text.split(/[.!?]/);
    const meaningful = sentences.find((s) => s.trim().length > 15 && /[A-Z]{2,}|[+-]\d{3}/.test(s));
    pick = meaningful?.trim().slice(0, 120) ?? '(see full analysis)';
  }

  return { pick, confidence, hasEdge, edgePct };
}

// ── Escape text for Telegram HTML mode ───────────────────────────────────────
function esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Build Telegram message ────────────────────────────────────────────────────
function buildMessage(results) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const lines = [`🎲 <b>Bobby Vegas Daily Picks</b>`, `📅 ${dateStr}`, ''];

  for (const r of results) {
    lines.push(`${r.sport.emoji} <b>${r.sport.key}:</b> ${esc(r.game.teams)}`);
    if (r.error) {
      lines.push(`⚠️ Unavailable: ${esc(r.error)}`);
    } else {
      let pickLine = esc(r.parsed.pick);
      if (r.parsed.hasEdge && r.parsed.edgePct) {
        pickLine += ` (VALUE — ${esc(r.parsed.edgePct)}% Kalshi edge)`;
      } else if (r.parsed.hasEdge) {
        pickLine += ' (VALUE — Kalshi edge)';
      }
      lines.push(`🎯 Pick: ${pickLine}`);
      if (r.parsed.confidence) lines.push(`🔥 Confidence: ${esc(r.parsed.confidence)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

// ── Send Telegram message ─────────────────────────────────────────────────────
async function sendTelegram(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
  console.log('[Telegram] Message sent.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function runDailyPicks() {
  console.log(`\n[Bobby Vegas] Starting daily picks — ${new Date().toISOString()}`);
  const results = [];

  for (const sport of SPORTS) {
    process.stdout.write(`[${sport.key}] Fetching ESPN... `);
    let game = null;
    try {
      game = await fetchFirstGame(sport);
    } catch (err) {
      console.log(`ESPN error: ${err.message}`);
      continue;
    }

    if (!game) {
      console.log('no games today, skipped.');
      continue;
    }

    console.log(`${game.teams}`);
    process.stdout.write(`[${sport.key}] Calling webhook... `);

    let rawAnalysis = null;
    let error = null;
    try {
      rawAnalysis = await callWebhook(sport, game);
      console.log(`done (${String(rawAnalysis).length} chars).`);
    } catch (err) {
      error = err.message;
      console.log(`FAILED — ${error}`);
    }

    const parsed = rawAnalysis
      ? parseAnalysis(rawAnalysis)
      : { pick: null, confidence: null, hasEdge: false, edgePct: null };

    results.push({ sport, game, parsed, error });
  }

  if (results.length === 0) {
    console.log('[Bobby Vegas] No games found for any sport today.');
    await sendTelegram('🎲 Bobby Vegas\n\nNo games scheduled today. Check back tomorrow!');
    return;
  }

  const message = buildMessage(results);
  console.log('\n──── Telegram message ────\n' + message + '\n──────────────────────────\n');
  await sendTelegram(message);
  console.log('[Bobby Vegas] Done.\n');
}

// ── Entry point ───────────────────────────────────────────────────────────────
const runNow = process.argv.includes('--now');

if (runNow) {
  // One-shot: run immediately then exit
  runDailyPicks().catch(console.error);
} else {
  // Cron mode: schedule 9am Pacific, stay alive
  cron.schedule('0 9 * * *', () => {
    runDailyPicks().catch(console.error);
  }, { timezone: 'America/Los_Angeles' });

  console.log('[Bobby Vegas] Scheduled — runs daily at 9:00 AM Pacific.');
  console.log('[Bobby Vegas] Test with: node test-bobby-cron.js --now');
  console.log('[Bobby Vegas] Keep alive: pm2 start test-bobby-cron.js --name bobby-cron');
}
