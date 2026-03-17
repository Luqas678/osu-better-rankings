const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let cachedToken: { token: string; expiresAt: number } | null = null;

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const rankingCache = new Map<string, { data: unknown; expiresAt: number }>();

async function getOsuToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('OSU_CLIENT_ID');
  const clientSecret = Deno.env.get('OSU_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('OSU_CLIENT_ID or OSU_CLIENT_SECRET not configured');
  }

  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: parseInt(clientId),
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OAuth failed [${res.status}]: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, page } = await req.json();

    if (!mode || !page) {
      return new Response(
        JSON.stringify({ error: 'mode and page are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = `${mode}:${page}`;
    const cached = rankingCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('Cache hit:', cacheKey);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getOsuToken();
    const url = `https://osu.ppy.sh/api/v2/rankings/${mode}/performance?page=${page}`;
    console.log('Fetching:', url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`osu! API error [${res.status}]: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    rankingCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
