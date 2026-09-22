// Unit tests for the "Match NFL Odds" node in nfl-workflow-v2.json.
// Loads the node's jsCode straight from the workflow JSON so it always tests the
// SHIPPED code. Run: node tests/match-nfl-odds.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(root, 'nfl-workflow-v2.json'), 'utf8'));
const node = wf.nodes.find(n => n.name === 'Match NFL Odds');
if (!node) { console.error('Match NFL Odds node not found'); process.exit(1); }
const src = node.parameters.jsCode;

// Live-shaped board. Includes the two New York (Giants/Jets) and two Los Angeles
// (Rams/Chargers) clubs as decoys — a city-only matcher would cross-match them.
const board = [
  { away_team: 'New York Giants', home_team: 'Dallas Cowboys',
    bookmakers: [{ title: 'DK', markets: [
      { key: 'h2h', outcomes: [{ name: 'New York Giants', price: 160 }, { name: 'Dallas Cowboys', price: -190 }] },
      { key: 'spreads', outcomes: [{ name: 'New York Giants', price: -110, point: 4.5 }, { name: 'Dallas Cowboys', price: -110, point: -4.5 }] },
    ] }] },
  { away_team: 'New York Jets', home_team: 'New England Patriots',
    bookmakers: [{ title: 'DK', markets: [
      { key: 'h2h', outcomes: [{ name: 'New York Jets', price: 120 }, { name: 'New England Patriots', price: -140 }] },
    ] }] },
  { away_team: 'Los Angeles Rams', home_team: 'Seattle Seahawks',
    bookmakers: [{ title: 'DK', markets: [
      { key: 'h2h', outcomes: [{ name: 'Los Angeles Rams', price: -130 }, { name: 'Seattle Seahawks', price: 110 }] },
    ] }] },
  { away_team: 'Los Angeles Chargers', home_team: 'Kansas City Chiefs',
    bookmakers: [{ title: 'DK', markets: [
      { key: 'h2h', outcomes: [{ name: 'Los Angeles Chargers', price: 175 }, { name: 'Kansas City Chiefs', price: -210 }] },
    ] }] },
  { away_team: 'Buffalo Bills', home_team: 'Miami Dolphins',
    bookmakers: [{ title: 'DraftKings', markets: [
      { key: 'h2h', outcomes: [{ name: 'Buffalo Bills', price: -170 }, { name: 'Miami Dolphins', price: 145 }] },
      { key: 'spreads', outcomes: [{ name: 'Buffalo Bills', price: -110, point: -3.5 }, { name: 'Miami Dolphins', price: -110, point: 3.5 }] },
    ] }] },
];

function run(fixAway, fixHome, inputItems) {
  const fixture = { away_team_name: fixAway, home_team_name: fixHome };
  const wrapped = `(function(){
    const $input = { all: () => (${JSON.stringify(inputItems)}) };
    const $ = () => ({ first: () => ({ json: { fixture: ${JSON.stringify(fixture)} } }) });
    ${src}
  })()`;
  return eval(wrapped)[0].json;
}

// fixture full-name pair -> expected Odds API away_team on the matched game.
const cases = [
  ['New York Giants', 'Dallas Cowboys', 'New York Giants'],
  ['New York Jets', 'New England Patriots', 'New York Jets'],
  ['Los Angeles Rams', 'Seattle Seahawks', 'Los Angeles Rams'],
  ['Los Angeles Chargers', 'Kansas City Chiefs', 'Los Angeles Chargers'],
  ['Buffalo Bills', 'Miami Dolphins', 'Buffalo Bills'],
  // swapped orientation: fixture home/away reversed vs the board must still match
  ['Dallas Cowboys', 'New York Giants', 'New York Giants'],
];

// Both shapes the HTTP node can emit: many items, or one item wrapping the array.
const shapes = [
  ['split items', board.map(j => ({ json: j }))],
  ['array-in-one-item', [{ json: board }]],
];

let pass = 0, total = 0;
for (const [shapeName, items] of shapes) {
  for (const [away, home, expect] of cases) {
    const r = run(away, home, items);
    const ok = r.odds_matched && r.odds_str.includes(expect);
    total++; if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${shapeName}]  ${away} @ ${home}  ->  ${r.odds_matched ? r.odds_str : 'unavailable'}`);
  }
}

// Decoy guard: Giants fixture must NOT match the Jets board game (shared city).
{
  const jetsOnly = [{ json: board[1] }]; // only Jets @ Patriots on the board
  const r = run('New York Giants', 'Dallas Cowboys', jetsOnly);
  const ok = r.odds_matched === false;
  total++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [decoy-city]  Giants fixture vs Jets-only board  ->  ${r.odds_str}`);
}
// Decoy guard: Rams fixture must NOT match the Chargers board game (shared city).
{
  const chargersOnly = [{ json: board[3] }];
  const r = run('Los Angeles Rams', 'Seattle Seahawks', chargersOnly);
  const ok = r.odds_matched === false;
  total++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [decoy-city]  Rams fixture vs Chargers-only board  ->  ${r.odds_str}`);
}
// Negative case: game not on the board must degrade gracefully.
{
  const r = run('Chicago Bears', 'Green Bay Packers', board.map(j => ({ json: j })));
  const ok = r.odds_matched === false;
  total++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [not-on-board]  Bears @ Packers  ->  ${r.odds_str}`);
}

console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
