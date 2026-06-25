#!/usr/bin/env node
/**
 * Bobby Vegas Telegram Bot — @BobbyVegasDaily_Bot
 *
 * Users text the bot with a game or sport; it fires the correct N8N webhook,
 * polls for the result (F1 async), and sends back a formatted pick.
 *
 * Commands:
 *   /pick MLB Yankees vs Red Sox
 *   /pick NBA Knicks vs Spurs
 *   /pick soccer USA vs Portugal
 *   /pick f1 Verstappen vs Hamilton
 *   /today          — today's top pick (MLB if available, else first active sport)
 *   /help           — lists all commands
 *
 * Rate limit: 3 picks per user per day (free tier)
 *
 * Activation:
 *   1. Set TELEGRAM_BOT_TOKEN in .env
 *   2. Create bot via @BotFather, set username to @BobbyVegasDaily_Bot
 *   3. node telegram-bobby-bot.js
 *   4. Or: pm2 start telegram-bobby-bot.js --name betty-telegram-bot
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Env loader ─────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(filePath) {
  try {
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx === -1) continue;
      const key = t.slice(0, idx).trim();
      const val = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_) {}
}
loadEnv(join(__dirname, '..', '.env'));

// ── Credentials ─────────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL       = 'https://mocdziwqxbvjibylqxoz.supabase.co';
const SUPABASE_ANON_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI';
const FREE_TIER_LIMIT    = 3; // picks per user per day

if (!TELEGRAM_BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

// ── Sports registry ──────────────────────────────────────────────────────────
const SPORTS = {
  soccer:  { key: 'Soccer', emoji: '⚽', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/soccer-picks',  aliases: ['football', 'futbol', 'mls', 'soccer'] },
  nhl:     { key: 'NHL',    emoji: '🏒', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nhl-picks',     aliases: ['nhl', 'hockey'] },
  wnba:    { key: 'WNBA',   emoji: '🏀', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/wnba-picks',    aliases: ['wnba'] },
  mlb:     { key: 'MLB',    emoji: '⚾', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/mlb-picks',     aliases: ['mlb', 'baseball'] },
  nfl:     { key: 'NFL',    emoji: '🏈', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nfl-picks',     aliases: ['nfl', 'football'] },
  ncaafb:  { key: 'NCAAFB', emoji: '🏈', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/ncaafb-picks',  aliases: ['ncaafb', 'college football', 'cfb'] },
  nba:     { key: 'NBA',    emoji: '🏀', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/nba-picks',     aliases: ['nba', 'basketball'] },
  f1:      { key: 'F1',     emoji: '🏎️', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/f1-picks',      aliases: ['f1', 'formula 1', 'formula1', 'racing'], isF1: true },
  tennis:  { key: 'Tennis', emoji: '🎾', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/tennis-picks',  aliases: ['tennis', 'atp', 'wta'] },
  golf:    { key: 'Golf',   emoji: '⛳', webhook: 'https://eleven48ai.app.n8n.cloud/webhook/golf-picks',    aliases: ['golf', 'pga'] },
};

// Top pick daily order
const DAILY_SPORT_ORDER = ['mlb', 'nba', 'nhl', 'soccer', 'wnba', 'nfl', 'ncaafb', 'f1'];

// ── Sport parser ─────────────────────────────────────────────────────────────
function parseSportFromText(text) {
  const lower = text.toLowerCase().trim();
  for (const [, sport] of Object.entries(SPORTS)) {
    for (const alias of sport.aliases) {
      if (lower.startsWith(alias)) return sport;
    }
  }
  return null;
}

// "/pick MLB Yankees vs Red Sox" → { sport, teams, team1, team2 }
function parsePickCommand(text) {
  const body = text.replace(/^\/pick\s*/i, '').trim();
  const sport = parseSportFromText(body);
  if (!sport) return null;

  // Strip sport name from front
  const alias = sport.aliases.find((a) => body.toLowerCase().startsWith(a));
  const matchup = body.slice(alias?.length ?? 0).trim();

  const vsMatch = matchup.match(/^(.+?)\s+(?:vs\.?|@|versus)\s+(.+)$/i);
  if (!vsMatch) return { sport, teams: matchup, team1: matchup, team2: '' };
  return { sport, teams: matchup, team1: vsMatch[1].trim(), team2: vsMatch[2].trim() };
}

// ── Rate limiter (in-memory per day) ─────────────────────────────────────────
// Key: `userId-YYYY-MM-DD`, value: count
const usageMap = new Map();

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function checkRateLimit(userId) {
  const key = `${userId}-${todayKey()}`;
  const count = usageMap.get(key) ?? 0;
  return { allowed: count < FREE_TIER_LIMIT, used: count, limit: FREE_TIER_LIMIT };
}

function incrementUsage(userId) {
  const key = `${userId}-${todayKey()}`;
  usageMap.set(key, (usageMap.get(key) ?? 0) + 1);
}

// ── Supabase F1 poller ────────────────────────────────────────────────────────
async function pollSupabase(table, jobId, timeoutMs = 120_000) {
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
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
  throw new Error('Analysis timed out — try again in a minute');
}

// ── Webhook caller ────────────────────────────────────────────────────────────
async function getBobbyPick(sport, teams, team1, team2) {
  const res = await fetch(sport.webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport: sport.key, teams, team1, team2 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Webhook error ${res.status}`);

  const rawText = await res.text();

  if (sport.isF1) {
    const json = JSON.parse(rawText);
    const body = Array.isArray(json) ? json[0] : json;
    const jobId = body?.jobId;
    if (!jobId) throw new Error('F1 webhook did not return a job ID');
    return pollSupabase('f1_picks', jobId);
  }

  try {
    const json = JSON.parse(rawText);
    const body = Array.isArray(json) ? json[0] : json;
    return body?.analysis ?? body?.output ?? body?.response ?? rawText;
  } catch (_) {
    return rawText;
  }
}

// ── Today's top pick (ESPN → first available game) ───────────────────────────
async function getTodayTopPick() {
  const ESPN = {
    mlb:    'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    nba:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    nhl:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    soccer: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
    wnba:   'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
  };

  for (const sportKey of DAILY_SPORT_ORDER) {
    const espnUrl = ESPN[sportKey];
    if (!espnUrl) continue;
    const sport = SPORTS[sportKey];

    try {
      const res = await fetch(espnUrl, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) continue;
      const data = await res.json();
      const events = data.events ?? [];
      if (!events.length) continue;

      const game = events[0];
      const comps = game.competitions?.[0]?.competitors ?? [];
      const away = comps.find((c) => c.homeAway === 'away');
      const home = comps.find((c) => c.homeAway === 'home');
      const team1 = away?.team?.displayName ?? '';
      const team2 = home?.team?.displayName ?? '';
      if (!team1 || !team2) continue;

      return { sport, teams: `${team1} vs ${team2}`, team1, team2 };
    } catch (_) {
      continue;
    }
  }
  return null;
}

// ── Telegram API helpers ──────────────────────────────────────────────────────
const TG_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  await fetch(`${TG_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options }),
    signal: AbortSignal.timeout(10_000),
  });
}

async function sendTyping(chatId) {
  await fetch(`${TG_BASE}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {});
}

// ── Message formatter ─────────────────────────────────────────────────────────
function esc(s) {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatPick(sport, teams, analysis) {
  const clean = (analysis ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);

  return [
    `🎲 <b>Bobby Vegas Pick</b>`,
    `${sport.emoji} <b>${esc(sport.key)}:</b> ${esc(teams)}`,
    ``,
    esc(clean),
    ``,
    `<i>Bobby Vegas AI · Not financial advice</i>`,
  ].join('\n');
}

const HELP_TEXT = `🎲 <b>Bobby Vegas Bot Commands</b>

<b>/pick [sport] [Team A vs Team B]</b>
Get a Bobby Vegas AI analysis for any matchup.

Examples:
  /pick MLB Yankees vs Red Sox
  /pick NBA Knicks vs Spurs
  /pick soccer USA vs Portugal
  /pick NHL Hurricanes vs Golden Knights
  /pick F1 Verstappen vs Hamilton
  /pick Tennis Djokovic vs Alcaraz
  /pick Golf PGA Championship

<b>/today</b> — Today's top pick from the hottest sport
<b>/help</b> — Show this message

<b>Sports available:</b>
⚽ Soccer · 🏒 NHL · 🏀 WNBA · ⚾ MLB
🏈 NFL · 🏈 NCAAFB · 🏀 NBA · 🏎️ F1
🎾 Tennis · ⛳ Golf

<b>Free tier:</b> ${FREE_TIER_LIMIT} picks per day`;

// ── Update processor ──────────────────────────────────────────────────────────
async function handleUpdate(update) {
  const message = update.message ?? update.edited_message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const userId = String(message.from?.id ?? chatId);
  const text   = message.text.trim();

  // /help
  if (text.startsWith('/help') || text.startsWith('/start')) {
    await sendMessage(chatId, HELP_TEXT);
    return;
  }

  // /today
  if (text.startsWith('/today')) {
    const { used, limit } = checkRateLimit(userId);
    if (used >= limit) {
      await sendMessage(chatId, `⛔ You've used all ${limit} free picks today. Come back tomorrow!`);
      return;
    }
    await sendTyping(chatId);
    await sendMessage(chatId, '📡 Finding today\'s top game and firing up Bobby…');
    try {
      const pick = await getTodayTopPick();
      if (!pick) {
        await sendMessage(chatId, '😴 No games found today across any active sport.');
        return;
      }
      await sendTyping(chatId);
      const analysis = await getBobbyPick(pick.sport, pick.teams, pick.team1, pick.team2);
      incrementUsage(userId);
      const { used: nowUsed, limit: lim } = checkRateLimit(userId);
      const footer = `\n\n📊 ${lim - nowUsed} of ${lim} free picks remaining today`;
      await sendMessage(chatId, formatPick(pick.sport, pick.teams, analysis) + footer);
    } catch (err) {
      await sendMessage(chatId, `❌ Error: ${esc(err.message)}`);
    }
    return;
  }

  // /pick
  if (text.startsWith('/pick')) {
    const { allowed, used, limit } = checkRateLimit(userId);
    if (!allowed) {
      await sendMessage(chatId,
        `⛔ You've used all ${limit} free picks for today.\n\n` +
        `Come back tomorrow, or upgrade to Bobby Vegas Premium for unlimited picks.`
      );
      return;
    }

    const parsed = parsePickCommand(text);
    if (!parsed) {
      await sendMessage(chatId,
        `❓ Couldn't parse that pick.\n\nTry: <code>/pick MLB Yankees vs Red Sox</code>\n\n/help for all commands.`
      );
      return;
    }

    const { sport, teams, team1, team2 } = parsed;
    await sendTyping(chatId);
    await sendMessage(chatId,
      `${sport.emoji} <b>Asking Bobby about ${esc(teams)}…</b>\n\n` +
      `⏳ ${sport.isF1 ? 'F1 picks take ~30s (Supabase async). Hang tight.' : 'Analyzing data, usually 15–30s.'}`
    );

    try {
      const analysis = await getBobbyPick(sport, teams, team1, team2);
      incrementUsage(userId);
      const { used: nowUsed, limit: lim } = checkRateLimit(userId);
      const footer = `\n\n📊 ${lim - nowUsed} of ${lim} free picks remaining today`;
      await sendMessage(chatId, formatPick(sport, teams, analysis) + footer);
    } catch (err) {
      await sendMessage(chatId, `❌ Bobby's having trouble with that one: ${esc(err.message)}`);
    }
    return;
  }

  // Unrecognized
  await sendMessage(chatId, `👋 I'm Bobby Vegas Bot. Type /help to see what I can do.`);
}

// ── Long-poll loop ────────────────────────────────────────────────────────────
async function startPolling() {
  console.log('[BobbyBot] Starting Telegram long-poll loop...');
  let offset = 0;

  while (true) {
    try {
      const res = await fetch(
        `${TG_BASE}/getUpdates?timeout=30&offset=${offset}`,
        { signal: AbortSignal.timeout(40_000) }
      );
      const data = await res.json();
      if (!data.ok) {
        console.error('[BobbyBot] getUpdates error:', data.description);
        await new Promise((r) => setTimeout(r, 5_000));
        continue;
      }

      for (const update of data.result ?? []) {
        offset = update.update_id + 1;
        handleUpdate(update).catch((err) => {
          console.error('[BobbyBot] Update handler error:', err.message);
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[BobbyBot] Poll error:', err.message);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }
}

startPolling();
