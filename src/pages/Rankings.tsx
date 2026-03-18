"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import SlideUp from '@/components/SlideUp';
import { COUNTRY_NAMES } from '@/lib/country-names';
import {
  fetchAllRankings,
  CONTINENTS,
  GAME_MODES,
  type GameMode,
  type OsuPlayer,
} from '@/lib/osu-api';

const CACHE_DURATION = 3 * 60 * 60 * 1000;
const STORAGE_KEY = 'osu_rankings_cache_v1';

interface CacheEntry {
  players: OsuPlayer[];
  timestamp: number;
}

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
  const [playersByMode, setPlayersByMode] = useState<Partial<Record<GameMode, CacheEntry>>>(getSavedCache);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [showExcludeDrop, setShowExcludeDrop] = useState(false);
  const [excludeSearch, setExcludeSearch] = useState('');

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setPlayersByMode(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

    if (cachedEntry && (now - cachedEntry.timestamp < CACHE_DURATION)) {
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('Fetching ranking (server-side)...');
    try {
      const { players: all, cached } = await fetchAllRankings(mode);
      if (cached) {
        setProgress('Loaded from server cache');
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

  const hasCachedData = !!currentModeCache && (Date.now() - currentModeCache.timestamp < CACHE_DURATION);

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen w-full max-w-7xl mx-auto">
      <SlideUp>
        <h2 className="text-4xl font-bold mb-7 text-center">Rankings</h2>
      </SlideUp>

      <SlideUp delay={100}>
        <div className="bg-card border p-6 w-full max-w-[700px] rounded-xl shadow-sm mb-8 flex flex-col gap-6">
          
          {/* Modos */}
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

          {/* Continentes */}
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
                      isFullyExcluded ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-secondary text-secondary-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {cont}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Países */}
          <div className="relative">
            <button
              onClick={() => setShowExcludeDrop(!showExcludeDrop)}
              className="w-full border rounded-xl px-4 py-2.5 text-left text-sm font-semibold flex items-center justify-between hover:border-primary transition-colors"
            >
              <span>Exclude countries {excludedCountries.size > 0 && <span className="text-destructive ml-1">({excludedCountries.size})</span>}</span>
              <span className={`transition-transform ${showExcludeDrop ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {showExcludeDrop && (
              <div className="absolute z-30 mt-1 w-full bg-card border rounded-xl shadow-lg max-h-52 overflow-hidden flex flex-col">
                <input
                  type="text"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  placeholder="Search country..."
                  className="px-3 py-2 border-b bg-transparent outline-none text-sm"
                  autoFocus
                />
                <div className="overflow-y-auto">
                  {availableToExclude.map((code) => (
                    <button key={code} onClick={() => excludeCountry(code)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-destructive/10 hover:text-destructive flex items-center gap-2">
                      <img src={`https://osu.ppy.sh/images/flags/${code}.png`} className="w-4 h-auto rounded-sm" alt={code} />
                      {COUNTRY_NAMES[code] || code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Excluded countries tags */}
          {excludedCountries.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(excludedCountries).sort((a, b) => (COUNTRY_NAMES[a] || a).localeCompare(COUNTRY_NAMES[b] || b)).map((code) => (
                <button
                  key={code}
                  onClick={() => includeCountry(code)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <img src={`https://osu.ppy.sh/images/flags/${code}.png`} className="w-3 h-auto rounded-sm" alt={code} />
                  {COUNTRY_NAMES[code] || code} ✕
                </button>
              ))}
            </div>
          )}

          {/* Botón Principal */}
          <button
            onClick={fetchRanking}
            disabled={loading}
            className="bg-primary text-primary-foreground rounded-full px-8 py-2 font-bold self-end mt-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Searching...' : hasCachedData ? 'Apply filters' : 'Search ranking'}
          </button>
        </div>
      </SlideUp>

      {/* Resultados */}
      {loading && <p className="text-muted-foreground animate-pulse mb-4">{progress}</p>}
      {error && <p className="text-destructive mb-4">{error}</p>}

      {!loading && players.length > 0 && (
        <div className="w-full max-w-[700px] bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-primary text-primary-foreground grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 text-xs font-bold uppercase tracking-wider">
            <span>#</span><span>Player</span><span className="text-right">PP</span><span className="text-right">Rank</span>
          </div>
          {players.map((p, i) => (
            <div key={i} className="grid grid-cols-[50px_1fr_100px_80px] px-5 py-3 border-b items-center hover:bg-muted/50 transition-colors">
              <span className="font-bold text-primary">{i + 1}</span>
              <div className="flex items-center gap-3">
                <img src={`https://osu.ppy.sh/images/flags/${(p.user?.country_code || '').toUpperCase()}.png`} className="w-5 h-auto rounded-sm" alt="flag" />
                <a href={`https://osu.ppy.sh/users/${p.user?.id}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline truncate">
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
