// Unit tests for the NFL News Assemble node (RSS primary, Tavily fallback).
// Loads the shipped jsCode from nfl-workflow-v2.json. Run: node tests/nfl-news.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(root, 'nfl-workflow-v2.json'), 'utf8'));
const src = wf.nodes.find(n => n.name === 'NFL News Assemble').parameters.jsCode;

let pass = 0, total = 0;
const check = (n, c, d = '') => { total++; if (c) pass++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  (' + d + ')' : ''}`); };
const run = (news, tavily) => {
  const o = {
    'Parse Teams': [{ json: { away_team: 'Tennessee Titans', home_team: 'New York Giants' } }],
    'NFL Get News': [{ json: news }],
    'NFL Get Tavily': [{ json: tavily }],
  };
  const $ = n => ({ first: () => o[n][0] });
  return new Function('$', src)($)[0].json;
};

// RSS present -> use RSS (primary), don't touch Tavily
const a = run({ rss_headlines: ['Giants WR ruled out (knee)'] }, { results: [{ title: 'ignored', content: 'ignored' }] });
check('RSS present -> source rss', a.news_source === 'rss');
check('RSS present -> headline shown', /Giants WR ruled out/.test(a.news_str));

// RSS empty -> Tavily fallback, injury filter applied
const b = run({ rss_headlines: [] }, { results: [
  { title: 'Giants QB Dart out for the season', content: 'placed on IR' },
  { title: 'Titans sign a kicker', content: 'roster move' },
] });
check('RSS empty -> source tavily', b.news_source === 'tavily');
check('Tavily keeps injury headline', /Dart/.test(b.news_str));
check('Tavily drops non-injury headline', !/kicker/.test(b.news_str));
check('Tavily count = 1 (only injury item)', b.news_count === 1, 'count=' + b.news_count);

// both empty -> none, with a message pointing at the credential
const c = run({ rss_headlines: [] }, { results: [] });
check('both empty -> source none', c.news_source === 'none');
check('none -> message mentions Tavily credential', /Tavily API/.test(c.news_str) || /credential/i.test(c.news_str));

// malformed inputs must not throw
const d = run({}, {});
check('malformed inputs degrade to none', d.news_source === 'none');

console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
