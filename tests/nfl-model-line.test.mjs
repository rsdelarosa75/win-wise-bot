// Unit tests for the early-season model-uncertainty cap: the NFL Model Line node
// flags it deterministically (weeks 1-6, edge > 5, pure model only), and Parse
// Footer caps a flagged Strong Play down to Lean. Loads shipped jsCode from the
// workflow JSON. Run: node tests/nfl-model-line.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(root, 'nfl-workflow-v2.json'), 'utf8'));
const code = name => wf.nodes.find(n => n.name === name).parameters.jsCode;
const modelLineSrc = code('NFL Model Line');
const parseFooterSrc = code('Parse Footer');

let pass = 0, total = 0;
const check = (name, cond, detail = '') => { total++; if (cond) pass++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };
const runNode = (src, outputs) => {
  const $ = n => ({ first: () => outputs[n][0], all: () => outputs[n] });
  const $input = { all: () => [], first: () => ({}) };
  return new Function('$', '$input', src)($, $input)[0].json;
};

// Drive Model Line: ratings hr/ar (home/away), a book home spread, a week, and Kalshi.
// model_home_margin = hr - ar + 1.8 (equal rest); edge = |model_margin - (-book_home_spread)|.
function modelLine({ week, hr, ar, book_home_spread, kalshi }) {
  const outputs = {
    'Get Team Ratings': [{ json: [{ team: 'HOM', week, rating: hr }, { team: 'AWY', week, rating: ar }] }],
    'NFL Match Fixture': [{ json: { fixture: { home_abbr: 'HOM', away_abbr: 'AWY', home_team_name: 'Home Team', away_team_name: 'Away Team', home_rest: '7', away_rest: '7' } } }],
    'Match NFL Odds': [{ json: { book_home_spread, book_home_ml: -150, book_away_ml: 130, book_away_spread: -book_home_spread } }],
    'Match Kalshi Teams': [{ json: kalshi || { kalshi_available: false } }],
  };
  return runNode(modelLineSrc, outputs);
}
// gate-passed Kalshi that favors the home side
const kalshiHome = { kalshi_available: true, kalshi_edge: { home_implied_pct: '62.0', away_implied_pct: '38.0', volume: '9000' } };
const kalshiAway = { kalshi_available: true, kalshi_edge: { home_implied_pct: '38.0', away_implied_pct: '62.0', volume: '9000' } };
const kalshiThin = { kalshi_available: true, kalshi_edge: { home_implied_pct: '62.0', away_implied_pct: '38.0', volume: '1200' } };

// hr=0, ar=0 -> model_home_margin=1.8; book_home_spread=3.4 -> edge 5.2 toward HOME.
const edge52 = { hr: 0, ar: 0, book_home_spread: 3.4 };   // edge 5.2, side HOME

check('wk3 edge 5.2 no kalshi -> early_uncertainty', modelLine({ week: 3, ...edge52 }).early_uncertainty === true);
check('wk6 edge 5.2 no kalshi -> early_uncertainty (boundary inclusive)', modelLine({ week: 6, ...edge52 }).early_uncertainty === true);
check('wk7 edge 5.2 -> NOT flagged (outside 1-6)', modelLine({ week: 7, ...edge52 }).early_uncertainty === false);
check('wk3 edge exactly 5.0 -> NOT flagged (strict >5)', modelLine({ week: 3, hr: 0, ar: 0, book_home_spread: 3.2 }).early_uncertainty === false,
  'edge=' + modelLine({ week: 3, hr: 0, ar: 0, book_home_spread: 3.2 }).edge_pts);
check('wk3 edge 5.2 + Kalshi corroborates home -> exempt', modelLine({ week: 3, ...edge52, kalshi: kalshiHome }).early_uncertainty === false);
check('wk3 edge 5.2 + Kalshi favors AWAY (opposes) -> still flagged', modelLine({ week: 3, ...edge52, kalshi: kalshiAway }).early_uncertainty === true);
check('wk3 edge 5.2 + Kalshi home but thin (<$5k) -> still flagged', modelLine({ week: 3, ...edge52, kalshi: kalshiThin }).early_uncertainty === true);
check('flagged model_line_str carries the note', /EARLY-SEASON MODEL UNCERTAINTY/.test(modelLine({ week: 3, ...edge52 }).model_line_str));

// Parse Footer cap enforcement
function footer(tier, early) {
  const content = '🎯 BOBBY VEGAS PICK: ' + tier + '\n\nPICK_JSON: {"tier":"' + tier + '","pick_type":"spread","side":"Home Team","confidence":"High"}';
  const outputs = {
    'Bobby Vegas Analysis': [{ json: { message: { content } } }],
    'Parse Teams': [{ json: { away_team: 'Away Team', home_team: 'Home Team' } }],
    'Webhook': [{ json: { body: { test: true } } }],
    'NFL Model Line': [{ json: { model_spread: -5, book_spread: 3.4, edge_pts: 5.2, early_uncertainty: early } }],
    'Match NFL Odds': [{ json: { book_home_spread: 3.4, book_home_ml: -150, book_away_ml: 130 } }],
    'NFL Match Fixture': [{ json: { fixture: { home_team_name: 'Home Team', away_team_name: 'Away Team' } } }],
    'Match Kalshi Teams': [{ json: { kalshi_available: false } }],
  };
  return runNode(parseFooterSrc, outputs).row;
}
check('footer Strong Play + flagged -> logged tier Lean', footer('Strong Play', true).tier === 'Lean');
check('footer Strong Play + flagged -> early_uncertainty logged true', footer('Strong Play', true).early_uncertainty === true);
check('footer Strong Play + NOT flagged -> stays Strong Play', footer('Strong Play', false).tier === 'Strong Play');
check('footer Lean + flagged -> stays Lean (only caps Strong Play)', footer('Lean', true).tier === 'Lean');

console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
