#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       NanoClaw Social Media Agent — Bobby Vegas                 ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PARKED — Do NOT activate until API credentials are configured. ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Posts Bobby Vegas picks to Reddit, Discord, and Twitter/X.
 * Monitors engagement 2 hours after posting, handles win/loss follow-ups.
 *
 * Triggers:
 *   • Programmatic: import { postPicks } from './social-media-agent.js'
 *     then call postPicks(results) with the cron results array
 *   • Telegram bot commands (runs as standalone process):
 *       /post today                       — fetch & post all today's picks
 *       /post MLB Cardinals vs Royals     — post specific matchup
 *       /result MLB W                     — log win + post follow-up card
 *       /result NHL L                     — log loss + post honest L
 *       /social status                    — today's posting summary
 *
 * Required env vars (.env):
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 *   DISCORD_BOT_TOKEN
 *   TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHmac } from 'crypto';

// ── Env ──────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
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

const ENV = {
  REDDIT_CLIENT_ID:        process.env.REDDIT_CLIENT_ID        ?? '',
  REDDIT_CLIENT_SECRET:    process.env.REDDIT_CLIENT_SECRET    ?? '',
  REDDIT_USERNAME:         process.env.REDDIT_USERNAME         ?? '',
  REDDIT_PASSWORD:         process.env.REDDIT_PASSWORD         ?? '',
  DISCORD_BOT_TOKEN:       process.env.DISCORD_BOT_TOKEN       ?? '',
  TWITTER_API_KEY:         process.env.TWITTER_API_KEY         ?? '',
  TWITTER_API_SECRET:      process.env.TWITTER_API_SECRET      ?? '',
  TWITTER_ACCESS_TOKEN:    process.env.TWITTER_ACCESS_TOKEN    ?? '',
  TWITTER_ACCESS_SECRET:   process.env.TWITTER_ACCESS_SECRET   ?? '',
  INSTAGRAM_ACCESS_TOKEN:  process.env.INSTAGRAM_ACCESS_TOKEN  ?? '',
  INSTAGRAM_USER_ID:       process.env.INSTAGRAM_USER_ID       ?? '',
  YOUTUBE_API_KEY:         process.env.YOUTUBE_API_KEY         ?? '',
  YOUTUBE_CHANNEL_ID:      process.env.YOUTUBE_CHANNEL_ID      ?? '',
  TELEGRAM_BOT_TOKEN:      process.env.TELEGRAM_BOT_TOKEN      ?? '',
  TELEGRAM_CHAT_ID:        process.env.TELEGRAM_CHAT_ID        ?? '5110528412',
};

const SUPABASE_URL      = 'https://mocdziwqxbvjibylqxoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2R6aXdxeGJ2amlieWxxeG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzU3MzUsImV4cCI6MjA4Njk1MTczNX0.2nRMRP55DYk8a5WRdK6NHTn4fADmiGH99kqbWo2TquI';
const APP_STORE_URL     = 'https://apps.apple.com/app/bobby-vegas-ai-sports-picks/id6767071941';
const DISCLAIMER        = '🔞 18+. Gambling involves risk. Not financial advice.';

// ── Platform config ───────────────────────────────────────────────────────────
const REDDIT_SUBREDDITS = {
  MLB:    ['sportsbook', 'baseball'],
  NHL:    ['sportsbook', 'hockey'],
  NBA:    ['sportsbook', 'nba'],
  WNBA:   ['sportsbook', 'wnba'],
  NFL:    ['sportsbook', 'nfl'],
  NCAAFB: ['sportsbook', 'CFB'],
  Soccer: ['sportsbook', 'soccer'],
  F1:     ['sportsbook', 'formula1'],
  Tennis: ['sportsbook', 'tennis'],
  Golf:   ['sportsbook', 'golf'],
};

const DISCORD_CHANNELS = {
  // Fill in real channel IDs after creating bot and inviting to server
  MLB:    process.env.DISCORD_CHANNEL_MLB    ?? '0000000000000000001',
  NHL:    process.env.DISCORD_CHANNEL_NHL    ?? '0000000000000000002',
  NBA:    process.env.DISCORD_CHANNEL_NBA    ?? '0000000000000000003',
  WNBA:   process.env.DISCORD_CHANNEL_WNBA   ?? '0000000000000000004',
  NFL:    process.env.DISCORD_CHANNEL_NFL    ?? '0000000000000000005',
  NCAAFB: process.env.DISCORD_CHANNEL_NCAAFB ?? '0000000000000000006',
  Soccer: process.env.DISCORD_CHANNEL_SOCCER ?? '0000000000000000007',
  F1:     process.env.DISCORD_CHANNEL_F1     ?? '0000000000000000008',
  Tennis: process.env.DISCORD_CHANNEL_TENNIS ?? '0000000000000000009',
  Golf:   process.env.DISCORD_CHANNEL_GOLF   ?? '0000000000000000010',
  general:'0000000000000000000',
};

// Twitter hashtags (character-limited)
const SPORT_HASHTAGS = {
  MLB:    '#MLB #Baseball #SportsBetting',
  NHL:    '#NHL #Hockey #SportsBetting',
  NBA:    '#NBA #Basketball #SportsBetting',
  WNBA:   '#WNBA #Basketball #SportsBetting',
  NFL:    '#NFL #Football #SportsBetting',
  NCAAFB: '#CFB #CollegeFootball #SportsBetting',
  Soccer: '#Soccer #Football #SportsBetting',
  F1:     '#F1 #Formula1 #SportsBetting',
  Tennis: '#Tennis #ATP #SportsBetting',
  Golf:   '#Golf #PGA #SportsBetting',
};

// Instagram hashtags (30-tag limit, broader reach)
const IG_HASHTAGS = {
  MLB:    '#MLB #Baseball #SportsBetting #BettingPicks #BobbyVegas #AIBetting #BaseballBetting #MLBpicks #SportsPicks #ValueBets #SharpBetting',
  NHL:    '#NHL #Hockey #SportsBetting #BettingPicks #BobbyVegas #AIBetting #HockeyBetting #NHLpicks #SportsPicks #ValueBets #SharpBetting',
  NBA:    '#NBA #Basketball #SportsBetting #BettingPicks #BobbyVegas #AIBetting #NBABetting #NBApicks #SportsPicks #ValueBets #SharpBetting',
  WNBA:   '#WNBA #Basketball #SportsBetting #BettingPicks #BobbyVegas #AIBetting #WNBABetting #WNBApicks #SportsPicks #ValueBets #SharpBetting',
  NFL:    '#NFL #Football #SportsBetting #BettingPicks #BobbyVegas #AIBetting #NFLBetting #NFLpicks #SportsPicks #ValueBets #SharpBetting',
  NCAAFB: '#CFB #CollegeFootball #SportsBetting #BettingPicks #BobbyVegas #AIBetting #CollegeFootballBetting #SportsPicks #ValueBets #SharpBetting',
  Soccer: '#Soccer #Football #SportsBetting #BettingPicks #BobbyVegas #AIBetting #SoccerBetting #SoccerPicks #SportsPicks #ValueBets #SharpBetting',
  F1:     '#F1 #Formula1 #SportsBetting #BettingPicks #BobbyVegas #AIBetting #F1Betting #Formula1Picks #SportsPicks #ValueBets #SharpBetting',
  Tennis: '#Tennis #ATP #WTA #SportsBetting #BettingPicks #BobbyVegas #AIBetting #TennisBetting #TennisPicks #SportsPicks #ValueBets',
  Golf:   '#Golf #PGA #SportsBetting #BettingPicks #BobbyVegas #AIBetting #GolfBetting #GolfPicks #SportsPicks #ValueBets #SharpBetting',
};

// YouTube Shorts tags (500 char limit on tags)
const YT_TAGS = {
  MLB:    'MLB, baseball betting, sports picks, Bobby Vegas, AI sports betting, MLB picks today, betting tips',
  NHL:    'NHL, hockey betting, sports picks, Bobby Vegas, AI sports betting, NHL picks today, betting tips',
  NBA:    'NBA, basketball betting, sports picks, Bobby Vegas, AI sports betting, NBA picks today, betting tips',
  WNBA:   'WNBA, basketball betting, sports picks, Bobby Vegas, AI sports betting, WNBA picks today, betting tips',
  NFL:    'NFL, football betting, sports picks, Bobby Vegas, AI sports betting, NFL picks today, betting tips',
  NCAAFB: 'college football, CFB betting, sports picks, Bobby Vegas, AI sports betting, NCAAFB picks, betting tips',
  Soccer: 'soccer betting, football picks, sports picks, Bobby Vegas, AI sports betting, soccer picks today, betting tips',
  F1:     'F1 betting, Formula 1, sports picks, Bobby Vegas, AI sports betting, F1 picks today, racing tips',
  Tennis: 'tennis betting, ATP betting, sports picks, Bobby Vegas, AI sports betting, tennis picks today, betting tips',
  Golf:   'golf betting, PGA betting, sports picks, Bobby Vegas, AI sports betting, golf picks today, betting tips',
};

// Bobby Vegas webhook URLs (for manual Telegram triggers)
const BOBBY_WEBHOOKS = {
  Soccer:  'https://eleven48ai.app.n8n.cloud/webhook/soccer-picks',
  NHL:     'https://eleven48ai.app.n8n.cloud/webhook/nhl-picks',
  WNBA:    'https://eleven48ai.app.n8n.cloud/webhook/wnba-picks',
  MLB:     'https://eleven48ai.app.n8n.cloud/webhook/mlb-picks',
  NFL:     'https://eleven48ai.app.n8n.cloud/webhook/nfl-picks',
  NCAAFB:  'https://eleven48ai.app.n8n.cloud/webhook/ncaafb-picks',
  NBA:     'https://eleven48ai.app.n8n.cloud/webhook/nba-picks',
  F1:      'https://eleven48ai.app.n8n.cloud/webhook/f1-picks',
  Tennis:  'https://eleven48ai.app.n8n.cloud/webhook/tennis-picks',
  Golf:    'https://eleven48ai.app.n8n.cloud/webhook/golf-picks',
};

// ── Content formatter ─────────────────────────────────────────────────────────
function stripMarkdown(raw) {
  return (raw ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}\s/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function extractPick(analysis) {
  const text = stripMarkdown(analysis);

  const pickMatch = text.match(
    /(?:PICK|MY PICK|BEST BET|FINAL PICK|RECOMMENDED BET|RECOMMENDATION|WAGER)[:\s]+([A-Z][^\n!?]{5,110})/i
  );
  const actionMatch = text.match(/\b(?:Take the|Bet on|Backing|Back the|Lean toward|Go with)\s+([A-Z][^\n.!?]{5,100})/);
  const clip = (s) => s.split(/[.!?\n]|(?:\s+BET\s+TYPE|\s+CONFIDENCE|\s+REASONING)/i)[0].trim().slice(0, 100);

  let pick = null;
  if (pickMatch) pick = clip(pickMatch[1]);
  else if (actionMatch) pick = clip(actionMatch[0]);

  const confMatch = text.match(/confidence[:\s]+(high|medium|low)/i);
  const confidence = confMatch
    ? confMatch[1].charAt(0).toUpperCase() + confMatch[1].slice(1).toLowerCase()
    : null;

  const edgePctMatch = text.match(/(\d{1,2}\.?\d*)\s*%\s*(?:kalshi\s+)?edge/i);
  const edgePct = edgePctMatch?.[1] ?? null;
  const hasEdge = /EDGE\s*ALERT|kalshi\s+edge/i.test(text);

  const oddsMatch = text.match(/([+-]\d{2,4})/);
  const odds = oddsMatch?.[1] ?? null;

  return { pick, confidence, hasEdge, edgePct, odds, cleanText: text };
}

function pickId(sport, teams) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  return `${today}-${sport}-${teams}`.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Reddit ───────────────────────────────────────────────────────────────────
let redditToken = null;
let redditTokenExpiry = 0;

async function getRedditToken() {
  if (redditToken && Date.now() < redditTokenExpiry) return redditToken;
  const creds = Buffer.from(`${ENV.REDDIT_CLIENT_ID}:${ENV.REDDIT_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': `BobbyVegasBot/1.0 by u/${ENV.REDDIT_USERNAME}`,
    },
    body: `grant_type=password&username=${encodeURIComponent(ENV.REDDIT_USERNAME)}&password=${encodeURIComponent(ENV.REDDIT_PASSWORD)}`,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status}`);
  const data = await res.json();
  redditToken = data.access_token;
  redditTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return redditToken;
}

function redditTitle(sport, teams, pick, odds, confidence) {
  const oddsStr = odds ? ` ${odds}` : '';
  const pickShort = (pick ?? teams).slice(0, 60);
  return `AI called ${pickShort}${oddsStr} for tonight — ${confidence ?? 'Medium'} confidence 🎲`;
}

function redditBody(sport, teams, cleanText, edgePct, hasEdge) {
  const edge = hasEdge && edgePct ? `\n\n⚡ **KALSHI EDGE ALERT: ${edgePct}% gap detected vs sportsbook**` : '';
  return [
    `**Bobby Vegas AI Pick — ${sport}: ${teams}**`,
    edge,
    '',
    cleanText.slice(0, 10000),
    '',
    '---',
    `*${DISCLAIMER}*`,
    `*[Bobby Vegas — AI Sports Picks](${APP_STORE_URL}) | Not affiliated with any sportsbook*`,
  ].join('\n');
}

async function postToReddit(sport, teams, analysis) {
  const token = await getRedditToken();
  const { pick, confidence, hasEdge, edgePct, odds, cleanText } = extractPick(analysis);

  if (confidence === 'Low') {
    console.log(`[Reddit][${sport}] Skipping — Low confidence`);
    return [];
  }

  const subreddits = REDDIT_SUBREDDITS[sport] ?? ['sportsbook'];
  const title = redditTitle(sport, teams, pick, odds, confidence);
  const body  = redditBody(sport, teams, cleanText, edgePct, hasEdge);
  const posted = [];

  for (const sr of subreddits) {
    try {
      const res = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `BobbyVegasBot/1.0 by u/${ENV.REDDIT_USERNAME}`,
        },
        body: new URLSearchParams({
          kind: 'self', sr, title, text: body,
          nsfw: 'false', resubmit: 'true', sendreplies: 'false',
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      const postUrl = data?.jquery?.find?.(a => Array.isArray(a) && a[2] === 'call' && a[3]?.[0]?.startsWith('http'))?.[3]?.[0]
        ?? data?.data?.url
        ?? `https://reddit.com/r/${sr}`;
      const postId = data?.data?.id ?? null;
      console.log(`[Reddit] Posted to r/${sr}: ${postUrl}`);
      posted.push({ subreddit: sr, postId, postUrl });
      // Reddit rate-limit buffer between subreddits
      if (subreddits.indexOf(sr) < subreddits.length - 1) {
        await new Promise(r => setTimeout(r, 6_000));
      }
    } catch (err) {
      console.error(`[Reddit] r/${sr} failed: ${err.message}`);
    }
  }
  return posted;
}

// ── Discord ───────────────────────────────────────────────────────────────────
function discordBody(sport, teams, analysis, pick, odds, confidence, hasEdge, edgePct) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const edge = hasEdge && edgePct
    ? `\n⚡ **EDGE ALERT: ${edgePct}% Kalshi gap detected**`
    : '';
  const confColor = { High: '🟢', Medium: '🟡', Low: '🔴' }[confidence ?? 'Medium'] ?? '🟡';

  return [
    `## 🎲 Bobby Vegas — ${emoji} ${sport}: ${teams}`,
    `**Pick:** ${pick ?? '(see analysis)'}${odds ? ` \`${odds}\`` : ''}`,
    `${confColor} **Confidence:** ${confidence ?? 'Medium'}${edge}`,
    '',
    '```',
    stripMarkdown(analysis).slice(0, 1800),
    '```',
    '',
    `> ${DISCLAIMER}`,
    `> [Download Bobby Vegas](${APP_STORE_URL})`,
  ].join('\n');
}

async function postToDiscord(sport, teams, analysis) {
  const { pick, confidence, hasEdge, edgePct, odds } = extractPick(analysis);

  if (confidence === 'Low') {
    console.log(`[Discord][${sport}] Skipping — Low confidence`);
    return null;
  }

  const channelId = DISCORD_CHANNELS[sport] ?? DISCORD_CHANNELS.general;
  const content = discordBody(sport, teams, analysis, pick, odds, confidence, hasEdge, edgePct);

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Discord API ${res.status}: ${err}`);
    }
    const data = await res.json();
    const messageId = data.id;
    console.log(`[Discord] Posted to channel ${channelId}, messageId ${messageId}`);

    // React with 🎲 on own post
    await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent('🎲')}/@me`,
      {
        method: 'PUT',
        headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(5_000),
      }
    ).catch(() => {});

    return { channelId, messageId, postUrl: `https://discord.com/channels/@me/${channelId}/${messageId}` };
  } catch (err) {
    console.error(`[Discord][${sport}] Post failed: ${err.message}`);
    return null;
  }
}

// ── Twitter / X ──────────────────────────────────────────────────────────────
function pctEncode(s) {
  return encodeURIComponent(String(s))
    .replace(/!/g,'%21').replace(/'/g,'%27')
    .replace(/\(/g,'%28').replace(/\)/g,'%29').replace(/\*/g,'%2A');
}

function buildOAuth1Header(method, url) {
  const p = {
    oauth_consumer_key:     ENV.TWITTER_API_KEY,
    oauth_nonce:            Math.random().toString(36).slice(2) + Date.now().toString(36),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            ENV.TWITTER_ACCESS_TOKEN,
    oauth_version:          '1.0',
  };
  // For JSON body (not form-encoded), only OAuth params go into the base string
  const paramStr = Object.keys(p).sort().map(k => `${pctEncode(k)}=${pctEncode(p[k])}`).join('&');
  const base = [method.toUpperCase(), pctEncode(url), pctEncode(paramStr)].join('&');
  const key  = `${pctEncode(ENV.TWITTER_API_SECRET)}&${pctEncode(ENV.TWITTER_ACCESS_SECRET)}`;
  p.oauth_signature = createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.entries(p).map(([k,v]) => `${pctEncode(k)}="${pctEncode(v)}"`).join(', ');
}

function tweetText(sport, teams, pick, odds, confidence, hasEdge, edgePct) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const pickShort = (pick ?? teams).slice(0, 60);
  const oddsStr = odds ? ` ${odds}` : '';
  const edgeStr = hasEdge && edgePct ? `\n⚡ Kalshi edge: ${edgePct}% gap detected` : '';
  const hashtags = SPORT_HASHTAGS[sport] ?? '#SportsBetting';
  const conf = (confidence ?? 'Medium').toUpperCase();

  const body = [
    `🎲 Bobby Vegas: ${emoji} ${pickShort}${oddsStr}${edgeStr}`,
    `Confidence: ${conf}`,
    '',
    'Wanna win big? Bet like Bobby Vegas',
    APP_STORE_URL,
    hashtags,
  ].join('\n');

  // Trim to 280 chars
  return body.slice(0, 280);
}

async function postToTwitter(sport, teams, analysis) {
  const { pick, confidence, hasEdge, edgePct, odds } = extractPick(analysis);

  // Twitter: High confidence only
  if (confidence !== 'High') {
    console.log(`[Twitter][${sport}] Skipping — not High confidence (${confidence})`);
    return null;
  }

  const text = tweetText(sport, teams, pick, odds, confidence, hasEdge, edgePct);
  const url  = 'https://api.twitter.com/2/tweets';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: buildOAuth1Header('POST', url),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twitter API ${res.status}: ${err}`);
    }
    const data = await res.json();
    const tweetId  = data.data?.id;
    const tweetUrl = tweetId ? `https://twitter.com/i/web/status/${tweetId}` : null;
    console.log(`[Twitter] Posted: ${tweetUrl}`);
    return { tweetId, tweetUrl };
  } catch (err) {
    console.error(`[Twitter][${sport}] Post failed: ${err.message}`);
    return null;
  }
}

// ── Pick card image generator ─────────────────────────────────────────────────
// Renders a 1080×1080 pick card as HTML, screenshots with Playwright,
// uploads to Supabase Storage, and returns a public URL.
// Requires: npx playwright install chromium (one-time setup)

function pickCardHtml(sport, teams, pick, odds, confidence, hasEdge, edgePct) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const confColor = { High: '#22c55e', Medium: '#F5A100', Low: '#ef4444' }[confidence ?? 'Medium'] ?? '#F5A100';
  const edgeBadge = hasEdge && edgePct
    ? `<div style="background:#F5A100;color:#000;font-size:22px;font-weight:900;padding:10px 22px;border-radius:30px;display:inline-block;margin-top:16px;">⚡ ${edgePct}% KALSHI EDGE</div>`
    : '';
  const pickShort = (pick ?? teams).slice(0, 80);
  const oddsStr = odds ? ` <span style="color:#F5A100">${odds}</span>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1080px;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden}
  .glow{position:absolute;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(245,161,0,0.18) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none}
  .card{background:linear-gradient(160deg,#141414 0%,#1a1200 100%);border:1.5px solid rgba(245,161,0,0.4);border-radius:32px;padding:64px;width:900px;box-shadow:0 0 60px rgba(245,161,0,0.15);position:relative;z-index:1}
  .logo{display:flex;align-items:center;gap:14px;margin-bottom:40px}
  .logo-icon{font-size:44px}
  .logo-text{font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px}
  .logo-sub{font-size:15px;color:rgba(255,255,255,0.4);font-weight:500;letter-spacing:1px;text-transform:uppercase}
  .sport-badge{background:rgba(245,161,0,0.12);border:1px solid rgba(245,161,0,0.3);color:#F5A100;font-size:18px;font-weight:700;padding:8px 20px;border-radius:20px;display:inline-flex;align-items:center;gap:8px;margin-bottom:24px;letter-spacing:0.5px;text-transform:uppercase}
  .teams{font-size:34px;font-weight:700;color:rgba(255,255,255,0.6);margin-bottom:32px;line-height:1.2}
  .pick{font-size:52px;font-weight:900;color:#fff;line-height:1.15;margin-bottom:24px}
  .conf{font-size:20px;font-weight:700;padding:10px 24px;border-radius:30px;display:inline-flex;align-items:center;gap:8px;border:1.5px solid}
  .divider{width:100%;height:1px;background:rgba(255,255,255,0.08);margin:32px 0}
  .footer{display:flex;justify-content:space-between;align-items:center}
  .disclaimer{font-size:13px;color:rgba(255,255,255,0.25)}
  .app-link{font-size:15px;color:#F5A100;font-weight:600}
</style></head><body>
<div class="glow"></div>
<div class="card">
  <div class="logo">
    <span class="logo-icon">🎲</span>
    <div><div class="logo-text">Bobby Vegas</div><div class="logo-sub">AI Sports Picks</div></div>
  </div>
  <div class="sport-badge">${emoji} ${sport}</div>
  <div class="teams">${teams}</div>
  <div class="pick">${pickShort}${oddsStr}</div>
  ${edgeBadge}
  <div style="margin-top:${edgeBadge ? '24px' : '0'}">
    <span class="conf" style="color:${confColor};border-color:${confColor}22;background:${confColor}15">
      ${confidence === 'High' ? '🔥' : confidence === 'Medium' ? '⚡' : '📊'} ${confidence ?? 'Medium'} Confidence
    </span>
  </div>
  <div class="divider"></div>
  <div class="footer">
    <span class="disclaimer">🔞 18+ · Not financial advice</span>
    <span class="app-link">Bobby Vegas App ↗</span>
  </div>
</div>
</body></html>`;
}

async function screenshotPickCard(html) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1080, height: 1080 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    await browser.close();
    return buffer;
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('playwright')) {
      throw new Error('Playwright not installed. Run: npx playwright install chromium');
    }
    throw err;
  }
}

async function uploadToSupabaseStorage(buffer, path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/pick-cards/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'image/png',
      'Cache-Control': '3600',
    },
    body: buffer,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    // Try UPSERT if object already exists
    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/pick-cards/${path}`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: buffer,
      signal: AbortSignal.timeout(30_000),
    });
    if (!upRes.ok) throw new Error(`Supabase Storage upload failed: ${upRes.status}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/pick-cards/${path}`;
}

async function generatePickCardUrl(sport, teams, pick, odds, confidence, hasEdge, edgePct) {
  const html = pickCardHtml(sport, teams, pick, odds, confidence, hasEdge, edgePct);
  const buffer = await screenshotPickCard(html);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const safeName = teams.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const path = `${today}/${sport}/${safeName}.png`;
  return uploadToSupabaseStorage(buffer, path);
}

// ── Instagram ─────────────────────────────────────────────────────────────────
// Uses Facebook Graph API (Instagram Graph API).
// Requires: Instagram Business/Creator account linked to a Facebook Page.
// Permissions needed: instagram_content_publish, instagram_basic
// Setup: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

function igCaption(sport, teams, pick, odds, confidence, hasEdge, edgePct) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const oddsStr = odds ? ` ${odds}` : '';
  const edge = hasEdge && edgePct ? `\n⚡ Kalshi edge alert: ${edgePct}% gap vs sportsbook` : '';
  const conf = (confidence ?? 'Medium').toUpperCase();
  const tags = IG_HASHTAGS[sport] ?? '#SportsBetting #BobbyVegas #AIBetting';

  return [
    `🎲 Bobby Vegas AI Pick`,
    `${emoji} ${sport}: ${teams}`,
    ``,
    `Pick: ${(pick ?? teams).slice(0, 100)}${oddsStr}${edge}`,
    `Confidence: ${conf}`,
    ``,
    `Download Bobby Vegas 👇`,
    APP_STORE_URL,
    ``,
    DISCLAIMER,
    ``,
    tags,
  ].join('\n');
}

async function postToInstagramFeed(sport, teams, analysis) {
  if (!ENV.INSTAGRAM_ACCESS_TOKEN || !ENV.INSTAGRAM_USER_ID) return null;
  const { pick, confidence, hasEdge, edgePct, odds } = extractPick(analysis);

  if (confidence === 'Low') {
    console.log(`[Instagram][${sport}] Skipping feed — Low confidence`);
    return null;
  }

  const IG_BASE = `https://graph.facebook.com/v18.0/${ENV.INSTAGRAM_USER_ID}`;
  const caption = igCaption(sport, teams, pick, odds, confidence, hasEdge, edgePct);

  let imageUrl;
  try {
    imageUrl = await generatePickCardUrl(sport, teams, pick, odds, confidence, hasEdge, edgePct);
    console.log(`[Instagram] Card uploaded: ${imageUrl}`);
  } catch (err) {
    console.error(`[Instagram] Card generation failed: ${err.message}`);
    return null;
  }

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${IG_BASE}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: ENV.INSTAGRAM_ACCESS_TOKEN,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!containerRes.ok) throw new Error(`IG container ${containerRes.status}: ${await containerRes.text()}`);
    const { id: creationId } = await containerRes.json();

    // Step 2: Wait for media to process (Instagram needs a moment)
    await new Promise(r => setTimeout(r, 5_000));

    // Step 3: Publish
    const publishRes = await fetch(`${IG_BASE}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: ENV.INSTAGRAM_ACCESS_TOKEN }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!publishRes.ok) throw new Error(`IG publish ${publishRes.status}: ${await publishRes.text()}`);
    const { id: postId } = await publishRes.json();
    const postUrl = `https://www.instagram.com/p/${postId}/`;
    console.log(`[Instagram] Feed post published: ${postUrl}`);
    return { postId, postUrl, imageUrl };
  } catch (err) {
    console.error(`[Instagram][${sport}] Feed post failed: ${err.message}`);
    return null;
  }
}

async function postToInstagramStory(sport, teams, analysis) {
  if (!ENV.INSTAGRAM_ACCESS_TOKEN || !ENV.INSTAGRAM_USER_ID) return null;
  const { pick, confidence, hasEdge, edgePct, odds } = extractPick(analysis);

  // Stories: post for all Medium+ confidence picks
  if (confidence === 'Low') return null;

  const IG_BASE = `https://graph.facebook.com/v18.0/${ENV.INSTAGRAM_USER_ID}`;

  // Stories use the same image but different container type
  // Generate a portrait (1080x1920) version for Stories — we reuse the 1080x1080 card
  // and Instagram crops/pads it automatically
  let imageUrl;
  try {
    imageUrl = await generatePickCardUrl(sport, teams, pick, odds, confidence, hasEdge, edgePct);
  } catch (err) {
    console.error(`[Instagram Story] Card failed: ${err.message}`);
    return null;
  }

  try {
    const containerRes = await fetch(`${IG_BASE}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        media_type: 'STORIES',
        access_token: ENV.INSTAGRAM_ACCESS_TOKEN,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!containerRes.ok) throw new Error(`IG Story container ${containerRes.status}`);
    const { id: creationId } = await containerRes.json();

    await new Promise(r => setTimeout(r, 4_000));

    const publishRes = await fetch(`${IG_BASE}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: ENV.INSTAGRAM_ACCESS_TOKEN }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!publishRes.ok) throw new Error(`IG Story publish ${publishRes.status}`);
    const { id: storyId } = await publishRes.json();
    console.log(`[Instagram] Story published: ${storyId}`);
    return { storyId };
  } catch (err) {
    console.error(`[Instagram][${sport}] Story failed: ${err.message}`);
    return null;
  }
}

async function fetchInstagramInsights(postId) {
  if (!ENV.INSTAGRAM_ACCESS_TOKEN) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=impressions,reach,likes,comments,saves&access_token=${ENV.INSTAGRAM_ACCESS_TOKEN}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const metrics = {};
    for (const m of data.data ?? []) metrics[m.name] = m.values?.[0]?.value ?? 0;
    return metrics;
  } catch (_) { return null; }
}

// ── YouTube Shorts ────────────────────────────────────────────────────────────
// YouTube Data API v3 requires OAuth 2.0 (not API key) to upload videos.
// This module generates the complete script, title, description, and tags
// for a 45–60s Short, then sends it to Telegram for manual filming and upload.
//
// When YOUTUBE_API_KEY is set, it also validates the channel exists and
// prepares the upload metadata ready for use with the YouTube resumable upload API.
// Full upload requires YOUTUBE_OAUTH_TOKEN (OAuth 2.0 access token).

function generateYouTubeScript(sport, teams, pick, odds, confidence, hasEdge, edgePct, cleanText) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const oddsStr = odds ? ` ${odds}` : '';
  const confWord = (confidence ?? 'Medium').toUpperCase();
  const edgeLine = hasEdge && edgePct ? `There's a ${edgePct}% edge gap in the prediction markets. The smart money agrees. ` : '';

  // Extract key reasoning points from analysis (first 3 sentences after stripping)
  const sentences = cleanText.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 4);

  return {
    title: `🎲 Bobby Vegas: ${pick ? pick.slice(0, 40) : teams.slice(0, 40)}${oddsStr} — ${confWord} confidence`,
    description: [
      `Bobby Vegas AI called it: ${emoji} ${sport} — ${teams}`,
      ``,
      `Pick: ${pick ?? teams}${oddsStr}`,
      hasEdge && edgePct ? `⚡ Kalshi Edge Alert: ${edgePct}% gap detected` : '',
      `Confidence: ${confidence ?? 'Medium'}`,
      ``,
      `Want Bobby Vegas picks every day?`,
      `📲 Download the app: ${APP_STORE_URL}`,
      ``,
      `Chapters:`,
      `0:00 - The pick`,
      `0:10 - Why this bet`,
      `0:30 - Confidence & edge`,
      `0:50 - Download Bobby Vegas`,
      ``,
      `${DISCLAIMER}`,
      ``,
      YT_TAGS[sport] ?? 'sports betting, Bobby Vegas, AI picks',
    ].filter(l => l !== null).join('\n'),
    tags: (YT_TAGS[sport] ?? 'sports betting, Bobby Vegas, AI picks').split(', '),
    categoryId: '17', // Sports
    script: [
      `[HOOK — 0:00–0:05]`,
      `"${pick ? pick.slice(0, 70) : teams}${oddsStr} — Bobby Vegas called it. Here's why."`,
      ``,
      `[MATCHUP — 0:05–0:15]`,
      `${emoji} Today's game: ${teams}`,
      `Bobby's pick: ${pick ?? teams}${oddsStr}`,
      ``,
      `[REASONING — 0:15–0:35]`,
      ...sentences.map((s, i) => `Point ${i + 1}: ${s}.`),
      ``,
      `[EDGE — 0:35–0:45]`,
      edgeLine ? edgeLine : `Bobby's confidence level: ${confWord}.`,
      ``,
      `[CTA — 0:45–0:55]`,
      `"Want picks like this every day? Download Bobby Vegas — AI Sports Picks — link in bio."`,
      `[Show App Store button / QR code]`,
      ``,
      `[OUTRO — 0:55–1:00]`,
      `"Bobby Vegas. Bet smarter."`,
      ``,
      `--- PRODUCTION NOTES ---`,
      `Format: Vertical (9:16), 1080x1920`,
      `Duration: 45–60 seconds`,
      `Captions: Auto-generate via YouTube or CapCut`,
      `B-roll: Stock footage of ${sport} gameplay, stadium, scoreboard`,
      `Overlay: Animate the pick card (see parked/social-media-agent.js pickCardHtml)`,
      `Music: Royalty-free hype beat, low volume`,
    ].join('\n'),
  };
}

async function queueYouTubeShort(sport, teams, analysis) {
  const { pick, confidence, hasEdge, edgePct, odds, cleanText } = extractPick(analysis);

  // YouTube: High confidence only (premium content)
  if (confidence !== 'High') {
    console.log(`[YouTube][${sport}] Skipping — not High confidence`);
    return null;
  }

  const meta = generateYouTubeScript(sport, teams, pick, odds, confidence, hasEdge, edgePct, cleanText);

  // Send ready-to-film brief to Telegram
  const msg = [
    `🎬 <b>YouTube Shorts Brief — Ready to Film</b>`,
    ``,
    `<b>Title:</b> ${meta.title}`,
    `<b>Sport:</b> ${sport} | ${teams}`,
    `<b>Pick:</b> ${pick ?? teams}${odds ? ` ${odds}` : ''}`,
    `<b>Confidence:</b> ${confidence}`,
    hasEdge && edgePct ? `<b>Edge:</b> ⚡ ${edgePct}% Kalshi gap` : '',
    ``,
    `<b>Script preview:</b>`,
    `<code>${meta.script.split('\n').slice(0, 12).join('\n')}</code>`,
    ``,
    `📁 Full script + description saved to Supabase youtube_queue table.`,
    `📲 Upload at: <a href="https://studio.youtube.com">YouTube Studio</a>`,
  ].filter(Boolean).join('\n');

  await sendTelegram(msg).catch(console.error);

  // Log to Supabase youtube_queue table for the human to action
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/youtube_queue`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        sport,
        teams,
        pick_summary: pick ?? teams,
        confidence,
        has_edge: hasEdge,
        edge_pct: edgePct ? parseFloat(edgePct) : null,
        yt_title: meta.title,
        yt_description: meta.description,
        yt_tags: meta.tags,
        yt_script: meta.script,
        created_at: new Date().toISOString(),
        uploaded: false,
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (_) {}

  console.log(`[YouTube] Script queued for ${sport}: ${teams}`);
  return { queued: true, title: meta.title };
}

// ── Central content formatter ─────────────────────────────────────────────────
// Formats a single pick for all 7 platforms at once.
function formatForAllPlatforms(sport, teams, analysis) {
  const { pick, confidence, hasEdge, edgePct, odds, cleanText } = extractPick(analysis);
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  const oddsStr = odds ? ` ${odds}` : '';
  const edgeNote = hasEdge && edgePct ? ` (${edgePct}% Kalshi edge)` : '';

  return {
    reddit: {
      title: `AI called ${(pick ?? teams).slice(0, 60)}${oddsStr} for tonight — ${confidence ?? 'Medium'} confidence 🎲`,
      body: redditBody(sport, teams, cleanText, edgePct, hasEdge),
    },
    discord: discordBody(sport, teams, analysis, pick, odds, confidence, hasEdge, edgePct),
    twitter: tweetText(sport, teams, pick, odds, confidence, hasEdge, edgePct),
    instagram: {
      caption: igCaption(sport, teams, pick, odds, confidence, hasEdge, edgePct),
      imageHtml: pickCardHtml(sport, teams, pick, odds, confidence, hasEdge, edgePct),
    },
    youtube: generateYouTubeScript(sport, teams, pick, odds, confidence, hasEdge, edgePct, cleanText),
    telegram: `${emoji} <b>${sport}:</b> ${teams}\n🎯 Pick: ${(pick ?? teams).slice(0, 100)}${oddsStr}${edgeNote}\n🔥 Confidence: ${confidence ?? 'Medium'}`,
    meta: { pick, confidence, hasEdge, edgePct, odds, cleanText },
  };
}

// ── Supabase social_posts log ─────────────────────────────────────────────────
const SB_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function alreadyPosted(id) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/social_posts?pick_id=eq.${encodeURIComponent(id)}&select=id`,
      { headers: SB_HEADERS, signal: AbortSignal.timeout(5_000) }
    );
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (_) { return false; }
}

async function logPost(record) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/social_posts`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.error('[Supabase] Log failed:', err.message);
  }
}

async function updatePostResult(pickId, result) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/social_posts?pick_id=eq.${encodeURIComponent(pickId)}`,
      {
        method: 'PATCH',
        headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({ result, result_posted: false, updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(8_000),
      }
    );
  } catch (err) {
    console.error('[Supabase] Result update failed:', err.message);
  }
}

async function getLastPost(sport) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/social_posts?sport=eq.${encodeURIComponent(sport)}&order=posted_at.desc&limit=1&select=*`,
      { headers: SB_HEADERS, signal: AbortSignal.timeout(5_000) }
    );
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : null;
  } catch (_) { return null; }
}

// ── Engagement monitor ────────────────────────────────────────────────────────
async function fetchRedditEngagement(postId, subreddit) {
  try {
    const token = await getRedditToken();
    const res = await fetch(`https://oauth.reddit.com/r/${subreddit}/comments/${postId}?limit=1`, {
      headers: {
        Authorization: `bearer ${token}`,
        'User-Agent': `BobbyVegasBot/1.0 by u/${ENV.REDDIT_USERNAME}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    const post = data?.[0]?.data?.children?.[0]?.data ?? {};
    return { upvotes: post.ups ?? 0, comments: post.num_comments ?? 0, ratio: post.upvote_ratio ?? 0 };
  } catch (_) { return { upvotes: 0, comments: 0, ratio: 0 }; }
}

async function fetchDiscordReactions(channelId, messageId) {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent('🎲')}?limit=100`,
      { headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}` }, signal: AbortSignal.timeout(8_000) }
    );
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch (_) { return 0; }
}

async function fetchTwitterMetrics(tweetId) {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`;
    const res = await fetch(url, {
      headers: { Authorization: buildOAuth1Header('GET', url) },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    const m = data?.data?.public_metrics ?? {};
    return { impressions: m.impression_count ?? 0, likes: m.like_count ?? 0, retweets: m.retweet_count ?? 0, replies: m.reply_count ?? 0 };
  } catch (_) { return { impressions: 0, likes: 0, retweets: 0, replies: 0 }; }
}

async function scheduleEngagementCheck(logRecord) {
  setTimeout(async () => {
    console.log(`[Engagement] Checking engagement for pick: ${logRecord.pick_id}`);
    const report = { reddit: null, discord: null, twitter: null, instagram: null };

    if (logRecord.reddit_posts?.length > 0) {
      const r = logRecord.reddit_posts[0];
      report.reddit = await fetchRedditEngagement(r.postId, r.subreddit);
    }
    if (logRecord.discord_message_id) {
      report.discord = { reactions: await fetchDiscordReactions(logRecord.discord_channel_id, logRecord.discord_message_id) };
    }
    if (logRecord.twitter_tweet_id) {
      report.twitter = await fetchTwitterMetrics(logRecord.twitter_tweet_id);
    }
    if (logRecord.instagram_post_id) {
      report.instagram = await fetchInstagramInsights(logRecord.instagram_post_id);
    }

    // Update Supabase
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/social_posts?pick_id=eq.${encodeURIComponent(logRecord.pick_id)}`,
        {
          method: 'PATCH',
          headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
          body: JSON.stringify({ engagement_checked: true, engagement_data: report }),
          signal: AbortSignal.timeout(8_000),
        }
      );
    } catch (_) {}

    // Send Telegram summary
    const redditLine  = report.reddit  ? `Reddit: ${report.reddit.upvotes} upvotes, ${report.reddit.comments} comments` : null;
    const discordLine = report.discord ? `Discord: ${report.discord.reactions} reactions` : null;
    const twitterLine = report.twitter ? `Twitter: ${report.twitter.impressions} impressions, ${report.twitter.likes} likes` : null;
    const igLine      = report.instagram
      ? `Instagram: ${report.instagram.impressions ?? 0} impressions, ${report.instagram.likes ?? 0} likes, ${report.instagram.saves ?? 0} saves`
      : logRecord.instagram_post_id ? `Instagram: metrics pending` : null;

    const msg = [
      `📊 Bobby Vegas Social Report`,
      `🎯 Pick: ${logRecord.sport} — ${logRecord.teams}`,
      '',
      ...[redditLine, discordLine, twitterLine, igLine].filter(Boolean),
    ].join('\n');

    await sendTelegram(msg).catch(console.error);
    console.log('[Engagement] Report sent to Telegram.');
  }, 2 * 60 * 60 * 1000); // 2 hours
}

// ── Win/Loss follow-up ────────────────────────────────────────────────────────
function winCard(sport, teams, pick, odds) {
  const emoji = { MLB:'⚾',NHL:'🏒',NBA:'🏀',WNBA:'🏀',NFL:'🏈',NCAAFB:'🏈',Soccer:'⚽',F1:'🏎️',Tennis:'🎾',Golf:'⛳' }[sport] ?? '🎲';
  return `🏆 **BOBBY VEGAS HIT IT** 🏆\n\n${emoji} ${sport}: ${teams}\n✅ Pick: ${pick ?? teams}${odds ? ` ${odds}` : ''}\n\nBobby's public record is growing. 🎲\n${APP_STORE_URL}`;
}

function lossCard(sport, teams, pick) {
  return `📋 Honest Bobby Vegas L\n\n${sport}: ${teams}\n❌ ${pick ?? teams} didn't cover tonight.\n\nEvery sharp takes Ls. The edge holds long-term. Bobby's back tomorrow. 🎲\n${APP_STORE_URL}`;
}

async function postResultFollowUp(sport, result) {
  const lastPost = await getLastPost(sport);
  if (!lastPost) {
    console.log(`[Result] No prior post found for ${sport}`);
    return;
  }

  const isWin = result.toUpperCase() === 'W';
  const card  = isWin
    ? winCard(sport, lastPost.teams, lastPost.pick_summary, null)
    : lossCard(sport, lastPost.teams, lastPost.pick_summary);

  await updatePostResult(lastPost.pick_id, isWin ? 'W' : 'L');

  // Post to Discord
  if (lastPost.discord_channel_id) {
    await fetch(`https://discord.com/api/v10/channels/${lastPost.discord_channel_id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${ENV.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: card }),
      signal: AbortSignal.timeout(10_000),
    }).catch(console.error);
  }

  // Tweet if win (wins get amplified)
  if (isWin) {
    const tweetBody = `🏆 Bobby Vegas WIN ✅\n${sport}: ${lastPost.teams}\n${lastPost.pick_summary}\n\nBobby stays sharp. 🎲\n${APP_STORE_URL}\n${SPORT_HASHTAGS[sport] ?? '#SportsBetting'}`.slice(0, 280);
    const url = 'https://api.twitter.com/2/tweets';
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: buildOAuth1Header('POST', url), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: tweetBody }),
      signal: AbortSignal.timeout(15_000),
    }).catch(console.error);
  }

  await sendTelegram(`${isWin ? '✅' : '❌'} Logged ${isWin ? 'WIN' : 'LOSS'} for ${sport}: ${lastPost.teams}. Follow-up posted to social.`);
  console.log(`[Result] ${isWin ? 'Win' : 'Loss'} follow-up complete for ${sport}`);
}

// ── Main post orchestrator ────────────────────────────────────────────────────
/**
 * postPicks — main entry point.
 * Call this from test-bobby-cron.js with the results array.
 * Each result: { sport: { key, emoji }, game: { teams, team1, team2 }, parsed: { pick, confidence, hasEdge, edgePct }, error }
 */
export async function postPicks(results) {
  console.log(`\n[SocialAgent] Posting ${results.length} picks to social media...`);

  for (const r of results) {
    if (r.error || !r.rawAnalysis) {
      console.log(`[SocialAgent] Skipping ${r.sport.key} — no analysis`);
      continue;
    }

    const sport   = r.sport.key;
    const teams   = r.game.teams;
    const analysis = r.rawAnalysis;
    const { pick, confidence, hasEdge, edgePct, odds } = r.parsed;
    const id = pickId(sport, teams);

    // Dedup check
    if (await alreadyPosted(id)) {
      console.log(`[SocialAgent] ${sport} already posted today — skipping`);
      continue;
    }

    console.log(`\n[SocialAgent] Posting ${sport}: ${teams}`);

    const [redditPosts, discordResult, twitterResult, igFeedResult, igStoryResult] = await Promise.allSettled([
      ENV.REDDIT_CLIENT_ID         ? postToReddit(sport, teams, analysis)          : Promise.resolve([]),
      ENV.DISCORD_BOT_TOKEN        ? postToDiscord(sport, teams, analysis)         : Promise.resolve(null),
      ENV.TWITTER_API_KEY          ? postToTwitter(sport, teams, analysis)         : Promise.resolve(null),
      ENV.INSTAGRAM_ACCESS_TOKEN   ? postToInstagramFeed(sport, teams, analysis)   : Promise.resolve(null),
      ENV.INSTAGRAM_ACCESS_TOKEN   ? postToInstagramStory(sport, teams, analysis)  : Promise.resolve(null),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

    // YouTube: fire-and-forget (sends brief to Telegram, logs to youtube_queue)
    if (ENV.YOUTUBE_API_KEY) {
      queueYouTubeShort(sport, teams, analysis).catch(console.error);
    }

    const logRecord = {
      pick_id:              id,
      sport,
      teams,
      pick_summary:         pick ?? '',
      confidence:           confidence ?? null,
      has_edge:             hasEdge,
      edge_pct:             edgePct ? parseFloat(edgePct) : null,
      odds,
      posted_at:            new Date().toISOString(),
      reddit_posts:         redditPosts ?? [],
      discord_channel_id:   discordResult?.channelId ?? null,
      discord_message_id:   discordResult?.messageId ?? null,
      twitter_tweet_id:     twitterResult?.tweetId ?? null,
      instagram_post_id:    igFeedResult?.postId ?? null,
      instagram_story_id:   igStoryResult?.storyId ?? null,
      instagram_image_url:  igFeedResult?.imageUrl ?? null,
      engagement_checked:   false,
      engagement_data:      null,
      result:               null,
      result_posted:        false,
    };

    await logPost(logRecord);
    scheduleEngagementCheck(logRecord); // fires after 2h, non-blocking
    console.log(`[SocialAgent] ${sport} logged. Engagement check scheduled in 2h.`);
  }

  console.log('\n[SocialAgent] Done.\n');
}

// ── Bobby Vegas analysis fetcher (for manual Telegram triggers) ───────────────
async function fetchBobbyAnalysis(sport, teams, team1, team2) {
  const webhook = BOBBY_WEBHOOKS[sport];
  if (!webhook) throw new Error(`No webhook configured for sport: ${sport}`);

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sport, teams, team1, team2 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);

  const rawText = await res.text();
  try {
    const json = JSON.parse(rawText);
    const body = Array.isArray(json) ? json[0] : json;
    if (body?.jobId) {
      // F1 async
      const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 4_000));
        const pr = await fetch(`${SUPABASE_URL}/rest/v1/f1_picks?id=eq.${body.jobId}&select=status,analysis`, { headers });
        const rows = await pr.json();
        const row = Array.isArray(rows) ? rows[0] : rows;
        if (row?.status === 'complete') return row.analysis;
      }
      throw new Error('F1 poll timeout');
    }
    return body?.analysis ?? body?.output ?? body?.response ?? rawText;
  } catch (_) {
    return rawText;
  }
}

function parseSportAndTeams(text) {
  const sportKeys = Object.keys(BOBBY_WEBHOOKS);
  const lower = text.toLowerCase();
  const sport = sportKeys.find(s => lower.includes(s.toLowerCase()));
  if (!sport) return null;

  const rest = text.replace(new RegExp(sport, 'i'), '').trim();
  const vsMatch = rest.match(/^(.+?)\s+(?:vs\.?|@|versus)\s+(.+)$/i);
  if (!vsMatch) return { sport, teams: rest, team1: rest, team2: '' };
  return { sport, teams: rest, team1: vsMatch[1].trim(), team2: vsMatch[2].trim() };
}

// ── Telegram helpers ──────────────────────────────────────────────────────────
const TG = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}`;

async function sendTelegram(text) {
  if (!ENV.TELEGRAM_BOT_TOKEN) return;
  await fetch(`${TG}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ENV.TELEGRAM_CHAT_ID, text }),
    signal: AbortSignal.timeout(10_000),
  }).catch(console.error);
}

async function handleTelegramUpdate(update) {
  const message = update.message ?? update.edited_message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text   = message.text.trim();

  const reply = async (msg) => {
    await fetch(`${TG}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10_000),
    }).catch(console.error);
  };

  // /social status
  if (text.startsWith('/social status')) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/social_posts?order=posted_at.desc&limit=10&select=sport,teams,confidence,posted_at,result`,
        { headers: SB_HEADERS, signal: AbortSignal.timeout(8_000) }
      );
      const rows = await res.json();
      const lines = rows.map(r =>
        `• ${r.sport}: ${r.teams.slice(0, 30)} — ${r.confidence ?? '?'} conf ${r.result ? `[${r.result}]` : '(pending)'}`
      );
      await reply(['📊 Recent Social Posts', '', ...lines].join('\n') || 'No posts yet.');
    } catch (err) {
      await reply(`Error: ${err.message}`);
    }
    return;
  }

  // /result [sport] W|L
  if (text.startsWith('/result ')) {
    const parts = text.replace('/result ', '').trim().split(/\s+/);
    const result = parts.pop(); // last word is W or L
    const sport  = parts.join(' ').trim();
    if (!['W', 'L', 'w', 'l'].includes(result) || !sport) {
      await reply('Usage: /result [sport] W or /result [sport] L\nExample: /result MLB W');
      return;
    }
    await reply(`Logging ${result.toUpperCase()} for ${sport}...`);
    await postResultFollowUp(sport, result).catch(err => reply(`Error: ${err.message}`));
    return;
  }

  // /post today
  if (text === '/post today') {
    await reply('⏳ Fetching today\'s picks from ESPN and Bobby Vegas... (~60s)');
    try {
      const ESPN_URLS = {
        MLB:    'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
        NHL:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
        NBA:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
        Soccer: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
        WNBA:   'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
      };
      let posted = 0;
      for (const [sport, espnUrl] of Object.entries(ESPN_URLS)) {
        try {
          const r = await fetch(espnUrl, { signal: AbortSignal.timeout(8_000) });
          const d = await r.json();
          const ev = d.events?.[0];
          if (!ev) continue;
          const comps = ev.competitions?.[0]?.competitors ?? [];
          const away = comps.find(c => c.homeAway === 'away')?.team?.displayName ?? '';
          const home = comps.find(c => c.homeAway === 'home')?.team?.displayName ?? '';
          if (!away || !home) continue;

          const teams = `${away} vs ${home}`;
          const analysis = await fetchBobbyAnalysis(sport, teams, away, home);
          const { pick, confidence, hasEdge, edgePct, odds } = extractPick(analysis);

          const mockResult = {
            sport: { key: sport, emoji: '🎲' },
            game: { teams, team1: away, team2: home },
            parsed: { pick, confidence, hasEdge, edgePct },
            rawAnalysis: analysis,
            error: null,
          };
          await postPicks([mockResult]);
          posted++;
        } catch (err) {
          console.error(`[/post today][${sport}] ${err.message}`);
        }
      }
      await reply(`✅ Posted ${posted} picks to social media.`);
    } catch (err) {
      await reply(`❌ Error: ${err.message}`);
    }
    return;
  }

  // /post [sport] [Team A vs Team B]
  if (text.startsWith('/post ')) {
    const body = text.replace('/post ', '').trim();
    const parsed = parseSportAndTeams(body);
    if (!parsed) {
      await reply('❓ Format: /post MLB Yankees vs Red Sox\n\nSports: MLB, NHL, NBA, WNBA, NFL, NCAAFB, Soccer, F1, Tennis, Golf');
      return;
    }
    await reply(`⏳ Fetching Bobby Vegas analysis for ${parsed.teams}...`);
    try {
      const analysis = await fetchBobbyAnalysis(parsed.sport, parsed.teams, parsed.team1, parsed.team2);
      const { pick, confidence, hasEdge, edgePct } = extractPick(analysis);
      const mockResult = {
        sport: { key: parsed.sport, emoji: '🎲' },
        game: { teams: parsed.teams, team1: parsed.team1, team2: parsed.team2 },
        parsed: { pick, confidence, hasEdge, edgePct },
        rawAnalysis: analysis,
        error: null,
      };
      await postPicks([mockResult]);
      await reply(`✅ Posted ${parsed.sport}: ${parsed.teams} to Reddit, Discord, and Twitter.`);
    } catch (err) {
      await reply(`❌ Error: ${err.message}`);
    }
    return;
  }
}

// ── Telegram long-poll (standalone mode) ─────────────────────────────────────
async function startTelegramListener() {
  if (!ENV.TELEGRAM_BOT_TOKEN) {
    console.error('[SocialAgent] TELEGRAM_BOT_TOKEN not set. Exiting.');
    process.exit(1);
  }
  console.log('[SocialAgent] Telegram listener started. Commands: /post, /result, /social status');
  let offset = 0;
  while (true) {
    try {
      const res = await fetch(`${TG}/getUpdates?timeout=30&offset=${offset}`, {
        signal: AbortSignal.timeout(40_000),
      });
      const data = await res.json();
      if (!data.ok) { await new Promise(r => setTimeout(r, 5_000)); continue; }
      for (const update of data.result ?? []) {
        offset = update.update_id + 1;
        handleTelegramUpdate(update).catch(console.error);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[SocialAgent] Poll error:', err.message);
        await new Promise(r => setTimeout(r, 5_000));
      }
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
// When run directly: start Telegram listener
// When imported: exports postPicks() for use by test-bobby-cron.js
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       NanoClaw Social Media Agent — Bobby Vegas                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const missing = [
    ['REDDIT_CLIENT_ID',         ENV.REDDIT_CLIENT_ID],
    ['DISCORD_BOT_TOKEN',        ENV.DISCORD_BOT_TOKEN],
    ['TWITTER_API_KEY',          ENV.TWITTER_API_KEY],
    ['TELEGRAM_BOT_TOKEN',       ENV.TELEGRAM_BOT_TOKEN],
    ['INSTAGRAM_ACCESS_TOKEN',   ENV.INSTAGRAM_ACCESS_TOKEN],
    ['YOUTUBE_API_KEY',          ENV.YOUTUBE_API_KEY],
  ].filter(([, v]) => !v).map(([k]) => k);

  if (missing.length > 0) {
    console.warn('⚠️  Missing credentials (platforms will be skipped):');
    missing.forEach(k => console.warn(`   ${k}`));
    console.warn('');
  }

  startTelegramListener();
}
