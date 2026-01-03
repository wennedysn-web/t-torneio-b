import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TargetBoard } from './components/TargetBoard';
import { TournamentService, supabase, MatchResult } from './services/storage';
import { Competitor, CategoryDef } from './types';
import { Trophy, Search, User, AlertCircle, Medal, BadgePlus, Check, Trash2, Edit2, Save, X, GitMerge, Users, Database, RefreshCw, Settings, Plus, Tag, Wifi, WifiOff, AlertTriangle, Scale, Calendar, ArrowRight, RotateCcw, Gavel, Monitor, Layout, Maximize, Minimize, Swords, Lock, Target, Info } from 'lucide-react';

// --- UTILS ---

const formatTargets = (c: Competitor): string => {
  if (!c.targetsHit || c.targetsHit.length === 0) return "";
  return [...c.targetsHit].sort((a, b) => a - b).join(', ');
};

const isPerfectTie = (a: Competitor, b: Competitor): boolean => {
  if (a.score !== b.score) return false;
  const targetsA = [...(a.targetsHit || [])].sort((x, y) => x - y);
  const targetsB = [...(b.targetsHit || [])].sort((x, y) => x - y);
  if (targetsA.length !== targetsB.length) return false;
  return targetsA.every((val, index) => val === targetsB[index]);
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

// --- COMPONENTS ---

const MatchSlot = ({ competitor, score, isWinner, isTop }: { competitor?: Competitor, score?: number, isWinner?: boolean, isTop?: boolean }) => (
  <div className={`relative flex items-center w-48 h-10 px-3 border-2 rounded-xl transition-all duration-300 ${
    isWinner ? 'border-wood-500 bg-wood-600/20' : 'border-slate-800 bg-slate-900'
  }`}>
    <span className={`text-[11px] font-bold truncate flex-1 ${competitor ? 'text-slate-100' : 'text-slate-600 italic'}`}>
      {competitor ? competitor.name : 'Aguardando...'}
    </span>
    {competitor && score !== undefined && (
      <span className="ml-2 font-black text-wood-500 text-xs">{score}</span>
    )}
  </div>
);

const BracketConnector = ({ type, height }: { type: 'join' | 'straight' | 'final', height?: number }) => {
  if (type === 'join') {
    return (
      <div className="flex flex-col justify-center items-center w-8" style={{ height: height || 80 }}>
        <div className="w-px h-1/2 bg-slate-700 self-end"></div>
        <div className="w-full h-px bg-slate-700"></div>
        <div className="w-px h-1/2 bg-slate-700 self-end"></div>
      </div>
    );
  }
  return <div className="w-8 h-px bg-slate-700"></div>;
};

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
        const data = await TournamentService.getAll();
        const matchData = await TournamentService.getMatches();
        const filtered = data.filter(c => c.category === selectedCategory && c.year === year);
        
        const bestScoresMap = new Map<string, Competitor>();
        filtered.forEach(c => {
            const key = c.name.toLowerCase();
            const currentBest = bestScoresMap.get(key);
            if (!currentBest || compareCompetitors(c, currentBest) < 0) bestScoresMap.set(key, c);
        });
        const finalPool = Array.from(bestScoresMap.values());
        const sorted = sortCompetitors(finalPool);
        
        setQualifiers(sorted.slice(0, selectedCategory === 'Livre' ? 16 : 4));
        setMatches(matchData.filter(m => m.id.startsWith(`${selectedCategory}-${year}`)));
        setLoading(false);
      };
      load();
    }, [selectedCategory, year]);

    const getMatch = (phase: string, idx: number) => {
      return matches.find(m => m.id === `${selectedCategory}-${year}-${phase}-${idx}`);
    };

    const getCompetitor = (id: string) => qualifiers.find(c => c.id === id);

    if (loading) return <div className="flex justify-center p-20"><RefreshCw className="animate-spin text-wood-500" /></div>;

    const isLivre = selectedCategory === 'Livre';

    return (
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 overflow-x-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
             <div className="bg-wood-600/20 p-3 rounded-2xl border border-wood-600/30">
                <GitMerge className="w-8 h-8 text-wood-500" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-100 tracking-tighter uppercase">Chaveamento do Torneio</h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Fase Eliminatória Direta</p>
             </div>
          </div>
          <div className="flex bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
            {categories.map(c => (
              <button 
                key={c.id} onClick={() => setSelectedCategory(c.name)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${selectedCategory === c.name ? 'bg-wood-600 text-white shadow-lg shadow-wood-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* BRACKET VIEWPORT */}
        <div className="min-w-[1100px] flex items-center justify-between py-10">
          
          {/* ROUND 1: OITAVAS (16 Participantes) */}
          {isLivre && (
            <div className="flex flex-col gap-8">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[4px] text-center mb-4">Oitavas de Final</h4>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <MatchSlot competitor={qualifiers[i*2]} isTop />
                  <MatchSlot competitor={qualifiers[i*2+1]} />
                </div>
              ))}
            </div>
          )}

          {/* CONNECTORS OITAVAS -> QUARTAS */}
          {isLivre && (
            <div className="flex flex-col gap-[72px] mt-10">
              {[0, 1, 2, 3].map(i => <BracketConnector key={i} type="join" height={88} />)}
            </div>
          )}

          {/* ROUND 2: QUARTAS (8 Participantes) */}
          <div className={`flex flex-col ${isLivre ? 'gap-[104px] mt-1' : 'gap-12'}`}>
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[4px] text-center mb-4">Quartas de Final</h4>
            {[0, 1, 2, 3].map(i => {
              const m = getMatch('R16', i);
              const p1 = isLivre ? getCompetitor(m?.winnerId || '') : qualifiers[i*2];
              const p2 = isLivre ? undefined : qualifiers[i*2+1]; // Se não livre, inicia aqui
              return (
                <div key={i} className="flex flex-col gap-2">
                  <MatchSlot competitor={p1} isTop />
                  {!isLivre && <MatchSlot competitor={p2} />}
                </div>
              );
            })}
          </div>

          {/* CONNECTORS QUARTAS -> SEMI */}
          <div className={`flex flex-col ${isLivre ? 'gap-[216px] mt-12' : 'gap-32 mt-10'}`}>
             {[0, 1].map(i => <BracketConnector key={i} type="join" height={isLivre ? 180 : 120} />)}
          </div>

          {/* ROUND 3: SEMI (4 Participantes) */}
          <div className={`flex flex-col ${isLivre ? 'gap-[232px] mt-6' : 'gap-48 mt-1'}`}>
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[4px] text-center mb-4">Semi-Final</h4>
            {[0, 1].map(i => {
              const m = getMatch('QF', i);
              const p1 = getCompetitor(m?.winnerId || '');
              return (
                <div key={i} className="flex flex-col gap-2">
                  <MatchSlot competitor={p1} isTop />
                  <div className="h-10"></div> {/* Espaçador para simular a paridade do diagrama */}
                </div>
              );
            })}
          </div>

          {/* CONNECTORS SEMI -> FINAL */}
          <div className="mt-14">
            <BracketConnector type="join" height={isLivre ? 440 : 240} />
          </div>

          {/* ROUND 4: FINAL */}
          <div className="flex flex-col justify-center gap-4">
             <h4 className="text-[10px] font-black text-wood-500 uppercase tracking-[4px] text-center mb-4">Grande Final</h4>
             <div className="flex flex-col gap-2">
                <MatchSlot competitor={getCompetitor(getMatch('SF', 0)?.winnerId || '')} />
                <div className="h-4"></div>
                <MatchSlot competitor={getCompetitor(getMatch('SF', 1)?.winnerId || '')} />
             </div>
          </div>

          {/* WINNER SECTION */}
          <div className="flex flex-col items-center gap-6 ml-10">
              <div className="flex flex-col items-center">
                  <div className="bg-wood-600/10 p-4 rounded-full border border-wood-600/30 mb-4 animate-pulse">
                      <Trophy className="w-10 h-10 text-wood-500" />
                  </div>
                  <h4 className="text-[10px] font-black text-wood-500 uppercase tracking-[4px] mb-4">Campeão</h4>
                  <div className="w-56 h-16 bg-slate-900 border-4 border-wood-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(166,114,67,0.2)]">
                      <span className="text-lg font-black text-white uppercase tracking-tighter">
                        {getCompetitor(getMatch('F', 0)?.winnerId || '')?.name || '???'}
                      </span>
                  </div>
              </div>
          </div>

        </div>

        <div className="mt-20 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl flex items-center gap-6">
            <div className="bg-slate-800 p-3 rounded-xl">
                <Info className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
                As chaves são preenchidas automaticamente baseadas no <span className="text-wood-500 font-bold">Ranking Geral</span>. 
                Apenas os 16 melhores de cada categoria (após as 3 tentativas) são elegíveis para a fase de mata-mata.
            </p>
        </div>
      </div>
    );
};

// --- RESTO DO APP ---

interface CategorySectionProps {
  title: string;
  category: string;
  colorClass: string;
  iconColor: string;
  competitors: Competitor[];
  isWideMode: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, category, colorClass, iconColor, competitors, isWideMode }) => {
  const list = competitors.filter(c => c.category === category);
  const sortedList = sortCompetitors(list);
  
  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className={`px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
            <Trophy className={`w-6 h-6 ${iconColor}`} />
            <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-bold text-slate-100">{title}</h2>
                <span className="text-sm font-medium text-slate-500">({list.length})</span>
            </div>
        </div>
        {!isWideMode && (
            <div className="group relative">
                <Info className="w-4 h-4 text-slate-600 cursor-help" />
                <div className="absolute right-0 top-6 w-48 bg-slate-800 text-[10px] text-slate-300 p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none z-50">
                    Apenas a melhor pontuação de cada participante é exibida no ranking.
                </div>
            </div>
        )}
      </div>
      <div className="overflow-y-auto flex-1 p-4 space-y-3">
        {sortedList.length === 0 ? (
          <div className="text-center py-20 text-slate-600 italic">
            Nenhum competidor registrado.
          </div>
        ) : (
          sortedList.map((comp, index) => {
            const prevComp = index > 0 ? sortedList[index - 1] : null;
            const isTied = prevComp && isPerfectTie(comp, prevComp);
            let displayRank = index + 1;
            if (isTied) {
               let i = index;
               while(i > 0 && isPerfectTie(sortedList[i], sortedList[i-1])) i--;
               displayRank = i + 1;
            }

            return (
              <div key={comp.id} className={`flex items-center p-3 rounded-xl border transition-all duration-300 relative ${isTied ? 'bg-yellow-900/10 border-yellow-800/50 shadow-inner' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800'}`}>
                
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 shrink-0 shadow-lg
                  ${displayRank === 1 ? 'bg-yellow-500 text-slate-950 shadow-yellow-500/20' : 
                    displayRank === 2 ? 'bg-slate-400 text-slate-950 shadow-slate-400/20' : 
                    displayRank === 3 ? 'bg-orange-600 text-slate-950 shadow-orange-600/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}
                `}>
                  {displayRank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <div className="font-semibold text-slate-200 truncate">{comp.name}</div>
                      {isTied && (
                          <span className="text-[9px] font-black uppercase tracking-tighter bg-yellow-600 text-slate-950 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                              Empate Técnico
                          </span>
                      )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-2">
                    <span className="text-wood-500 font-bold">{comp.id}</span>
                    {!isWideMode && comp.score !== null && (
                       <span className="text-slate-600">
                         • Alvos: {formatTargets(comp)}
                       </span>
                    )}
                  </div>
                </div>
                <div className="text-right pl-4">
                  {comp.score === null ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-800 text-slate-500 rounded border border-slate-700">Pendente</span>
                  ) : (
                    <span className="text-xl font-black text-wood-500 drop-shadow-sm">{comp.score}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const LeaderboardPage: React.FC<{ year: number }> = ({ year }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [isWideMode, setIsWideMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const cats = await TournamentService.getCategories();
      setCategories(cats);
      const data = await TournamentService.getAll();
      setCompetitors(data); 
    };
    load();
    const interval = setInterval(load, 10000);
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

  const getColors = (idx: number) => {
    const iconColors = ['text-blue-500', 'text-pink-500', 'text-purple-500', 'text-emerald-500', 'text-amber-500'];
    return { bg: 'bg-slate-800', icon: iconColors[idx % iconColors.length] };
  };

  return (
    <div className={`transition-all duration-500 min-h-screen ${isWideMode ? 'w-full px-4' : 'max-w-7xl mx-auto p-4 sm:p-6'}`}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-slate-100 mb-1 tracking-tight uppercase">Ranking Geral</h1>
            <p className="text-slate-500 font-medium flex items-center gap-2 justify-center md:justify-start">
               <Calendar className="w-4 h-4 text-wood-500" />
               Temporada {year}
            </p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden sm:flex bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 items-center gap-2">
                <AlertCircle className="w-4 h-4 text-wood-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Melhor de 3 Atos</span>
            </div>
            <button 
              onClick={() => setIsWideMode(!isWideMode)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl hover:bg-slate-800 text-slate-300 transition-all active:scale-95 group"
            >
                {isWideMode ? <Layout className="w-5 h-5 group-hover:text-wood-500" /> : <Monitor className="w-5 h-5 group-hover:text-wood-500" />}
                <span className="font-bold text-sm">{isWideMode ? "MODO NORMAL" : "MODO PROJEÇÃO"}</span>
            </button>
        </div>
      </div>

      <div className={`grid gap-6 transition-all duration-300 ${!isWideMode ? 'md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {categories.map((cat, idx) => (
          <CategorySection 
            key={cat.id}
            title={`CAT. ${cat.name.toUpperCase()}`}
            category={cat.name}
            colorClass={getColors(idx).bg}
            iconColor={getColors(idx).icon}
            competitors={displayedCompetitors}
            isWideMode={isWideMode}
          />
        ))}
      </div>
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
      <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-800">
        <div className="text-center mb-8">
          <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Lock className="w-8 h-8 text-wood-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 uppercase">Área Restrita</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">Acesso para organizadores</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="text" value={user} onChange={(e) => setUser(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-wood-500 outline-none"
            placeholder="Usuário" required
          />
          <input 
            type="password" value={pass} onChange={(e) => setPass(e.target.value)}
            className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-wood-500 outline-none"
            placeholder="Senha" required
          />
          <button 
            type="submit" disabled={loading}
            className="w-full bg-wood-600 text-white py-4 rounded-xl font-black shadow-xl hover:bg-wood-700 transition-all flex justify-center items-center"
          >
            {loading ? <RefreshCw className="animate-spin" /> : 'ENTRAR NO SISTEMA'}
          </button>
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
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-black text-slate-100 mb-8 flex items-center gap-3 uppercase tracking-tighter">
        <BadgePlus className="w-8 h-8 text-wood-500" />
        Nova Inscrição
      </h1>
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Nome do Participante</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-wood-500 outline-none text-xl font-bold"
              placeholder="Ex: João da Silva" required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Categoria</label>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(cat => (
                <button
                  key={cat.id} type="button" onClick={() => setCategory(cat.name)}
                  className={`p-5 rounded-2xl border-2 transition-all font-bold text-lg ${category === cat.name ? 'border-wood-600 bg-wood-600/10 text-wood-400' : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-wood-600 text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-wood-900/40 hover:bg-wood-700 active:scale-95 transition-all">
            GERAR FICHA DE INSCRIÇÃO
          </button>
        </form>
      </div>
      {last && (
        <div className="bg-slate-900 border-2 border-wood-600/30 rounded-3xl p-8 text-center animate-bounce-in shadow-2xl">
          <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-black text-slate-100 mb-6 uppercase">Sucesso!</h3>
          <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 inline-block w-full">
            <div className="text-[60px] font-black text-wood-500 leading-none mb-4 font-mono">{last.id}</div>
            <div className="text-slate-400 font-bold text-lg uppercase">{last.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ScoringPage: React.FC<{ year: number }> = ({ year }) => {
    const [activeTab, setActiveTab] = useState<'classificatoria' | 'matamata'>('classificatoria');
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
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-black text-slate-100 mb-8 flex items-center gap-4 uppercase tracking-tighter">
                <Target className="w-8 h-8 text-wood-500" /> Lançar Pontos
            </h1>
            <div className="flex bg-slate-900 p-2 rounded-2xl border border-slate-800 mb-8 w-fit">
                <button onClick={() => setActiveTab('classificatoria')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'classificatoria' ? 'bg-slate-800 text-wood-400' : 'text-slate-500'}`}>Classificatória</button>
                <button onClick={() => setActiveTab('matamata')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'matamata' ? 'bg-slate-800 text-wood-400' : 'text-slate-500'}`}>Mata-mata</button>
            </div>

            {!selected ? (
                <div className="relative animate-in fade-in duration-300">
                    <Search className="absolute left-5 top-5 text-slate-500" />
                    <input 
                        type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 font-bold focus:border-wood-500 outline-none shadow-2xl"
                        placeholder="Busque pelo Nome ou Ficha..."
                    />
                    {searchTerm && (
                        <div className="mt-4 space-y-2">
                            {filtered.map(c => (
                                <button key={c.id} onClick={() => setSelected(c)} className="w-full p-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left flex justify-between items-center transition-all">
                                    <div className="flex gap-4 items-center">
                                        <div className="text-wood-600 font-black font-mono bg-wood-600/5 px-3 py-1 rounded-lg border border-wood-600/10">{c.id}</div>
                                        <div>
                                            <div className="text-slate-100 font-bold">{c.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">{c.category}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {c.score !== null ? (
                                            <div className="text-emerald-500 font-black font-mono text-lg">{c.score}</div>
                                        ) : (
                                            <div className="px-3 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-700 uppercase">Pendente</div>
                                        )}
                                        <ArrowRight className="text-slate-600" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-wood-500 font-bold flex items-center gap-2">
                           <RotateCcw className="w-4 h-4" /> VOLTAR
                        </button>
                        <div className="text-right">
                           <div className="text-wood-500 font-black text-2xl font-mono leading-none">{selected.id}</div>
                           <div className="text-slate-400 font-bold text-sm uppercase">{selected.name}</div>
                        </div>
                    </div>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 animate-fade-in">
       <div className="bg-slate-900 rounded-[40px] p-10 max-w-md w-full shadow-[0_0_100px_rgba(166,114,67,0.1)] text-center border border-slate-800 transform scale-100 transition-all">
          <div className="bg-wood-600/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border border-wood-600/20">
             <Calendar className="w-12 h-12 text-wood-500" />
          </div>
          <h2 className="text-4xl font-black text-slate-100 mb-3 tracking-tighter uppercase">Bem-vindo</h2>
          <p className="text-slate-500 mb-10 font-medium">Selecione o ano do torneio</p>
          <div className="grid grid-cols-2 gap-4">
             {[2024, 2025].map(y => (
                <button 
                   key={y} onClick={() => onSelect(y)}
                   className="group relative overflow-hidden rounded-3xl bg-slate-950 hover:bg-wood-600 transition-all duration-300 p-8 text-center border border-slate-800 hover:border-wood-500 hover:shadow-[0_10px_40px_rgba(166,114,67,0.3)]"
                >
                   <span className="block text-3xl font-black text-slate-100 group-hover:text-white mb-2">{y}</span>
                   <span className="text-[10px] font-black tracking-[3px] text-slate-600 group-hover:text-wood-200 uppercase flex items-center justify-center gap-1">
                      Acessar <ArrowRight className="w-3 h-3" />
                   </span>
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
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-black text-slate-100 mb-8 flex items-center gap-4 uppercase tracking-tighter">
                <Users className="w-8 h-8 text-wood-500" /> Gerenciar
            </h1>
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 mb-8">
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-4 text-slate-600" />
                    <input 
                        type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-slate-100 outline-none focus:border-wood-600 font-bold"
                    />
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {competitors.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <div key={c.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center group">
                            <div className="flex gap-4 items-center">
                                <div className="text-wood-600 font-black font-mono bg-wood-600/5 px-3 py-1 rounded-lg border border-wood-600/10">{c.id}</div>
                                <div>
                                    <div className="text-slate-100 font-bold">{c.name}</div>
                                    <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{c.category}</div>
                                </div>
                            </div>
                            <button onClick={async () => { if(confirm('Excluir?')) { await TournamentService.deleteCompetitor(c.id); load(); } }} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-3xl">
                <h3 className="text-red-500 font-black uppercase text-sm mb-4 tracking-widest">Ações de Risco</h3>
                <button onClick={async () => { if(confirm('Limpar banco?')) { await TournamentService.deleteAllCompetitors(); load(); } }} className="px-6 py-3 bg-red-600 text-white font-black rounded-xl text-xs hover:bg-red-700 shadow-xl shadow-red-900/20">
                    LIMPAR TODOS OS DADOS (RESET)
                </button>
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
         <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 rounded-3xl p-8 max-sm:mx-4 w-full max-w-sm shadow-2xl border border-slate-800">
               <h3 className="text-xl font-black text-slate-100 mb-4 tracking-tighter uppercase">Alterar Temporada?</h3>
               <p className="text-slate-500 text-sm mb-8 font-medium">Você voltará para a tela de seleção de ano. Continuar?</p>
               <div className="flex gap-4">
                  <button onClick={() => setIsYearConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition-all uppercase text-xs">Não</button>
                  <button onClick={() => { setGlobalYear(null); setIsYearConfirmOpen(false); }} className="flex-1 py-3 bg-wood-600 text-white font-bold rounded-xl shadow-lg shadow-wood-900/20 uppercase text-xs">Sim</button>
               </div>
            </div>
         </div>
      )}
      <Navbar currentView={currentView} onChangeView={setCurrentView} isAdmin={isAdmin} onLogout={async () => { await TournamentService.auth.logout(); setIsAdmin(false); setCurrentView('leaderboard'); }} year={globalYear} onChangeYear={() => setIsYearConfirmOpen(true)} />
      <main className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {renderView()}
      </main>
    </div>
  );
};

export default App;