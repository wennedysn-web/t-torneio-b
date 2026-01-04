
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { TargetBoard } from './components/TargetBoard';
import { TournamentService, supabase, MatchResult } from './services/storage';
import { Competitor, CategoryDef } from './types';
import { Trophy, Search, User, AlertCircle, Medal, BadgePlus, Check, Trash2, Edit2, Save, X, GitMerge, Users, Database, RefreshCw, Settings, Plus, Tag, Wifi, WifiOff, AlertTriangle, Scale, Calendar, ArrowRight, RotateCcw, Gavel, Monitor, Layout, Maximize, Minimize, Swords, Lock, Target, Info, Sliders, ChevronUp, ChevronDown, Maximize2 } from 'lucide-react';

// --- UTILS ---

const formatTargets = (c: Competitor): string => {
  if (!c.targetsHit || c.targetsHit.length === 0) return "";
  return [...c.targetsHit].sort((a, b) => b - a).join(' · ');
};

const compareCompetitors = (a: Competitor, b: Competitor): number => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    const hitsA = [...(a.targetsHit || [])].sort((x, y) => y - x);
    const hitsB = [...(b.targetsHit || [])].sort((x, y) => x - y);
    const len = Math.max(hitsA.length, hitsB.length);
    for (let i = 0; i < len; i++) {
        const valA = hitsA[i] || 0;
        const valB = hitsB[i] || 0;
        if (valA !== valB) return valB - valA; 
    }
    return a.createdAt - b.createdAt;
};

const sortCompetitors = (competitors: Competitor[]) => {
  return [...competitors].sort(compareCompetitors);
};

// --- BRACKET UI COMPONENTS ---

const MatchCard: React.FC<{ p1?: Competitor, p2?: Competitor, score1?: number, score2?: number, winnerId?: string | null }> = ({ p1, p2, score1, score2, winnerId }) => (
  <div className="w-56 flex flex-col bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
    <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-800/50 ${winnerId === p1?.id && p1 ? 'bg-wood-600/10' : ''}`}>
      <span className={`text-[11px] font-bold truncate flex-1 uppercase tracking-tight ${p1 ? 'text-slate-100' : 'text-slate-600 italic'}`}>
        {p1 ? p1.name : 'TBD'}
      </span>
      {score1 !== undefined && <span className={`ml-2 font-black text-xs ${winnerId === p1?.id ? 'text-wood-500' : 'text-slate-500'}`}>{score1}</span>}
    </div>
    <div className={`flex items-center justify-between px-3 py-2 ${winnerId === p2?.id && p2 ? 'bg-wood-600/10' : ''}`}>
      <span className={`text-[11px] font-bold truncate flex-1 uppercase tracking-tight ${p2 ? 'text-slate-100' : 'text-slate-600 italic'}`}>
        {p2 ? p2.name : 'TBD'}
      </span>
      {score2 !== undefined && <span className={`ml-2 font-black text-xs ${winnerId === p2?.id ? 'text-wood-500' : 'text-slate-500'}`}>{score2}</span>}
    </div>
  </div>
);

const SVGConnector: React.FC<{ height: number, type: 'join' | 'straight' }> = ({ height, type }) => (
  <div className="flex items-center" style={{ height }}>
    <svg width="40" height={height} viewBox={`0 0 40 ${height}`} fill="none" className="overflow-visible">
      {type === 'join' ? (
        <path 
          d={`M 0 ${height * 0.25} L 20 ${height * 0.25} L 20 ${height * 0.75} L 0 ${height * 0.75} M 20 ${height * 0.5} L 40 ${height * 0.5}`} 
          stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <path d={`M 0 ${height/2} L 40 ${height/2}`} stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  </div>
);

// --- PAGES ---

const BracketPage: React.FC<{ year: number }> = ({ year }) => {
    const [categories, setCategories] = useState<CategoryDef[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [qualifiers, setQualifiers] = useState<Competitor[]>([]);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      TournamentService.getCategories().then(cats => {
          setCategories(cats);
          if (cats.length > 0) setSelectedCategory('Livre');
      });
    }, []);
  
    useEffect(() => {
      if (!selectedCategory) return;
      const load = async () => {
        setLoading(true);
        const data = await TournamentService.getAll();
        const matchData = await TournamentService.getMatches();
        const filtered = data.filter(c => c.category === selectedCategory && c.year === year);
        
        const bestScoresMap = new Map<string, Competitor>();
        filtered.forEach(c => {
            const key = c.name.toLowerCase();
            const currentBest = bestScoresMap.get(key);
            if (!currentBest || compareCompetitors(c, currentBest) < 0) bestScoresMap.set(key, c);
        });
        
        const sorted = sortCompetitors(Array.from(bestScoresMap.values()));
        setQualifiers(sorted.slice(0, 16));
        setMatches(matchData.filter(m => m.id.startsWith(`${selectedCategory}-${year}`)));
        setLoading(false);
      };
      load();
    }, [selectedCategory, year]);

    const getMatchData = (phase: string, idx: number) => 
      matches.find(m => m.id === `${selectedCategory}-${year}-${phase}-${idx}`);

    const getCompetitor = (id?: string) => qualifiers.find(c => c.id === id);

    if (loading) return (
      <div className="flex flex-col items-center justify-center p-40">
        <RefreshCw className="w-12 h-12 text-wood-500 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Sincronizando Árvore...</p>
      </div>
    );

    const isLivre = selectedCategory === 'Livre';

    return (
      <div className="max-w-[1500px] mx-auto p-4 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 bg-wood-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-wood-900/40 rotate-3">
                <GitMerge className="w-8 h-8 text-white -rotate-3" />
             </div>
             <div>
                <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter">Chaveamento</h1>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                   <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Tempo Real • {selectedCategory}</p>
                </div>
             </div>
          </div>
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
            {categories.map(c => (
              <button 
                key={c.id} onClick={() => setSelectedCategory(c.name)}
                className={`px-8 py-3 rounded-xl font-black text-[11px] transition-all uppercase tracking-widest ${selectedCategory === c.name ? 'bg-wood-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto pb-24 no-scrollbar">
          <div className="flex items-center justify-start min-w-[1300px] px-10">
            {isLivre && (
              <>
                <div className="flex flex-col gap-10">
                  <h6 className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4 text-center">Oitavas de Final</h6>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                    <MatchCard key={i} p1={qualifiers[i*2]} p2={qualifiers[i*2+1]} />
                  ))}
                </div>
                <div className="flex flex-col gap-20 py-20">
                  {[0, 1, 2, 3].map(i => <SVGConnector key={i} height={176} type="join" />)}
                </div>
              </>
            )}

            <div className={`flex flex-col ${isLivre ? 'gap-[132px] mt-16' : 'gap-12'}`}>
              <h6 className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4 text-center">Quartas de Final</h6>
              {[0, 1, 2, 3].map(i => (
                <MatchCard 
                  key={i} 
                  p1={isLivre ? getCompetitor(getMatchData('R16', i*2)?.winnerId) : qualifiers[i*2]} 
                  p2={isLivre ? getCompetitor(getMatchData('R16', i*2+1)?.winnerId) : qualifiers[i*2+1]} 
                />
              ))}
            </div>

            <div className={`flex flex-col ${isLivre ? 'gap-[264px] py-40' : 'gap-24 py-20'}`}>
              {[0, 1].map(i => <SVGConnector key={i} height={isLivre ? 352 : 160} type="join" />)}
            </div>

            <div className={`flex flex-col ${isLivre ? 'gap-[310px] mt-32' : 'gap-32 mt-12'}`}>
              <h6 className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4 text-center">Semi-Final</h6>
              {[0, 1].map(i => (
                <MatchCard 
                  key={i} 
                  p1={getCompetitor(getMatchData('QF', i*2)?.winnerId)} 
                  p2={getCompetitor(getMatchData('QF', i*2+1)?.winnerId)} 
                />
              ))}
            </div>

            <div className="mt-40">
               <SVGConnector height={isLivre ? 640 : 300} type="join" />
            </div>

            <div className="flex flex-col justify-center mt-56">
              <h6 className="text-[9px] font-black text-wood-500 uppercase tracking-[0.4em] mb-6 text-center">Grande Final</h6>
              <MatchCard 
                p1={getCompetitor(getMatchData('SF', 0)?.winnerId)} 
                p2={getCompetitor(getMatchData('SF', 1)?.winnerId)} 
              />
            </div>

            <div className="mt-56">
               <SVGConnector height={80} type="straight" />
            </div>

            <div className="flex flex-col items-center justify-center mt-56 ml-6">
               <div className="relative">
                  <div className="absolute inset-0 bg-wood-500/20 blur-[40px] rounded-full"></div>
                  <div className="relative bg-slate-900 border-2 border-wood-500 w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 shadow-2xl rotate-12 group hover:rotate-0 transition-transform duration-500">
                     <Trophy className="w-12 h-12 text-wood-500" />
                  </div>
               </div>
               <div className="text-center">
                  <p className="text-[9px] font-black text-wood-500 uppercase tracking-widest mb-3">Campeão</p>
                  <div className="bg-wood-600 px-8 py-4 rounded-2xl shadow-[0_10px_40px_rgba(166,114,67,0.4)]">
                     <span className="text-xl font-black text-white uppercase tracking-tighter">
                        {getCompetitor(getMatchData('F', 0)?.winnerId)?.name || '????'}
                     </span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
};

const LeaderboardPage: React.FC<{ year: number }> = ({ year }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [isWideMode, setIsWideMode] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  const [projectorConfig, setProjectorConfig] = useState({
    pageZoom: 1.0,
    cardScale: 1.0,
    nameSize: 1.125,
    rankSize: 1.0,
    scoreSize: 1.875,
    gapSize: 1.0,
    columnWidth: 450
  });

  useEffect(() => {
    const load = async () => {
      const cats = await TournamentService.getCategories();
      setCategories(cats);
      const data = await TournamentService.getAll();
      setCompetitors(data); 
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const filterBestScores = (comps: Competitor[]) => {
      const bestScoresMap = new Map<string, Competitor>();
      comps.forEach(c => {
          const key = `${c.name.toLowerCase()}-${c.category}`;
          const currentBest = bestScoresMap.get(key);
          if (!currentBest || compareCompetitors(c, currentBest) < 0) bestScoresMap.set(key, c);
      });
      return Array.from(bestScoresMap.values());
  };

  const currentYearComps = competitors.filter(c => c.year === year);
  const displayedCompetitors = filterBestScores(currentYearComps);

  const resetConfig = () => {
    setProjectorConfig({
      pageZoom: 1.0,
      cardScale: 1.0,
      nameSize: 1.125,
      rankSize: 1.0,
      scoreSize: 1.875,
      gapSize: 1.0,
      columnWidth: 450
    });
  };

  return (
    <div className={`transition-all duration-700 min-h-screen ${isWideMode ? 'w-full bg-slate-950 px-8' : 'max-w-7xl mx-auto p-4 sm:p-8'}`}>
      
      {/* Wrapper de Zoom Definitivo - Ancorado Top Left sem margens automáticas */}
      <div 
        style={isWideMode ? { 
            width: `${100 / projectorConfig.pageZoom}%`,
            transform: `scale(${projectorConfig.pageZoom})`, 
            transformOrigin: 'top left',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        } : {}}
      >
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 border-b border-slate-900 pb-10">
            <div className="text-center md:text-left">
                <h1 className="text-5xl font-black text-slate-100 mb-2 tracking-tighter uppercase">Ranking Geral</h1>
                <div className="flex items-center gap-4 justify-center md:justify-start">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
                      <Calendar className="w-4 h-4 text-wood-500" />
                      <span className="text-slate-400 font-bold text-xs uppercase">{year}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-wood-600/10 rounded-full border border-wood-600/20">
                      <AlertCircle className="w-4 h-4 text-wood-500" />
                      <span className="text-wood-400 font-black text-[10px] uppercase">Melhor Lançamento</span>
                  </div>
                </div>
            </div>
            
            <div className="flex gap-4">
                {isWideMode && (
                    <button 
                    onClick={() => setShowControls(!showControls)}
                    className={`flex items-center gap-3 px-6 py-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl transition-all active:scale-95 group ${showControls ? 'text-wood-500 border-wood-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Sliders className="w-5 h-5" />
                        <span className="font-black text-xs uppercase tracking-widest">Ajustes</span>
                    </button>
                )}
                <button 
                onClick={() => setIsWideMode(!isWideMode)}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl hover:bg-slate-800 text-slate-300 transition-all active:scale-95 group"
                >
                    {isWideMode ? <Layout className="w-5 h-5 group-hover:text-wood-500" /> : <Monitor className="w-5 h-5 group-hover:text-wood-500" />}
                    <span className="font-black text-xs uppercase tracking-widest">{isWideMode ? "Modo Normal" : "Modo Projetor"}</span>
                </button>
            </div>
        </div>

        {/* Layout de Categorias - Justify Start para manter ancoragem na esquerda */}
        <div className={`transition-all duration-500 ${isWideMode ? 'flex flex-wrap justify-start gap-8 pb-10 items-start' : 'grid gap-10 md:grid-cols-2'}`}>
            {categories.map((cat) => (
            <div 
                key={cat.id} 
                className={`bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full transition-all duration-300`}
                style={{ width: isWideMode ? `${projectorConfig.columnWidth}px` : 'auto', minWidth: isWideMode ? `${projectorConfig.columnWidth}px` : 'auto' }}
            >
                <div className="px-8 py-6 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        < Trophy className="w-7 h-7 text-wood-500" />
                        <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">{cat.name}</h2>
                    </div>
                </div>
                <div 
                    className={`p-6 ${isWideMode ? 'overflow-visible' : 'overflow-y-auto flex-1 custom-scroll'}`}
                    style={{ gap: isWideMode ? `${projectorConfig.gapSize}rem` : '1rem', display: 'flex', flexDirection: 'column' }}
                >
                    {sortCompetitors(displayedCompetitors.filter(c => c.category === cat.name)).map((comp, index) => (
                    <div 
                        key={comp.id} 
                        className={`flex items-center rounded-2xl border border-slate-800 bg-slate-950/50 transition-all hover:bg-slate-800 shadow-sm`}
                        style={{ padding: isWideMode ? `${0.75 * projectorConfig.cardScale}rem 1.25rem` : '1.25rem' }}
                    >
                        <div 
                            className={`flex items-center justify-center rounded-xl font-black mr-5 shrink-0 transition-all ${index < 3 ? 'bg-wood-500 text-slate-950 shadow-lg shadow-wood-500/20' : 'bg-slate-800 text-slate-500'}`}
                            style={{ 
                                width: isWideMode ? `${2.5 * projectorConfig.rankSize}rem` : '3rem', 
                                height: isWideMode ? `${2.5 * projectorConfig.rankSize}rem` : '3rem',
                                fontSize: isWideMode ? `${0.875 * projectorConfig.rankSize}rem` : '1rem'
                            }}
                        >
                        {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                        <div 
                            className="font-bold text-slate-100 truncate uppercase tracking-tight"
                            style={{ fontSize: isWideMode ? `${projectorConfig.nameSize}rem` : '1.125rem' }}
                        >
                            {comp.name}
                        </div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{comp.id}</span>
                            {/* Pontuação detalhada apenas na tela normal conforme solicitado */}
                            {comp.score !== null && !isWideMode && (
                                <>
                                    <span className="text-[10px] text-wood-500/50 font-black">•</span>
                                    <span className="text-[10px] text-wood-500/80 font-black uppercase tracking-tighter bg-wood-500/5 border border-wood-500/10 px-2 py-0.5 rounded-md">
                                    {formatTargets(comp)}
                                    </span>
                                </>
                            )}
                        </div>
                        </div>
                        <div className="text-right pl-4">
                        {comp.score === null ? (
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Pendente</span>
                        ) : (
                            <span 
                                className="font-black text-wood-500 font-mono tracking-tighter"
                                style={{ fontSize: isWideMode ? `${projectorConfig.scoreSize}rem` : '2.25rem' }}
                            >
                                {comp.score}
                            </span>
                        )}
                        </div>
                    </div>
                    ))}
                    {displayedCompetitors.filter(c => c.category === cat.name).length === 0 && (
                    <div className="text-center py-20 text-slate-700 font-black uppercase tracking-widest text-xs">Aguardando Inscrições</div>
                    )}
                </div>
            </div>
            ))}
        </div>
      </div>

      {isWideMode && showControls && (
        <div className="fixed bottom-6 right-6 z-[60] bg-slate-900/95 backdrop-blur-xl border border-wood-500/30 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-8 w-80 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5 text-wood-500" />
                    <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest">Ajuste de Tela</h3>
                </div>
                <button onClick={() => setShowControls(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black text-wood-500 uppercase tracking-widest flex items-center gap-2">
                          <Maximize2 className="w-3 h-3" /> Zoom Geral
                        </label>
                        <span className="text-[10px] font-mono text-wood-500">{(projectorConfig.pageZoom * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" min="0.2" max="2.0" step="0.05" value={projectorConfig.pageZoom} 
                        onChange={(e) => setProjectorConfig({...projectorConfig, pageZoom: parseFloat(e.target.value)})}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-wood-600"
                    />
                    <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold text-center">Âncora: Top-Left (Esquerda Superior)</p>
                </div>
                
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Largura Coluna</label>
                        <span className="text-[10px] font-mono text-wood-500">{projectorConfig.columnWidth}px</span>
                    </div>
                    <input 
                        type="range" min="200" max="1200" step="10" value={projectorConfig.columnWidth} 
                        onChange={(e) => setProjectorConfig({...projectorConfig, columnWidth: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-wood-600"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tamanho do Cartão</label>
                        <span className="text-[10px] font-mono text-wood-500">{(projectorConfig.cardScale * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                        type="range" min="0.4" max="2.0" step="0.05" value={projectorConfig.cardScale} 
                        onChange={(e) => setProjectorConfig({...projectorConfig, cardScale: parseFloat(e.target.value)})}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-wood-600"
                    />
                </div>

                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fonte Pontos</label>
                        <span className="text-[10px] font-mono text-wood-500">{projectorConfig.scoreSize}rem</span>
                    </div>
                    <input 
                        type="range" min="1.0" max="6.0" step="0.2" value={projectorConfig.scoreSize} 
                        onChange={(e) => setProjectorConfig({...projectorConfig, scoreSize: parseFloat(e.target.value)})}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-wood-600"
                    />
                </div>
                
                <button 
                    onClick={resetConfig}
                    className="w-full py-3 bg-slate-950 border border-slate-800 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 hover:text-white transition-all sticky bottom-0"
                >
                    Resetar Padrão
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let finalEmail = user === 'admin' ? 'admin@baladeira.com' : user;
    let finalPass = pass === 'admin' ? 'admin123' : pass;
    const { user: authUser } = await TournamentService.auth.login(finalEmail, finalPass);
    if (authUser) onSuccess();
    else alert('Credenciais inválidas');
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 rounded-[40px] shadow-2xl p-10 border border-slate-800">
        <div className="text-center mb-10">
          <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
            <Lock className="w-10 h-10 text-wood-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Login</h2>
          <p className="text-slate-500 mt-2 font-bold text-xs uppercase tracking-widest">Administração</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="text" value={user} onChange={(e) => setUser(e.target.value)} className="w-full px-6 py-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-bold" placeholder="USUÁRIO" required />
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full px-6 py-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 font-bold" placeholder="SENHA" required />
          <button type="submit" disabled={loading} className="w-full bg-wood-600 text-white py-5 rounded-2xl font-black uppercase shadow-2xl shadow-wood-900/40">{loading ? <RefreshCw className="animate-spin mx-auto" /> : 'ENTRAR'}</button>
        </form>
      </div>
    </div>
  );
};

const RegistrationPage: React.FC<{ year: number }> = ({ year }) => {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [category, setCategory] = useState('');
  const [last, setLast] = useState<Competitor | null>(null);

  useEffect(() => {
    TournamentService.getCategories().then(cats => {
        setCategories(cats);
        if (cats.length > 0) setCategory(cats[0].name);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await TournamentService.register(name, category, year);
    if (res.success) { setLast(res.competitor!); setName(''); }
    else alert(res.message);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-10">
      <h1 className="text-4xl font-black text-slate-100 mb-10 flex items-center gap-5 uppercase tracking-tighter">
        <BadgePlus className="w-10 h-10 text-wood-500" />
        Inscrição
      </h1>
      <div className="bg-slate-900 rounded-[40px] shadow-2xl border border-slate-800 p-10 mb-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em]">Nome Completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-6 py-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-2xl font-black uppercase" placeholder="EX: PEDRO SILVA" required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.3em]">Categoria</label>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(cat => (
                <button key={cat.id} type="button" onClick={() => setCategory(cat.name)} className={`p-6 rounded-3xl border-4 transition-all font-black text-xl uppercase ${category === cat.name ? 'border-wood-600 bg-wood-600/10 text-wood-500' : 'border-slate-800 bg-slate-950 text-slate-600'}`}>{cat.name}</button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-wood-600 text-white py-6 rounded-3xl font-black text-xl uppercase shadow-2xl shadow-wood-900/50">REGISTRAR</button>
        </form>
      </div>
      {last && (
        <div className="bg-slate-900 border-4 border-wood-500/50 rounded-[40px] p-10 text-center shadow-2xl">
          <Check className="w-10 h-10 text-emerald-500 mx-auto mb-6" />
          <div className="bg-slate-950 p-10 rounded-3xl border border-slate-800">
            <div className="text-7xl font-black text-wood-500 font-mono mb-6">{last.id}</div>
            <div className="text-slate-100 font-black text-2xl uppercase">{last.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoringPage: React.FC<{ year: number }> = ({ year }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState<Competitor | null>(null);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);

    useEffect(() => {
        TournamentService.getAll().then(data => setCompetitors(data.filter(c => c.year === year)));
    }, [year]);

    const filtered = competitors.filter(c => 
        searchTerm && (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleScoreSuccess = async () => {
        const data = await TournamentService.getAll();
        setCompetitors(data.filter(c => c.year === year));
        setSelected(null);
        setSearchTerm('');
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-10">
            <h1 className="text-4xl font-black text-slate-100 mb-10 flex items-center gap-5 uppercase tracking-tighter"><Target className="w-10 h-10 text-wood-500" /> Lançamento</h1>
            {!selected ? (
                <div className="relative">
                    <Search className="absolute left-6 top-6 text-slate-600" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-6 rounded-[30px] bg-slate-900 border border-slate-800 text-slate-100 font-black text-xl uppercase tracking-tight outline-none" placeholder="BUSCAR FICHA OU NOME..." />
                    {searchTerm && (
                        <div className="mt-6 space-y-3">
                            {filtered.map(c => (
                                <button key={c.id} onClick={() => setSelected(c)} className="w-full p-6 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-3xl flex justify-between items-center transition-all">
                                    <div className="flex gap-5 items-center">
                                        <div className="text-wood-600 font-black font-mono bg-wood-600/10 px-4 py-2 rounded-xl border border-wood-600/20">{c.id}</div>
                                        <div className="text-left">
                                            <div className="text-slate-100 font-black text-lg uppercase">{c.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-black">{c.category}</div>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-slate-700" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-wood-500 font-black text-xs uppercase mb-10 flex items-center gap-2"><RotateCcw className="w-4 h-4" /> VOLTAR</button>
                    <TargetBoard initialTargets={selected.targetsHit} onScoreConfirm={async (t) => {
                        await TournamentService.updateScore(selected.id, t);
                        await handleScoreSuccess();
                    }} />
                </div>
            )}
        </div>
    );
};

const WelcomeYearModal: React.FC<{ onSelect: (year: number) => void }> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/98 backdrop-blur-2xl p-4">
       <div className="bg-slate-900 rounded-[40px] sm:rounded-[60px] p-6 sm:p-12 max-w-[90vw] sm:max-w-lg w-full shadow-2xl text-center border border-slate-800 flex flex-col items-center">
          <Calendar className="w-10 h-10 sm:w-14 sm:h-14 text-wood-500 mb-6 sm:mb-10" />
          <h2 className="text-3xl sm:text-5xl font-black text-slate-100 mb-2 sm:mb-4 tracking-tighter uppercase">Torneio</h2>
          <p className="text-slate-500 mb-8 sm:mb-12 font-bold uppercase text-xs sm:text-base tracking-widest">Selecione a Temporada</p>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-sm">
             {[2024, 2025].map(y => (
                <button key={y} onClick={() => onSelect(y)} className="rounded-[24px] sm:rounded-[40px] bg-slate-950 hover:bg-wood-600 p-6 sm:p-10 text-center border-2 border-slate-800 transition-all active:scale-95 group flex flex-col items-center justify-center">
                   <span className="block text-2xl sm:text-4xl font-black text-slate-100 mb-1 group-hover:text-white">{y}</span>
                   <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase group-hover:text-white/80">Acessar</span>
                </button>
             ))}
          </div>
       </div>
    </div>
  );
};

const ManageParticipantsPage: React.FC<{ year: number }> = ({ year }) => {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
  
    const load = async () => {
        const all = await TournamentService.getAll();
        setCompetitors(all.filter(c => c.year === year));
    };
    useEffect(() => { load(); }, [year]);

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-10">
            <h1 className="text-4xl font-black text-slate-100 mb-10 flex items-center gap-5 uppercase tracking-tighter"><Users className="w-10 h-10 text-wood-500" /> Gestão</h1>
            <div className="bg-slate-900 rounded-[40px] border border-slate-800 p-8 shadow-2xl">
                <input type="text" placeholder="BUSCAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-[25px] py-6 px-8 text-slate-100 font-black uppercase mb-8" />
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                    {competitors.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <div key={c.id} className="p-5 bg-slate-950/50 border border-slate-800 rounded-3xl flex justify-between items-center">
                            <div className="flex gap-5 items-center">
                                <div className="text-wood-500 font-black font-mono bg-wood-600/10 px-4 py-2 rounded-xl border border-wood-600/20">{c.id}</div>
                                <div className="text-slate-100 font-black text-lg uppercase">{c.name}</div>
                            </div>
                            <button onClick={async () => { if(confirm('EXCLUIR?')) { await TournamentService.deleteCompetitor(c.id); load(); } }} className="text-slate-700 hover:text-red-500"><Trash2 className="w-6 h-6" /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('leaderboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [globalYear, setGlobalYear] = useState<number | null>(null);
  const [isYearConfirmOpen, setIsYearConfirmOpen] = useState(false);

  useEffect(() => {
    TournamentService.auth.getUser().then(user => setIsAdmin(!!user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsAdmin(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const renderView = () => {
    if (!globalYear) return null;
    switch (currentView) {
      case 'leaderboard': return <LeaderboardPage year={globalYear} />;
      case 'bracket': return <BracketPage year={globalYear} />;
      case 'login': return <LoginPage onSuccess={() => { setIsAdmin(true); setCurrentView('registration'); }} />;
      case 'registration': return isAdmin ? <RegistrationPage year={globalYear} /> : <LoginPage onSuccess={() => setIsAdmin(true)} />;
      case 'scoring': return isAdmin ? <ScoringPage year={globalYear} /> : <LoginPage onSuccess={() => setIsAdmin(true)} />;
      case 'manage': return isAdmin ? <ManageParticipantsPage year={globalYear} /> : <LoginPage onSuccess={() => setIsAdmin(true)} />;
      default: return <LeaderboardPage year={globalYear} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 pb-20 selection:bg-wood-600 selection:text-white">
      {!globalYear && <WelcomeYearModal onSelect={setGlobalYear} />}
      {isYearConfirmOpen && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4">
            <div className="bg-slate-900 rounded-[40px] p-12 max-w-sm w-full text-center border border-slate-800">
               <h3 className="text-2xl font-black text-slate-100 mb-10 uppercase">Sair?</h3>
               <div className="flex gap-4">
                  <button onClick={() => setIsYearConfirmOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black">NÃO</button>
                  <button onClick={() => { setGlobalYear(null); setIsYearConfirmOpen(false); }} className="flex-1 py-4 bg-wood-600 text-white font-black rounded-2xl">SIM</button>
               </div>
            </div>
         </div>
      )}
      <Navbar currentView={currentView} onChangeView={setCurrentView} isAdmin={isAdmin} onLogout={async () => { await TournamentService.auth.logout(); setIsAdmin(false); setCurrentView('leaderboard'); }} year={globalYear} onChangeYear={() => setIsYearConfirmOpen(true)} />
      <main className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
