export interface OsuPlayer {
  pp: number;
  global_rank: number;
  user: {
    id: number;
    username: string;
    country_code: string;
  };
}

const CLIENT_ID = import.meta.env.VITE_OSU_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_OSU_CLIENT_SECRET;

let accessToken: string | null = null;

async function getAccessToken() {
  if (accessToken) return accessToken;

  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error("Error de autenticación con osu!. Revisa tus claves.");
  
  accessToken = data.access_token;
  return accessToken;
}

export async function fetchOsuRankingPage(mode: string, page: number): Promise<OsuPlayer[]> {
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://osu.ppy.sh/api/v2/rankings/${mode}/performance?page=${page}`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    });
    
    const data = await response.json();
    return data.ranking || [];
  } catch (err) {
    console.error("Error fetching rankings:", err);
    throw err;
  }
}

export const CONTINENTS: Record<string, string[]> = {
  "Europe": ["AD","AL","AT","AX","BA","BE","BG","BY","CH","CY","CZ","DE","DK","EE","ES","FI","FO","FR","GB","GG","GI","GR","HR","HU","IE","IM","IS","IT","JE","LI","LT","LU","LV","MC","MD","ME","MK","MT","NL","NO","PL","PT","RO","RS","RU","SE","SI","SJ","SK","SM","UA","VA"],
  "South America": ["AR","BO","BR","CL","CO","EC","FK","GF","GY","PE","PY","SR","UY","VE"],
  "North America": ["AG","AI","AW","BB","BL","BM","BQ","BS","BZ","CA","CR","CU","CW","DM","DO","GD","GL","GP","GT","HN","HT","JM","KN","KY","LC","MF","MQ","MS","MX","NI","PA","PM","PR","SV","SX","TC","TT","US","VC","VG","VI"],
  "Asia": ["AF","AM","AZ","BD","BH","BN","BT","CC","CN","CX","GE","HK","ID","IL","IN","IO","IQ","IR","JO","JP","KG","KH","KP","KR","KW","KZ","LA","LB","LK","MM","MN","MO","MV","MY","NP","OM","PH","PK","PS","QA","SA","SG","SY","TH","TJ","TL","TM","TR","TW","UZ","VN","YE"],
  "Oceania": ["AS","AU","CK","FJ","FM","GU","KI","MH","MP","NC","NF","NR","NU","NZ","PF","PG","PN","PW","SB","TK","TO","TV","UM","VU","WF","WS"],
  "Africa": ["AO","BF","BI","BJ","BW","CD","CF","CG","CI","CM","CV","DJ","DZ","EG","EH","ER","ET","GA","GH","GM","GN","GQ","GW","KE","KM","LR","LS","LY","MA","MG","ML","MR","MU","MW","MZ","NA","NE","NG","RE","RW","SC","SD","SH","SL","SN","SO","SS","ST","SZ","TD","TG","TN","TZ","UG","YT","ZA","ZM","ZW"],
};

export type GameMode = 'osu' | 'taiko' | 'fruits' | 'mania';

export const GAME_MODES: { value: GameMode; label: string }[] = [
  { value: 'osu', label: 'osu!' },
  { value: 'taiko', label: 'Taiko' },
  { value: 'fruits', label: 'Catch' },
  { value: 'mania', label: 'Mania' },
];

export const REGIONS = [
  { value: 'Global', label: 'Global' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'North America', label: 'North America' },
  { value: 'South America', label: 'South America' },
  { value: 'Oceania', label: 'Oceania' },
  { value: 'Africa', label: 'Africa' },
];
