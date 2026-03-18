import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getOsuToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('OSU_CLIENT_ID')?.trim();
  const clientSecret = Deno.env.get('OSU_CLIENT_SECRET')?.trim();

  if (!clientId || !clientSecret) {
    throw new Error('OSU_CLIENT_ID or OSU_CLIENT_SECRET not configured');
  }

  const res = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(clientId),
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

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, page } = await req.json();

    if (!mode) {
      return new Response(
        JSON.stringify({ error: 'mode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    // If requesting page 1 (or no page), check DB cache first
    if (!page || page === 1) {
      const { data: cached } = await supabase
        .from('ranking_cache')
        .select('data, fetched_at')
        .eq('mode', mode)
        .single();

      if (cached) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        if (age < CACHE_TTL_MS) {
          console.log(`DB cache hit for ${mode}, age: ${Math.round(age / 60000)}min`);
          return new Response(JSON.stringify({ ranking: cached.data, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Fetch all 20 pages from osu! API
    const token = await getOsuToken();
    const allPlayers: unknown[] = [];

    for (let p = 1; p <= 20; p++) {
      const url = `https://osu.ppy.sh/api/v2/rankings/${mode}/performance?page=${p}`;
      console.log('Fetching:', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`osu! API error [${res.status}]: ${txt.slice(0, 300)}`);
      }

      const data = await res.json();
      if (data.ranking && data.ranking.length) {
        allPlayers.push(...data.ranking);
      } else {
        break;
      }
    }

    // Store in DB cache (upsert)
    await supabase
      .from('ranking_cache')
      .upsert(
        { mode, data: allPlayers, fetched_at: new Date().toISOString() },
        { onConflict: 'mode' }
      );

    console.log(`Cached ${allPlayers.length} players for ${mode}`);

    return new Response(JSON.stringify({ ranking: allPlayers, cached: false }), {
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
