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
        setProgress(`Fetching page ${page} — ${filtered.length}/100 players collected…`);
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

  const modeLabel = GAME_MODES.find((m) => m.value === mode)?.label || mode;

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-[calc(100vh-56px)]">
      <h2 className="font-heading text-4xl font-bold mb-7">Rankings</h2>

      {/* Controls */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-6 w-full max-w-[700px] shadow-sm mb-8 flex flex-col gap-4">
        {/* Mode tabs */}
        <div className="flex gap-2 flex-wrap">
          {GAME_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border-[1.5px] transition-all cursor-pointer ${
                mode === m.value
                  ? 'bg-primary border-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.35)]'
                  : 'bg-card border-border text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Region + exclude */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="flex-1 min-w-[150px] border-[1.5px] border-border rounded-full px-4 py-2.5 text-sm bg-card text-foreground outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/15 appearance-none cursor-pointer"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={excludeInput}
            onChange={(e) => setExcludeInput(e.target.value)}
            placeholder="Exclude countries (e.g. ES, KR)"
            className="flex-1 min-w-[150px] border-[1.5px] border-border rounded-full px-4 py-2.5 text-sm bg-card text-foreground outline-none focus:border-primary focus:ring-[3px] focus:ring-ring/15 placeholder:text-muted-foreground"
          />
        </div>

        {/* Exclude continents (only when Global) */}
        {region === 'Global' && (
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-1.5 pl-1 uppercase tracking-wider">
              Exclude continents
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(CONTINENTS).map((name) => (
                <label
                  key={name}
                  className={`flex items-center gap-1 text-sm font-bold cursor-pointer px-3 py-1 rounded-full border-[1.5px] transition-all select-none ${
                    excludedContinents.has(name)
                      ? 'bg-destructive/10 border-destructive/50 text-destructive'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={excludedContinents.has(name)}
                    onChange={() => toggleContinent(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={fetchRanking}
          disabled={loading}
          className="self-end bg-primary text-primary-foreground rounded-full px-8 py-2.5 text-sm font-bold cursor-pointer transition-all shadow-[0_3px_12px_hsl(var(--primary)/0.35)] hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading ? 'Searching...' : 'Search ranking'}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="w-full max-w-[700px] py-8 text-center text-muted-foreground">
          <div className="flex justify-center gap-1 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary loading-dot inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary loading-dot inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary loading-dot inline-block" />
          </div>
          <p className="text-sm">{progress}</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-[700px] py-8 text-center">
          <p className="text-destructive font-bold">⚠ {error}</p>
        </div>
      )}

      {!loading && !error && players.length > 0 && (
        <div className="w-full max-w-[700px]">
          <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-primary text-primary-foreground grid grid-cols-[52px_1fr_100px_72px] px-5 py-3 text-xs font-bold uppercase tracking-wider gap-2 items-center">
              <span className="text-center">#</span>
              <span>Player</span>
              <span className="text-right">Performance</span>
              <span className="text-right">Global</span>
            </div>
            {/* Rows */}
            {players.map((p, i) => {
              const rank = i + 1;
              const cc = (p.user?.country_code || '').toLowerCase();
              const ccUp = (p.user?.country_code || '').toUpperCase();
              return (
                <div
                  key={`${p.user?.username}-${i}`}
                  className="grid grid-cols-[52px_1fr_100px_72px] px-5 py-2.5 border-b border-secondary gap-2 items-center hover:bg-secondary transition-colors"
                >
                  <span className={`font-extrabold text-center text-sm ${rank <= 3 ? 'text-accent text-base' : 'text-primary'}`}>
                    {rank}
                  </span>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      className="w-[22px] h-4 object-cover rounded-sm shadow-sm flex-shrink-0"
                      src={`https://osu.ppy.sh/images/flags/${cc}.png`}
                      alt={ccUp}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="overflow-hidden">
                      <div className="font-bold truncate">{p.user?.username || '?'}</div>
                      <div className="text-xs text-muted-foreground font-semibold">{ccUp}</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-right text-sm whitespace-nowrap">
                    {Math.round(p.pp || 0).toLocaleString()}pp
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold text-right">
                    {p.global_rank ? `#${p.global_rank.toLocaleString()}` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center mt-4 text-xs text-muted-foreground">
            Top {players.length} · {modeLabel} · {region}
          </p>
        </div>
      )}

      {!loading && !error && searched && players.length === 0 && (
        <div className="w-full max-w-[700px] py-8 text-center text-muted-foreground">
          No players found for the selected filters.
        </div>
      )}
    </div>
  );
};

export default Rankings;
