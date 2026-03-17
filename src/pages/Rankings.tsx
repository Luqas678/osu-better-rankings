"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import SlideUp from '@/components/SlideUp';
import { COUNTRY_NAMES } from '@/lib/country-names';
import {
  fetchOsuRankingPage,
  CONTINENTS,
  GAME_MODES,
  type GameMode,
  type OsuPlayer,
} from '@/lib/osu-api';

const CACHE_DURATION = 3 * 60 * 60 * 1000; // 3 horas
const STORAGE_KEY = 'osu_rankings_cache_v1';

interface CacheEntry {
  players: OsuPlayer[];
  timestamp: number;
}

// Función para leer cache de forma síncrona
const getSavedCache = (): Partial<Record<GameMode, CacheEntry>> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const Rankings = () => {
  const [mode, setMode] = useState<GameMode>('osu');
  const [excludedCountries, setExcludedCountries] = useState<Set<string>>(new Set());
  const [appliedExcludedCountries, setAppliedExcludedCountries] = useState<Set<string>>(new Set());
  
  // Carga del cache directamente al inicializar el estado
  const [playersByMode, setPlayersByMode] = useState<Partial<Record<GameMode, CacheEntry>>>(getSavedCache);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showExcludeDrop, setShowExcludeDrop] = useState(false);
  const [showIncludeDrop, setShowIncludeDrop] = useState(false);
  const [excludeSearch, setExcludeSearch] = useState('');
  const [includeSearch, setIncludeSearch] = useState('');

  // Sincronizar cambios entre diferentes pestañas/ventanas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setPlayersByMode(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Guardar en localStorage cada vez que actualizamos datos
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playersByMode));
  }, [playersByMode]);

  const allCountries = useMemo(() => {
    const codes = new Set<string>();
    if (CONTINENTS) {
      Object.values(CONTINENTS).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach((c) => codes.add(c));
      });
    }
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

  const toggleContinent = (continentName: string) => {
    const countriesInContinent = (CONTINENTS as any)[continentName] || [];
    if (!countriesInContinent.length) return;
    const allAreExcluded = countriesInContinent.every((code: string) => excludedCountries.has(code));
    setExcludedCountries((prev) => {
      const next = new Set(prev);
      countriesInContinent.forEach((code: string) => {
        allAreExcluded ? next.delete(code) : next.add(code);
      });
      return next;
    });
  };

  // Datos actuales
  const currentModeCache = playersByMode[mode];
  const modePlayers = currentModeCache?.players ?? [];

  const players = useMemo(() => {
    if (!modePlayers.length) return [];
    return modePlayers
      .filter((p) => !appliedExcludedCountries.has(p.user?.country_code))
      .slice(0, 100);
  }, [modePlayers, appliedExcludedCountries]);

  const fetchRanking = useCallback(async () => {
    setAppliedExcludedCountries(new Set(excludedCountries));
    
    const now = Date.now();
    const cachedEntry = playersByMode[mode];

    // Check de cache robusto
    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION)) {
      console.log("⚡ Cache detectado: No se llamará a la API");
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const all: OsuPlayer[] = [];
      for (let page = 1; page <= 20; page++) {
        setProgress(`Fetching page ${page}/20...`);
        const ranking = await fetchOsuRankingPage(mode, page);
        if (!ranking || !ranking.length) break;
        all.push(...ranking);
      }

      setPlayersByMode((prev) => ({
        ...prev,
        [mode]: { players: all, timestamp: Date.now() },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [excludedCountries, mode, playersByMode]);

  const isCacheValid = currentModeCache && (Date.now() - currentModeCache.timestamp < CACHE_DURATION);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <SlideUp>
        <h2 className="text-4xl font-bold mb-7 text-center">Rankings</h2>
      </SlideUp>

      <SlideUp delay={100}>
        <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-6">
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

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest ml-1">Exclude continent</p>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(CONTINENTS || {}).map((cont) => {
                const countriesInCont = (CONTINENTS as any)[cont] || [];
                const isFullyExcluded = countriesInCont.length > 0 && countriesInCont.every((c: string) => excludedCountries.has(c));
                return (
                  <button
                    key={cont}
                    onClick={() => toggleContinent(cont)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      isFullyExcluded ? 'bg-destructive text-destructive-foreground' : 'bg-secondary'
                    }`}
                  >
                    {cont}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Excluir Países */}
          <div className="relative">
            <button
              onClick={() => { setShowExcludeDrop(!showExcludeDrop); setShowIncludeDrop(false); }}
              className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold flex items-center justify-between"
            >
              <span>Exclude countries {excludedCountries.size > 0 && `(${excludedCountries.size})`}</span>
              <span>▾</span>
            </button>
            {showExcludeDrop && (
              <div className="absolute z-30 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-52 overflow-hidden flex flex-col">
                <input
                  type="text"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  placeholder="Search..."
                  className="px-3 py-2 border-b bg-transparent outline-none text-sm"
                />
                <div className="overflow-y-auto">
                  {availableToExclude.map((code) => (
                    <button key={code} onClick={() => excludeCountry(code)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-destructive/10 flex items-center gap-2">
                      <img src={`https://osu.ppy.sh/images/flags/${code}.png`} className="w-4 h-auto" alt={code} />
                      {COUNTRY_NAMES[code] || code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botón de Acción Principal */}
          <button
            onClick={fetchRanking}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-full px-8 py-2 font-bold self-end mt-2 hover:scale-105 transition-transform disabled:opacity-50"
          >
            {loading ? 'Searching...' : isCacheValid ? 'Apply Filters (Cached)' : 'Search Ranking'}
          </button>
        </div>
      </SlideUp>

      {/* Resultados */}
      {loading && <p className="text-muted-foreground animate-pulse mb-4">{progress}</p>}
      
      {!loading && players.length > 0 && (
        <div className="w-full max-w-[700px] bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-primary text-primary-foreground grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 text-xs font-bold uppercase">
            <span>#</span><span>Player</span><span className="text-right">PP</span><span className="text-right">Rank</span>
          </div>
          {players.map((p, i) => (
            <div key={i} className="grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 border-b items-center hover:bg-muted/50 transition-colors">
              <span className="font-bold text-primary">{i + 1}</span>
              <div className="flex items-center gap-3">
                <img src={`https://osu.ppy.sh/images/flags/${(p.user?.country_code || '').toUpperCase()}.png`} className="w-5 h-auto rounded-sm" alt="flag" />
                <a href={`https://osu.ppy.sh/users/${p.user?.id}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
                  {p.user?.username}
                </a>
              </div>
              <span className="text-right font-bold">{Math.round(p.pp).toLocaleString()}pp</span>
              <span className="text-right text-xs text-muted-foreground">#{p.global_rank?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rankings;
