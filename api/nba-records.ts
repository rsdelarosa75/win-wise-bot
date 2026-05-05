import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { homeTeam, awayTeam } = req.query;

    // Fetch team list to get IDs
    const teamsRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=50'
    );
    const teamsData = await teamsRes.json();
    const teams = teamsData.sports[0].leagues[0].teams.map((t: any) => t.team);

    // Match home and away teams
    const findTeam = (name: string) =>
      teams.find(
        (t: any) =>
          t.displayName.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(t.displayName.toLowerCase())
      );

    const homeTeamObj = findTeam(homeTeam as string);
    const awayTeamObj = findTeam(awayTeam as string);

    if (!homeTeamObj || !awayTeamObj) {
      return res.status(200).json({ records: 'Team records unavailable' });
    }

    // Fetch records for both teams
    const [homeRes, awayRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${homeTeamObj.id}`),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${awayTeamObj.id}`),
    ]);

    const [homeData, awayData] = await Promise.all([
      homeRes.json(),
      awayRes.json(),
    ]);

    const formatRecord = (data: any, name: string) => {
      const team = data.team;
      const record = team?.record?.items;
      if (!record) return `${name}: Record unavailable`;

      const overall = record.find((r: any) => r.type === 'total');
      const home = record.find((r: any) => r.type === 'home');
      const away = record.find((r: any) => r.type === 'road');

      return `${name}: ${overall?.summary || '?'} overall | Home: ${home?.summary || '?'} | Away: ${away?.summary || '?'}`;
    };

    const records =
      formatRecord(homeData, homeTeamObj.displayName) +
      '\n' +
      formatRecord(awayData, awayTeamObj.displayName);

    return res.status(200).json({ records });
  } catch (err) {
    console.error('[nba-records] Error:', err);
    return res.status(200).json({ records: 'Team records unavailable' });
  }
}
