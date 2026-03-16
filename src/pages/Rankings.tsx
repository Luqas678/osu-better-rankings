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
  const [excludedContinents, setExcludedContinents] = useState<Set<string>>(new Set());
  const [reAddedCountries, setReAddedCountries] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<OsuPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [showContinentDrop, setShowContinentDrop] = useState(false);
  const [showReAddDrop, setShowReAddDrop] = useState(false);
  const [reAddSearch, setReAddSearch] = useState('');

  // Continents not yet excluded
  const availableContinents = useMemo(
    () => Object.keys(CONTINENTS).filter((c) => !excludedContinents.has(c)),
    [excludedContinents]
  );

  // Countries from excluded continents that can be re-added (not already re-added)
  const reAddableCountries = useMemo(() => {
    const codes: string[] = [];
    excludedContinents.forEach((cont) => {
      (CONTINENTS[cont] || []).forEach((c) => {
        if (!reAddedCountries.has(c)) codes.push(c);
      });
    });
    return codes
      .sort((a, b) => (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b))
      .filter((c) =>
        reAddSearch
          ? (COUNTRY_NAMES[c] || c).toLowerCase().includes(reAddSearch.toLowerCase()) ||
            c.toLowerCase().includes(reAddSearch.toLowerCase())
          : true
      );
  }, [excludedContinents, reAddedCountries, reAddSearch]);

  const toggleExcludeContinent = (name: string) => {
    setExcludedContinents((prev) => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    // Remove any re-added countries that belonged to this continent
    // (they get excluded with the continent)
  };

  const removeExcludedContinent = (name: string) => {
    setExcludedContinents((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    // Clean up re-added countries from this continent
    setReAddedCountries((prev) => {
      const next = new Set(prev);
      (CONTINENTS[name] || []).forEach((c) => next.delete(c));
      return next;
    });
  };

  const reAddCountry = (code: string) => {
    setReAddedCountries((prev) => new Set(prev).add(code));
    setReAddSearch('');
  };

  const unReAddCountry = (code: string) => {
    setReAddedCountries((prev) => {
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

    // Build excluded country set: all countries from excluded continents minus re-added ones
    const excludedCodes = new Set<string>();
    excludedContinents.forEach((cont) => {
      (CONTINENTS[cont] || []).forEach((c) => {
        if (!reAddedCountries.has(c)) excludedCodes.add(c);
      });
    });

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
          if (inRegion && !excludedCodes.has(code)) {
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
  }, [mode, region, excludedContinents, reAddedCountries]);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <SlideUp>
        <h2 className="text-4xl font-bold mb-7 text-center">Rankings</h2>
      </SlideUp>

      <SlideUp delay={100}>
        <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-4">
          {/* Game mode */}
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

          {/* Region */}
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border rounded-full px-4 py-2 bg-card"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Exclude continents dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowContinentDrop(!showContinentDrop); setShowReAddDrop(false); }}
              className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between hover:border-primary transition-colors"
            >
              <span>
                Exclude continents
                {excludedContinents.size > 0 && (
                  <span className="ml-2 text-xs font-bold text-destructive">
                    ({excludedContinents.size} excluded)
                  </span>
                )}
              </span>
              <span className={`transition-transform ${showContinentDrop ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showContinentDrop && (
              <div className="absolute z-30 mt-1 w-full bg-card border rounded-xl shadow-lg overflow-hidden">
                {availableContinents.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">All continents excluded</div>
                ) : (
                  availableContinents.map((name) => (
                    <button
                      key={name}
                      onClick={() => { toggleExcludeContinent(name); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      {name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Excluded continent chips */}
          {excludedContinents.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(excludedContinents).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 border border-destructive text-destructive"
                >
                  {name}
                  <button
                    onClick={() => removeExcludedContinent(name)}
                    className="hover:text-foreground transition-colors text-base leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Re-add countries from excluded continents */}
          {excludedContinents.size > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowReAddDrop(!showReAddDrop); setShowContinentDrop(false); }}
                className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between border-accent/40 hover:border-accent transition-colors"
              >
                <span className="text-accent-foreground">
                  Re-add countries from excluded continents
                </span>
                <span className={`transition-transform ${showReAddDrop ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showReAddDrop && (
                <div className="absolute z-30 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-52 flex flex-col overflow-hidden">
                  <input
                    type="text"
                    value={reAddSearch}
                    onChange={(e) => setReAddSearch(e.target.value)}
                    placeholder="Search country..."
                    className="px-3 py-2 border-b text-sm bg-transparent outline-none"
                    autoFocus
                  />
                  <div className="overflow-y-auto">
                    {reAddableCountries.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No countries to re-add</div>
                    ) : (
                      reAddableCountries.map((code) => (
                        <button
                          key={code}
                          onClick={() => reAddCountry(code)}
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-secondary flex items-center gap-2 transition-colors"
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
          )}

          {/* Re-added country chips */}
          {reAddedCountries.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(reAddedCountries).map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary border border-primary/30 text-foreground"
                >
                  <img
                    src={`https://osu.ppy.sh/images/flags/${code}.png`}
                    className="w-3.5 h-auto rounded-sm"
                    alt={code}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  {COUNTRY_NAMES[code] || code}
                  <button
                    onClick={() => unReAddCountry(code)}
                    className="hover:text-destructive transition-colors text-base leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
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
