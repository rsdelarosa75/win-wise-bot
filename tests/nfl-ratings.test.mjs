// Unit tests for the NFL rating math in nfl-ratings-workflow.json.
// Loads computeRatings straight from the workflow's "Compute Ratings" node (the
// shipped code), then runs it on hand-verifiable synthetic data.
// Run: node tests/nfl-ratings.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(root, 'nfl-ratings-workflow.json'), 'utf8'));
const node = wf.nodes.find(n => n.name === 'Compute Ratings');
if (!node) { console.error('Compute Ratings node not found'); process.exit(1); }
// The node = ratings-lib + wrapper; strip the wrapper and expose computeRatings.
const lib = node.parameters.jsCode.split('// ===== n8n wrapper')[0];
const computeRatings = new Function(lib + '\n; return computeRatings;')();

let pass = 0, total = 0;
const approx = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
function check(name, cond, detail = '') {
  total++; if (cond) pass++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
}

// ---- synthetic stats: 4 teams, 2 weeks, round-robin so opponent adj is exercised.
// Every team runs 60 plays/game (35 att + 24 car + 1 sack). Total off EPA per
// game: AAA +12, BBB 0, CCC 0, DDD -12. Schedule: wk1 AAA-BBB, CCC-DDD;
// wk2 AAA-CCC, BBB-DDD. Each team's allowed = sum of its opponents' offense,
// which nets to 0 for all four, so opponent-adjusted net == raw net:
//   AAA +0.20, BBB 0, CCC 0, DDD -0.20 (per play).
const HDR = 'season,week,team,season_type,opponent_team,attempts,passing_epa,carries,rushing_epa,sacks_suffered';
const row = (wk, team, opp, offEPA) =>
  `2026,${wk},${team},REG,${opp},35,${offEPA},24,0,1`;   // all EPA in passing_epa col
const curCsv = [HDR,
  row(1, 'AAA', 'BBB', 12), row(1, 'BBB', 'AAA', 0), row(1, 'CCC', 'DDD', 0), row(1, 'DDD', 'CCC', -12),
  row(2, 'AAA', 'CCC', 12), row(2, 'CCC', 'AAA', 0), row(2, 'BBB', 'DDD', 0), row(2, 'DDD', 'BBB', -12),
].join('\n');

// No prior data and no games.csv -> prior contribution 0, K falls back to 28.9.
const { rows, K, week } = computeRatings(curCsv, '', '', 2026, 2025);
const by = Object.fromEntries(rows.map(r => [r.team, r]));

check('week resolved from stats maxWeek', week === 2, `week=${week}`);
check('K fallback with no calibration data', K === 28.9, `K=${K}`);
check('all four teams present, 2 games each', rows.length === 4 && rows.every(r => r.games_played === 2));

// off/def per play are exact and unadjusted
check('AAA off_epa = +0.20', approx(by.AAA.off_epa, 0.20), `${by.AAA.off_epa}`);
check('DDD off_epa = -0.20', approx(by.DDD.off_epa, -0.20), `${by.DDD.off_epa}`);
check('BBB off_epa = 0', approx(by.BBB.off_epa, 0), `${by.BBB.off_epa}`);
check('all def_epa = 0 (allowed nets out)', rows.every(r => approx(r.def_epa, 0)), rows.map(r => `${r.team}:${r.def_epa}`).join(' '));

// ordering + centering
check('ordering AAA > BBB≈CCC > DDD', by.AAA.rating > by.BBB.rating && by.BBB.rating > by.DDD.rating);
check('AAA rating > 0, DDD rating < 0', by.AAA.rating > 0 && by.DDD.rating < 0);
check('ratings centered near 0', Math.abs(rows.reduce((s, r) => s + r.rating, 0)) < 0.1);
// w = 2/(2+8) = 0.2; AAA rating = 0.2 * adj(0.20) * K(28.9) = 1.156
check('AAA rating = w*adj*K = 1.16', approx(by.AAA.rating, 1.16, 0.02), `${by.AAA.rating}`);

// ---- prior anchoring: give AAA a strong prior; its rating should rise vs no-prior.
// Same connected 2-week round-robin as cur (so SRS converges), AAA more dominant.
const priorCsv = [HDR,
  row(1, 'AAA', 'BBB', 20), row(1, 'BBB', 'AAA', 0), row(1, 'CCC', 'DDD', 0), row(1, 'DDD', 'CCC', -20),
  row(2, 'AAA', 'CCC', 20), row(2, 'CCC', 'AAA', 0), row(2, 'BBB', 'DDD', 0), row(2, 'DDD', 'BBB', -20),
].join('\n');
const withPrior = computeRatings(curCsv, priorCsv, '', 2026, 2025);
const aaaPrior = withPrior.rows.find(r => r.team === 'AAA').rating;
check('strong prior raises AAA rating', aaaPrior > by.AAA.rating, `${aaaPrior} > ${by.AAA.rating}`);

// ---- calibrateK: a synthetic prior-season games slice yields a K in range.
const gamesCsv = ['season,week,gameday,away_team,home_team,home_score,away_score,spread_line',
  // home rating diff (AAA+ vs DDD-) tracked by a spread; slope ~ K
  '2025,1,2025-09-07,DDD,AAA,,,7',
  '2025,2,2025-09-14,BBB,AAA,,,6',
  '2025,3,2025-09-21,CCC,AAA,,,6',
  '2025,4,2025-09-28,DDD,BBB,,,3',
  '2025,5,2025-10-05,DDD,CCC,,,3',
  '2025,6,2025-10-12,CCC,BBB,,,0',
].concat(Array.from({ length: 20 }, (_, i) => `2025,${7 + i},2025-11-01,BBB,CCC,,,0`)).join('\n');
const withK = computeRatings(curCsv, priorCsv, gamesCsv, 2026, 2025);
check('calibrated K in [10,60]', withK.K >= 10 && withK.K <= 60, `K=${withK.K}`);

console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
