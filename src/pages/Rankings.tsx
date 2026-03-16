import { useState, useCallback, useMemo } from 'react';
import SlideUp from '@/components/SlideUp';
import { COUNTRY_NAMES } from '@/lib/country-names';
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
  const [excludedCountries, setExcludedCountries] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<OsuPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [showExcludeDropdown, setShowExcludeDropdown] = useState(false);
  const [showIncludeDropdown, setShowIncludeDropdown] = useState(false);
  const [excludeSearch, setExcludeSearch] = useState('');
  const [includeSearch, setIncludeSearch] = useState('');

  // All country codes from all continents
  const allCountries = useMemo(() => {
    const codes = new Set<string>();
    Object.values(CONTINENTS).forEach((arr) => arr.forEach((c) => codes.add(c)));
    return Array.from(codes).sort((a, b) =>
      (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b)
    );
  }, []);

  // Countries available to exclude (not yet excluded)
  const availableToExclude = useMemo(() => {
    return allCountries
      .filter((c) => !excludedCountries.has(c))
      .filter((c) =>
        excludeSearch
          ? (COUNTRY_NAMES[c] || c).toLowerCase().includes(excludeSearch.toLowerCase()) ||
            c.toLowerCase().includes(excludeSearch.toLowerCase())
          : true
      );
  }, [allCountries, excludedCountries, excludeSearch]);

  // Countries available to re-include (currently excluded)
  const availableToInclude = useMemo(() => {
    return Array.from(excludedCountries)
      .sort((a, b) => (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b))
      .filter((c) =>
        includeSearch
          ? (COUNTRY_NAMES[c] || c).toLowerCase().includes(includeSearch.toLowerCase()) ||
            c.toLowerCase().includes(includeSearch.toLowerCase())
          : true
      );
  }, [excludedCountries, includeSearch]);

  const excludeCountry = (code: string) => {
    setExcludedCountries((prev) => new Set(prev).add(code));
  };

  const includeCountry = (code: string) => {
    setExcludedCountries((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  };

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlayers([]);
    setSearched(true);

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
          const isExcluded = excludedCountries.has(code);
          if (inRegion && !isExcluded) {
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
  }, [mode, region, excludedCountries]);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <SlideUp>
        <h2 className="text-4xl font-bold mb-7 text-center">Rankings</h2>
      </SlideUp>

      <SlideUp delay={100}>
        <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-4">
          {/* Game mode selector */}
          <div className="flex gap-2 flex-wrap">
            {GAME_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                  mode === m.value ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Region selector */}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border rounded-full px-4 py-2 bg-card"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Exclude countries dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowExcludeDropdown(!showExcludeDropdown); setShowIncludeDropdown(false); }}
              className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between hover:border-primary transition-colors"
            >
              <span>
                Exclude countries
                {excludedCountries.size > 0 && (
                  <span className="ml-2 text-xs font-bold text-destructive">
                    ({excludedCountries.size} excluded)
                  </span>
                )}
              </span>
              <span className={`transition-transform ${showExcludeDropdown ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showExcludeDropdown && (
              <div className="absolute z-30 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-52 flex flex-col overflow-hidden">
                <input
                  type="text"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  placeholder="Search country..."
                  className="px-3 py-2 border-b text-sm bg-transparent outline-none"
                  autoFocus
                />
                <div className="overflow-y-auto">
                  {availableToExclude.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No countries available</div>
                  ) : (
                    availableToExclude.map((code) => (
                      <button
                        key={code}
                        onClick={() => { excludeCountry(code); setExcludeSearch(''); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 transition-colors"
                      >
                        <img
                          src={`https://osu.ppy.sh/images/flags/${code}.png`}
                          className="w-4 h-auto rounded-sm"
                          alt={code}
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        {COUNTRY_NAMES[code] || code}
                        <span className="text-xs text-muted-foreground ml-auto">{code}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Re-include excluded countries dropdown */}
          {excludedCountries.size > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowIncludeDropdown(!showIncludeDropdown); setShowExcludeDropdown(false); }}
                className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between border-destructive/40 hover:border-destructive transition-colors"
              >
                <span className="text-destructive">
                  Re-add excluded countries ({excludedCountries.size})
                </span>
                <span className={`text-destructive transition-transform ${showIncludeDropdown ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showIncludeDropdown && (
                <div className="absolute z-30 mt-1 w-full bg-card border border-destructive/30 rounded-xl shadow-lg max-h-52 flex flex-col overflow-hidden">
                  <input
                    type="text"
                    value={includeSearch}
                    onChange={(e) => setIncludeSearch(e.target.value)}
                    placeholder="Search excluded country..."
                    className="px-3 py-2 border-b text-sm bg-transparent outline-none"
                    autoFocus
                  />
                  <div className="overflow-y-auto">
                    {availableToInclude.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No excluded countries</div>
                    ) : (
                      availableToInclude.map((code) => (
                        <button
                          key={code}
                          onClick={() => { includeCountry(code); setIncludeSearch(''); }}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
                        >
                          <img
                            src={`https://osu.ppy.sh/images/flags/${code}.png`}
                            className="w-4 h-auto rounded-sm"
                            alt={code}
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                          <span className="text-destructive line-through">{COUNTRY_NAMES[code] || code}</span>
                          <span className="text-xs text-muted-foreground ml-auto">re-add</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={fetchRanking}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-full px-8 py-2 font-bold self-end mt-2 transition-transform hover:scale-105 active:scale-95"
          >
            {loading ? 'Searching...' : 'Search ranking'}
          </button>
        </div>
      </SlideUp>

      {loading && (
        <SlideUp>
          <p className="text-muted-foreground animate-pulse mb-4">{progress}</p>
        </SlideUp>
      )}

      {error && (
        <SlideUp>
          <p className="text-destructive mb-4">{error}</p>
        </SlideUp>
      )}

      {!loading && players.length > 0 && (
        <div className="w-full max-w-[700px] bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-primary text-primary-foreground grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 text-xs font-bold uppercase tracking-wider">
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
                    rel="noopener noreferrer"
                    className="font-bold hover:underline truncate"
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
