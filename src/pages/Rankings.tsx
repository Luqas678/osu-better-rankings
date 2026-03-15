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

      <div className="bg-card border border-border rounded-[var(--radius)] p-6 w-full max-w-[700px] shadow-sm mb-8 flex flex-col gap-4">
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
