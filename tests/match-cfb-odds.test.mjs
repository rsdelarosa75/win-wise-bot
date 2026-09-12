// Unit tests for the "Match CFB Odds" node in ncaafb-workflow-v2.json.
// Loads the node's jsCode straight from the workflow JSON so it always tests
// the SHIPPED code. Run: node tests/match-cfb-odds.test.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wf = JSON.parse(fs.readFileSync(path.join(root, 'ncaafb-workflow-v2.json'), 'utf8'));
const node = wf.nodes.find(n => n.name === 'Match CFB Odds');
if (!node) { console.error('Match CFB Odds node not found'); process.exit(1); }
const src = node.parameters.jsCode;

// Live-shaped board including the five "Texas"-prefix decoys the Odds API returns.
const board = [
  { away_team: 'Texas State Bobcats', home_team: 'Nicholls Colonels',
    bookmakers: [{ title: 'DK', markets: [{ key: 'h2h', outcomes: [{ name: 'Texas State Bobcats', price: -2000 }, { name: 'Nicholls Colonels', price: 1000 }] }] }] },
  { away_team: 'North Texas Mean Green', home_team: 'Washington State Cougars',
    bookmakers: [{ title: 'DK', markets: [{ key: 'h2h', outcomes: [{ name: 'North Texas Mean Green', price: 120 }, { name: 'Washington State Cougars', price: -140 }] }] }] },
  { away_team: 'Texas Tech Red Raiders', home_team: 'Utah Utes',
    bookmakers: [{ title: 'DK', markets: [{ key: 'h2h', outcomes: [{ name: 'Texas Tech Red Raiders', price: -150 }, { name: 'Utah Utes', price: 130 }] }] }] },
  { away_team: 'Texas Southern Tigers', home_team: 'Prairie View A&M Panthers',
    bookmakers: [{ title: 'DK', markets: [{ key: 'h2h', outcomes: [{ name: 'Texas Southern Tigers', price: 200 }, { name: 'Prairie View A&M Panthers', price: -250 }] }] }] },
  { away_team: 'Ohio State Buckeyes', home_team: 'Texas Longhorns',
    bookmakers: [{ title: 'DraftKings', markets: [
      { key: 'h2h', outcomes: [{ name: 'Ohio State Buckeyes', price: -140 }, { name: 'Texas Longhorns', price: 120 }] },
      { key: 'spreads', outcomes: [{ name: 'Ohio State Buckeyes', price: -110, point: -2.5 }, { name: 'Texas Longhorns', price: -110, point: 2.5 }] },
    ] }] },
];

function run(cfbdAway, cfbdHome, inputItems) {
  const fixture = { away_team_name: cfbdAway, home_team_name: cfbdHome };
  const wrapped = `(function(){
    const $input = { all: () => (${JSON.stringify(inputItems)}) };
    const $ = () => ({ first: () => ({ json: { fixture: ${JSON.stringify(fixture)} } }) });
    ${src}
  })()`;
  return eval(wrapped)[0].json;
}

// The five requested cases: CFBD short-name pair -> expected Odds API game.
const cases = [
  ['Ohio State', 'Texas', 'Texas Longhorns'],
  ['Nicholls', 'Texas State', 'Texas State Bobcats'],
  ['North Texas', 'Washington State', 'North Texas Mean Green'],
  ['Texas Tech', 'Utah', 'Texas Tech Red Raiders'],
  ['Texas Southern', 'Prairie View A&M', 'Texas Southern Tigers'],
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
// Negative case: game not on the board must degrade gracefully.
{
  const r = run('Alabama', 'Auburn', board.map(j => ({ json: j })));
  const ok = r.odds_matched === false;
  total++; if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [not-on-board]  Alabama @ Auburn  ->  ${r.odds_str}`);
}

console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
