import { useState, useCallback } from 'react';
import {
  fetchOsuRankingPage,
  CONTINENTS,
  GAME_MODES,
  REGIONS,
  type GameMode,
  type OsuPlayer,
} from '@/lib/osu-api';

const Rankings = () => {
  const [mode, setMode] = useState<GameMode>('osu');
  const [region, setRegion] = useState('Global');
  const [excludeInput, setExcludeInput] = useState('');
  const [excludedContinents, setExcludedContinents] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<OsuPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const toggleContinent = (name: string) => {
    setExcludedContinents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlayers([]);
    setSearched(true);

    const excludeCountries = excludeInput
      .toUpperCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const excludedCodes = new Set<string>();
    if (region === 'Global') {
      excludedContinents.forEach((cont) => {
        (CONTINENTS[cont] || []).forEach((c) => excludedCodes.add(c));
      });
    }

    const allowedSet = region !== 'Global' ? new Set(CONTINENTS[region]) : null;

    try {
      const filtered: OsuPlayer[] = [];
      let page = 1;

      while (filtered.length < 100 && page <= 20) {
        setProgress(`Fetching page ${page}...`);
        const ranking = await fetchOsuRankingPage(mode, page);
        if (!ranking.length) break;

        for (const p of ranking) {
          const code = p.user?.country_code;
          if (!code) continue;
          const inRegion = allowedSet ? allowedSet.has(code) : true;
          const exCountry = excludeCountries.includes(code);
          const exContinent = excludedCodes.has(code);
          if (inRegion && !exCountry && !exContinent) {
            filtered.push(p);
            if (filtered.length >= 100) break;
          }
        }
        page++;
      }
      setPlayers(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [mode, region, excludeInput, excludedContinents]);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <h2 className="text-4xl font-bold mb-7">Rankings</h2>

      {/* Filtros */}
      <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-4">
        <div className="flex gap-2 flex-wrap">
          {GAME_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                mode === m.value ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="flex-1 border rounded-full px-4 py-2 bg-card"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            placeholder="Exclude countries (ES, KR...)"
            className="flex-1 border rounded-full px-4 py-2 bg-card"
          />
        </div>

        <button
          onClick={fetchRanking}
          disabled={loading}
          className="bg-primary text-white rounded-full px-8 py-2 font-bold self-end"
        >
          {loading ? 'Searching...' : 'Search ranking'}
        </button>
      </div>

      {loading && <p className="text-muted-foreground">{progress}</p>}

      {/* Resultados */}
      {!loading && players.length > 0 && (
        <div className="w-full max-w-[700px] bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-primary text-white grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 text-xs font-bold uppercase tracking-wider">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">PP</span>
            <span className="text-right">Rank</span>
          </div>
          {players.map((p, i) => {
            const cc = (p.user?.country_code || '').toUpperCase();
            return (
              <div key={i} className="grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 border-b items-center hover:bg-muted/50 transition-colors">
                <span className="font-bold text-primary">{i + 1}</span>
                <div className="flex items-center gap-3">
                  <img
                    src={`https://osu.ppy.sh/images/flags/${cc}.png`}
                    className="w-5 h-auto rounded-sm shadow-sm"
                    alt={cc}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <a
                    href={`https://osu.ppy.sh/users/${p.user?.id}`}
                    target="_blank"
                    className="font-bold hover:underline"
                  >
                    {p.user?.username}
                  </a>
                </div>
                <span className="text-right font-bold">{Math.round(p.pp).toLocaleString()}pp</span>
                <span className="text-right text-xs text-muted-foreground">#{p.global_rank?.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Rankings;
