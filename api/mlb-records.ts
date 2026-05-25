import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { homeTeam, awayTeam } = req.query;

    const teamsRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams?limit=50'
    );
    const teamsData = await teamsRes.json();
    const teams = teamsData.sports[0].leagues[0].teams.map((t: any) => t.team);

    const findTeam = (name: string) =>
      teams.find(
        (t: any) =>
          t.displayName.toLowerCase().includes((name as string).toLowerCase()) ||
          (name as string).toLowerCase().includes(t.displayName.toLowerCase()) ||
          t.shortDisplayName?.toLowerCase().includes((name as string).toLowerCase()) ||
          t.nickname?.toLowerCase().includes((name as string).toLowerCase())
      );

    const homeTeamObj = findTeam(homeTeam as string);
    const awayTeamObj = findTeam(awayTeam as string);

    if (!homeTeamObj || !awayTeamObj) {
      return res.status(200).json({ records: 'Team records unavailable' });
    }

    const [homeRes, awayRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${homeTeamObj.id}`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${awayTeamObj.id}`),
    ]);

    const [homeData, awayData] = await Promise.all([
      homeRes.json(),
      awayRes.json(),
    ]);

    const formatRecord = (data: any, name: string): string => {
      const items = data?.team?.record?.items ?? [];
      const overall = items.find((r: any) => r.type === 'total') ?? items[0];
      const home    = items.find((r: any) => r.type === 'home')  ?? items[1];
      const away    = items.find((r: any) => r.type === 'road')  ?? items[2];

      if (!overall) return `${name}: Record unavailable`;

      const stats = overall.stats ?? [];
      const statVal = (key: string): number | undefined =>
        stats.find((s: any) => s.name === key)?.value;

      const streakRaw = statVal('streak');
      const streak =
        streakRaw === undefined
          ? '—'
          : streakRaw > 0
          ? `W${Math.round(Math.abs(streakRaw))}`
          : streakRaw < 0
          ? `L${Math.round(Math.abs(streakRaw))}`
          : '0';

      const runsFor     = statVal('avgPointsFor');
      const runsAgainst = statVal('avgPointsAgainst');
      const diff        = statVal('differential');

      const rfStr   = runsFor     !== undefined ? runsFor.toFixed(1)     : '—';
      const raStr   = runsAgainst !== undefined ? runsAgainst.toFixed(1) : '—';
      const diffStr = diff !== undefined ? (diff >= 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`) : '—';

      return (
        `${name.toUpperCase()}: ${overall.summary ?? '—'} overall | ` +
        `${home?.summary ?? '—'} home | ${away?.summary ?? '—'} away | ` +
        `Streak: ${streak} | Runs: ${rfStr}/game scored, ${raStr}/game allowed | ` +
        `Run differential: ${diffStr}`
      );
    };

    const records =
      formatRecord(homeData, homeTeamObj.displayName) +
      '\n' +
      formatRecord(awayData, awayTeamObj.displayName);

    return res.status(200).json({ records });
  } catch (err) {
    console.error('[mlb-records] Error:', err);
    return res.status(200).json({ records: 'Team records unavailable' });
  }
}
