import { useState, useCallback, useMemo } from 'react';
import SlideUp from '@/components/SlideUp';
import { COUNTRY_NAMES } from '@/lib/country-names';
import {
  fetchOsuRankingPage,
  CONTINENTS,
  GAME_MODES,
  type GameMode,
  type OsuPlayer,
} from '@/lib/osu-api';

const Rankings = () => {
  const [mode, setMode] = useState<GameMode>('osu');
  const [excludedCountries, setExcludedCountries] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<OsuPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showExcludeDrop, setShowExcludeDrop] = useState(false);
  const [showIncludeDrop, setShowIncludeDrop] = useState(false);
  const [excludeSearch, setExcludeSearch] = useState('');
  const [includeSearch, setIncludeSearch] = useState('');

  const allCountries = useMemo(() => {
    const codes = new Set<string>();
    Object.values(CONTINENTS).forEach((arr) => arr.forEach((c) => codes.add(c)));
    return Array.from(codes).sort((a, b) =>
      (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b)
    );
  }, []);

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
    setExcludeSearch('');
  };

  const includeCountry = (code: string) => {
    setExcludedCountries((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
    setIncludeSearch('');
  };

  // Función para excluir un continente entero
  const toggleContinent = (continentCode: string) => {
    const countriesInContinent = CONTINENTS[continentCode as keyof typeof CONTINENTS] || [];
    const allAreExcluded = countriesInContinent.every(code => excludedCountries.has(code));

    setExcludedCountries(prev => {
      const next = new Set(prev);
      countriesInContinent.forEach(code => {
        if (allAreExcluded) {
          next.delete(code); // Si todos estaban fuera, los re-incluimos
        } else {
          next.add(code);    // Si faltaba alguno, los excluimos todos
        }
      });
      return next;
    });
  };

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlayers([]);

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
          if (!excludedCountries.has(code)) {
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
  }, [mode, excludedCountries]);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <SlideUp>
        <h2 className="text-4xl font-bold mb-7 text-center">Rankings</h2>
      </SlideUp>

      <SlideUp delay={100}>
        <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-6">
          
          {/* 1. Selección de Modo de Juego */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground ml-1">Game Mode</p>
            <div className="flex gap-2 flex-wrap">
              {GAME_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${
                    mode === m.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-muted-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Selección de Continentes (NUEVO) */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase text-muted-foreground ml-1">Exclude Continents</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(CONTINENTS).map((cont) => {
                const countriesInCont = CONTINENTS[cont as keyof typeof CONTINENTS];
                const isFullyExcluded = countriesInCont.every(c => excludedCountries.has(c));
                
                return (
                  <button
                    key={cont}
                    onClick={() => toggleContinent(cont)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      isFullyExcluded 
                        ? 'bg-destructive text-destructive-foreground border-destructive' 
                        : 'bg-secondary text-secondary-foreground border-transparent hover:border-muted-foreground'
                    }`}
                  >
                    {cont}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Dropdowns de Países */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <button
                onClick={() => { setShowExcludeDrop(!showExcludeDrop); setShowIncludeDrop(false); }}
                className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between hover:border-primary transition-colors"
              >
                <span>
                  Exclude specific countries
                  {excludedCountries.size > 0 && (
                    <span className="ml-2 text-xs font-bold text-destructive">
                      ({excludedCountries.size} active filters)
                    </span>
                  )}
                </span>
                <span className={`transition-transform ${showExcludeDrop ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {showExcludeDrop && (
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
                          onClick={() => excludeCountry(code)}
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

            {excludedCountries.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowIncludeDrop(!showIncludeDrop); setShowExcludeDrop(false); }}
                  className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold bg-card flex items-center justify-between border-destructive/40 hover:border-destructive transition-colors"
                >
                  <span className="text-destructive">
                    Reset excluded countries
                  </span>
                  <span className={`text-destructive transition-transform ${showIncludeDrop ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {showIncludeDrop && (
                  <div className="absolute z-30 mt-1 w-full bg-card border border-destructive/30 rounded-xl shadow-lg max-h-52 flex flex-col overflow-hidden">
                    <div className="p-2 border-b flex gap-2">
                        <input
                            type="text"
                            value={includeSearch}
                            onChange={(e) => setIncludeSearch(e.target.value)}
                            placeholder="Search excluded..."
                            className="flex-1 px-2 py-1 text-sm bg-transparent outline-none"
                            autoFocus
                        />
                        <button 
                            onClick={() => setExcludedCountries(new Set())}
                            className="text-[10px] uppercase font-bold bg-destructive text-destructive-foreground px-2 rounded hover:opacity-80"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="overflow-y-auto">
                      {availableToInclude.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No excluded countries</div>
                      ) : (
                        availableToInclude.map((code) => (
                          <button
                            key={code}
                            onClick={() => includeCountry(code)}
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
          </div>

          <button
            onClick={fetchRanking}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-full px-8 py-2 font-bold self-end mt-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Searching...' : 'Search ranking'}
          </button>
        </div>
      </SlideUp>

      {/* Mensajes de estado */}
      {loading && (
        <SlideUp>
          <p className="text-muted-foreground animate-pulse mb-4 font-medium">{progress}</p>
        </SlideUp>
      )}

      {error && (
        <SlideUp>
          <p className="text-destructive mb-4 font-semibold">⚠️ {error}</p>
        </SlideUp>
      )}

      {/* Tabla de Resultados */}
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
