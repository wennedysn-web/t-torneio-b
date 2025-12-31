import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TargetBoard } from './components/TargetBoard';
import { TournamentService, supabase, MatchResult } from './services/storage';
import { Competitor, CategoryDef } from './types';
import { Trophy, Search, User, AlertCircle, Medal, BadgePlus, Check, Trash2, Edit2, Save, X, GitMerge, Users, Database, RefreshCw, Settings, Plus, Tag, Wifi, WifiOff, AlertTriangle, Scale, Calendar, ArrowRight, RotateCcw, Gavel, Monitor, Layout, Maximize, Minimize, Swords } from 'lucide-react';

// --- UTILS ---

// Formata a lista de alvos para exibição (Ordenado Crescente: 10, 12, 24...)
const formatTargets = (c: Competitor): string => {
  if (!c.targetsHit || c.targetsHit.length === 0) return "";
  return [...c.targetsHit].sort((a, b) => a - b).join(', ');
};

// Verifica se dois competidores estão PERFEITAMENTE empatados (Mesmo Score TOTAL e Mesmos ALVOS individuais)
const isPerfectTie = (a: Competitor, b: Competitor): boolean => {
  if (a.score !== b.score) return false;
  
  // Ordena os alvos para comparar arrays (ex: [10, 24] deve ser igual a [10, 24])
  const targetsA = [...(a.targetsHit || [])].sort((x, y) => x - y);
  const targetsB = [...(b.targetsHit || [])].sort((x, y) => x - y);

  if (targetsA.length !== targetsB.length) return false;

  return targetsA.every((val, index) => val === targetsB[index]);
};

// Sort Logic: Total Score -> Deep Target Comparison (Highest to Lowest) -> Created Date
const sortCompetitors = (competitors: Competitor[]) => {
  return [...competitors].sort((a, b) => {
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    
    // 1. Total Score
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    // 2. Deep Tie-break: Compare individual targets from Highest to Lowest
    // Sort both arrays descending (24, 22, 20...) for comparison logic
    const hitsA = [...(a.targetsHit || [])].sort((x, y) => y - x);
    const hitsB = [...(b.targetsHit || [])].sort((x, y) => y - x);

    const len = Math.max(hitsA.length, hitsB.length);

    for (let i = 0; i < len; i++) {
        const valA = hitsA[i] || 0; // Use 0 if ran out of targets
        const valB = hitsB[i] || 0;

        if (valA !== valB) {
            // The one with the higher individual target at this rank wins
            return valB - valA; 
        }
    }

    // 3. Fallback: Creation Date (First to register)
    return a.createdAt - b.createdAt; 
  });
};

// --- COMPONENTS ---

interface CategorySectionProps {
  title: string;
  category: string;
  colorClass: string;
  iconColor: string;
  competitors: Competitor[];
}

const CategorySection: React.FC<CategorySectionProps> = ({ title, category, colorClass, iconColor, competitors }) => {
  const list = competitors.filter(c => c.category === category);
  // Sort ensures leaderboard reflects the tie-break rules
  const sortedList = sortCompetitors(list);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[400px]">
      <div className={`px-6 py-4 border-b border-gray-100 ${colorClass} bg-opacity-10 flex items-center gap-3`}>
        <Trophy className={`w-6 h-6 ${iconColor}`} />
        <div className="flex items-baseline gap-2">
            <h2 className={`text-xl font-bold ${iconColor}`}>{title}</h2>
            <span className={`text-sm font-medium ${iconColor} opacity-80`}>({list.length})</span>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-4">
        {sortedList.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            Nenhum competidor registrado.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedList.map((comp, index) => {
              const prevComp = index > 0 ? sortedList[index - 1] : null;
              const isTied = prevComp && isPerfectTie(comp, prevComp);
              
              // Define a posição visual. Se empatado com o anterior, mantém a mesma posição visual.
              let displayRank = index + 1;
              if (isTied) {
                 // Busca para trás para achar o primeiro do grupo de empate
                 let i = index;
                 while(i > 0 && isPerfectTie(sortedList[i], sortedList[i-1])) {
                   i--;
                 }
                 displayRank = i + 1;
              }

              return (
                <div key={comp.id} className={`flex items-center p-3 rounded-xl border transition-colors relative ${isTied ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                  
                  {/* Rank Badge */}
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 shrink-0
                    ${displayRank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                      displayRank === 2 ? 'bg-gray-200 text-gray-700' : 
                      displayRank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500 border border-gray-200'}
                  `}>
                    {displayRank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="font-semibold text-gray-800 truncate">{comp.name}</div>
                        {isTied && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Scale className="w-3 h-3" />
                                Empate Técnico
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 font-mono flex flex-wrap gap-x-2 gap-y-1">
                      <span>Insc: {comp.id}</span>
                      {comp.score !== null && (
                         <span className="text-gray-400" title="Alvos atingidos (Critério de Desempate)">
                           • Alvos: {formatTargets(comp)}
                         </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right pl-4">
                    {comp.score === null ? (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-500 rounded-md">Pendente</span>
                    ) : (
                      <span className="text-xl font-bold text-wood-700">{comp.score}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- PAGES ---

// 1. Leaderboard Page
const LeaderboardPage: React.FC<{ year: number }> = ({ year }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controlar o modo de exibição (Normal vs Projeção)
  const [isWideMode, setIsWideMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await TournamentService.getCategories();
        setCategories(cats);

        const data = await TournamentService.getAll();
        setCompetitors(data); 

        setError(null);
      } catch (e: any) {
        console.error("Erro no Leaderboard:", e);
      }
    };
    
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter by year passed by Prop
  const displayedCompetitors = competitors.filter(c => c.year === year);

  // Helper to generate a consistent color based on index
  const getColors = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50', icon: 'text-blue-600' },
      { bg: 'bg-pink-50', icon: 'text-pink-600' },
      { bg: 'bg-purple-50', icon: 'text-purple-600' },
      { bg: 'bg-green-50', icon: 'text-green-600' },
      { bg: 'bg-orange-50', icon: 'text-orange-600' },
    ];
    return colors[index % colors.length];
  };

  // Define quantas colunas teremos baseado no número de categorias
  // Se estiver no modo Wide, tentamos colocar todas na mesma linha (se couberem)
  const gridStyle = isWideMode && categories.length > 0
    ? { 
        gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` 
      }
    : {};

  return (
    <div className={`transition-all duration-500 ${isWideMode ? 'w-full px-4' : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'}`}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Classificação Geral</h1>
            <p className="text-gray-500">Torneio de Baladeira - Resultados {year}</p>
        </div>
        
        {/* Botão de Alternância de Layout */}
        <button 
          onClick={() => setIsWideMode(!isWideMode)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-wood-50 text-wood-700 transition-all active:scale-95"
          title={isWideMode ? "Voltar ao Layout Padrão" : "Modo Projeção (Tela Cheia)"}
        >
            {isWideMode ? (
                <>
                    <Layout className="w-5 h-5" />
                    <span className="font-medium hidden sm:inline">Modo Padrão</span>
                </>
            ) : (
                <>
                    <Monitor className="w-5 h-5" />
                    <span className="font-medium hidden sm:inline">Modo Projeção</span>
                </>
            )}
        </button>
      </div>

      <div 
        className={`grid gap-6 transition-all duration-300 ${
            // Se não for modo Wide, usa as classes padrão do Tailwind
            !isWideMode ? (categories.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-2') : 'grid-cols-1 md:grid-cols-2' // Fallback para mobile no modo wide
        }`}
        style={window.innerWidth >= 768 ? gridStyle : {}} // Aplica colunas dinâmicas apenas em desktop/projetor
      >
        {categories.map((cat, idx) => {
          const colors = getColors(idx);
          return (
            <CategorySection 
              key={cat.id}
              title={`Categoria ${cat.name}`}
              category={cat.name}
              colorClass={colors.bg}
              iconColor={colors.icon}
              competitors={displayedCompetitors}
            />
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">
              {error ? "Erro ao carregar dados." : "Nenhuma categoria cadastrada ou carregando..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Login Page
const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let finalEmail = user.trim();
      let finalPass = pass.trim();

      // --- LÓGICA DE ATALHO ---
      if (finalEmail.toLowerCase() === 'admin') {
        finalEmail = 'admin@baladeira.com';
        if (finalPass === 'admin') {
          finalPass = 'admin123';
        }
      }

      const { user: authUser, error: authError } = await TournamentService.auth.login(finalEmail, finalPass);

      if (authError) {
        console.error("Erro Auth:", authError);
        setError('Credenciais inválidas ou erro de conexão.');
      } else if (authUser) {
        await TournamentService.initDefaults();
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro inesperado ao tentar logar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-wood-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-wood-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
          <p className="text-gray-500 mt-2">Área administrativa segura</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input 
              type="text" 
              value={user} 
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none transition-all"
              placeholder="Digite o usuário"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none transition-all"
              placeholder="Digite a senha"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-wood-600 text-white py-3 rounded-lg font-bold hover:bg-wood-700 transition-colors shadow-lg shadow-wood-600/20 flex justify-center items-center ${loading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Entrar'}
          </button>
        </form>
        <p className="text-xs text-center text-gray-400 mt-4">
          Modo Offline disponível: Use 'admin' / 'admin'
        </p>
      </div>
    </div>
  );
};

// 3. Registration Page
const RegistrationPage: React.FC<{ year: number }> = ({ year }) => {
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [category, setCategory] = useState<string>('');
  const [lastRegistered, setLastRegistered] = useState<Competitor | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadCats = async () => {
      try {
        await TournamentService.initDefaults();
        const cats = await TournamentService.getCategories();
        setCategories(cats);
        if (cats.length > 0) setCategory(cats[0].name);
      } catch (e) {
        console.error("Erro loadReg:", e);
      }
    };
    loadCats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!category) {
      setError("Selecione uma categoria.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass the selected YEAR to the service
      const result = await TournamentService.register(name, category, year);
      
      if (result.success && result.competitor) {
        setLastRegistered(result.competitor);
        setName(''); 
        setError('');
      } else {
        setError(result.message);
        setLastRegistered(null);
      }
    } catch (err) {
      setError('Erro ao processar inscrição.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <BadgePlus className="w-8 h-8 text-wood-600" />
        Nova Inscrição ({year})
      </h1>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Participante</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none text-lg"
              placeholder="Nome completo"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-2">Permitido até 3 inscrições por nome neste ano.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
            {categories.length === 0 ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm">Carregando categorias ou nenhuma cadastrada...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`p-4 rounded-xl border-2 transition-all text-center font-medium ${
                      category === cat.name 
                      ? 'border-wood-600 bg-wood-50 text-wood-800' 
                      : 'border-gray-200 hover:border-wood-200'
                    }`}
                    disabled={isSubmitting}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || categories.length === 0}
            className={`w-full bg-wood-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-wood-700 transition-colors shadow-lg ${isSubmitting || categories.length === 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Salvando...' : 'Gerar Inscrição'}
          </button>
        </form>
      </div>

      {lastRegistered && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center animate-fade-in">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-800 mb-2">Inscrição Realizada!</h3>
          <p className="text-green-700 mb-6">O participante foi cadastrado com sucesso.</p>
          
          <div className="bg-white p-6 rounded-xl border border-green-100 inline-block w-full max-w-sm">
            <div className="text-sm text-gray-500 mb-1">Número de Inscrição ({lastRegistered.year})</div>
            <div className="text-4xl font-mono font-bold text-gray-900 tracking-wider mb-2">
              {lastRegistered.id}
            </div>
            <div className="text-sm font-medium text-gray-600">
              {lastRegistered.name} • {lastRegistered.category}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MATA-MATA SCORING COMPONENT ---
const KnockoutMatchScoring: React.FC<{ 
    p1: Competitor | undefined, 
    p2: Competitor | undefined, 
    onSave: (winnerId: string, s1: number, s2: number) => void 
}> = ({ p1, p2, onSave }) => {
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);

    const toggleScore = (current: number, setter: any, idx: number) => {
        // Logica simples: Se clicar no indice X e ele ja estiver marcado, desmarca. Se não, marca até ele.
        // Aqui vamos fazer simples: Clicar incrementa ou define? 
        // User asked: "desenhe 5 alvos para seleção"
        // Let's make individual toggles that sum up
        // Actually, just input 0-5 via circles is easier.
        // Logic: Click on circle 3 -> Score is 3. Click on circle 3 again -> Score is 2? No, standard rating star logic.
        if (current === idx + 1) setter(idx);
        else setter(idx + 1);
    };

    const renderCircles = (score: number, setScore: any, color: string) => (
        <div className="flex gap-2 justify-center">
            {[...Array(5)].map((_, i) => (
                <button
                    key={i}
                    onClick={() => toggleScore(score, setScore, i)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                        i < score 
                        ? `bg-${color}-500 border-${color}-600 shadow-md` 
                        : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                    }`}
                />
            ))}
        </div>
    );

    if (!p1 || !p2) return <div className="text-center p-4 text-gray-400">Selecione um confronto válido.</div>;

    const handleConfirm = () => {
        if (score1 === score2) {
            alert("O mata-mata não pode terminar empatado! Realize o desempate.");
            return;
        }
        const winnerId = score1 > score2 ? p1.id : p2.id;
        onSave(winnerId, score1, score2);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* P1 */}
                <div className="flex-1 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{p1.name}</h3>
                    <div className="text-xs text-gray-500 font-mono mb-4">{p1.id}</div>
                    {renderCircles(score1, setScore1, 'green')}
                    <div className="mt-2 font-bold text-2xl text-green-700">{score1}</div>
                </div>

                {/* VS */}
                <div className="text-2xl font-black text-gray-300">VS</div>

                {/* P2 */}
                <div className="flex-1 text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{p2.name}</h3>
                    <div className="text-xs text-gray-500 font-mono mb-4">{p2.id}</div>
                    {renderCircles(score2, setScore2, 'blue')}
                    <div className="mt-2 font-bold text-2xl text-blue-700">{score2}</div>
                </div>
             </div>

             <div className="mt-8 text-center">
                 <button 
                    onClick={handleConfirm}
                    className="bg-wood-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-wood-700 transition-colors shadow-lg"
                 >
                     Confirmar Vencedor
                 </button>
             </div>
        </div>
    );
};

// 4. Scoring Page
const ScoringPage: React.FC<{ year: number }> = ({ year }) => {
  const [activeTab, setActiveTab] = useState<'classificatoria' | 'matamata'>('classificatoria');
  
  // States Classificatoria
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isTiebreakerModalOpen, setIsTiebreakerModalOpen] = useState(false);
  const [isResetTiebreakerModalOpen, setIsResetTiebreakerModalOpen] = useState(false);

  // States Mata-mata
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [mmCategory, setMmCategory] = useState('');
  const [mmPhase, setMmPhase] = useState('R16'); // R16, QF, SF, F
  const [matches, setMatches] = useState<MatchResult[]>([]);

  // Reload competitors when searching or after update
  const refreshList = async () => {
    try {
      const data = await TournamentService.getAll();
      const cats = await TournamentService.getCategories();
      const matchData = await TournamentService.getMatches();

      setCompetitors(data.filter(c => c.year === year));
      setCategories(cats);
      setMatches(matchData);
      
      if (selectedCompetitor) {
          const updated = data.find(c => c.id === selectedCompetitor.id);
          if (updated) setSelectedCompetitor(updated);
      }
      
      // Default category for MM
      if (!mmCategory && cats.length > 0) setMmCategory(cats[0].name);

    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    refreshList();
  }, [year]);

  // --- Handlers Classificatoria ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedCompetitor(null);
  };

  const filteredCompetitors = competitors.filter(c => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term);
  });

  const handleSaveScore = async (targets: number[]) => {
    if (!selectedCompetitor) return;
    const success = await TournamentService.updateScore(selectedCompetitor.id, targets);
    if (success) {
      alert('Pontuação salva com sucesso!');
      setSearchTerm('');
      refreshList();
    } else alert('Erro ao salvar pontuação.');
  };

  const handleConfirmTiebreaker = async () => {
      if (!selectedCompetitor) return;
      const success = await TournamentService.addTiebreaker(selectedCompetitor.id, selectedCompetitor.targetsHit || []);
      if (success) {
          setIsTiebreakerModalOpen(false);
          await refreshList();
          alert("Ponto de desempate (+1) adicionado com sucesso!");
      } else alert("Erro ao adicionar ponto de desempate.");
  };

  const handleConfirmResetTiebreaker = async () => {
      if (!selectedCompetitor) return;
      const success = await TournamentService.resetTiebreaker(selectedCompetitor.id, selectedCompetitor.targetsHit || []);
      if (success) {
          setIsResetTiebreakerModalOpen(false);
          await refreshList();
          alert("Todos os pontos de desempate foram removidos!");
      } else alert("Erro ao resetar pontos de desempate.");
  };

  // --- Handlers Mata-mata ---
  const handleSaveMatch = async (idx: number, p1: Competitor, p2: Competitor, winnerId: string, s1: number, s2: number) => {
      const matchId = `${mmCategory}-${year}-${mmPhase}-${idx}`;
      const result: MatchResult = {
          id: matchId,
          p1Id: p1.id,
          p2Id: p2.id,
          score1: s1,
          score2: s2,
          winnerId: winnerId,
          timestamp: Date.now()
      };
      await TournamentService.saveMatch(result);
      await refreshList();
      alert("Resultado do confronto salvo!");
  };

  // Logic to build matchups based on ranking and previous winners
  const getMatchups = () => {
      if (!mmCategory) return [];
      const catCompetitors = sortCompetitors(competitors.filter(c => c.category === mmCategory));
      const catMatches = matches.filter(m => m.id.startsWith(`${mmCategory}-${year}`));

      // Helper to find winner of previous phase
      const getWinner = (phase: string, idx: number) => {
          const m = catMatches.find(m => m.id === `${mmCategory}-${year}-${phase}-${idx}`);
          if (!m || !m.winnerId) return undefined;
          return competitors.find(c => c.id === m.winnerId);
      };

      const isLivre = mmCategory === 'Livre';
      const pairings16 = [
        { p1: 0, p2: 15 }, { p1: 7, p2: 8 }, { p1: 3, p2: 12 }, { p1: 4, p2: 11 },
        { p1: 1, p2: 14 }, { p1: 6, p2: 9 }, { p1: 2, p2: 13 }, { p1: 5, p2: 10 }
      ];
      // Feminina/Others (Top 4)
      const pairingsSF_Small = [{ p1: 0, p2: 3 }, { p1: 1, p2: 2 }];

      if (mmPhase === 'R16') {
          if (!isLivre) return []; // Only Livre has R16
          return pairings16.map((pair, i) => ({
              idx: i,
              p1: catCompetitors[pair.p1],
              p2: catCompetitors[pair.p2]
          }));
      }

      if (mmPhase === 'QF') {
          if (!isLivre) return []; 
          // Winners of R16 pairs. 
          // QF1: Winner(R16_0) vs Winner(R16_1) ... actually logic matches bracket tree
          // Pairings in bracket: 
          // Match 1 (0vs15) vs Match 2 (7vs8) -> QF1
          // Match 3 (3vs12) vs Match 4 (4vs11) -> QF2
          return [0, 1, 2, 3].map(i => ({
              idx: i,
              p1: getWinner('R16', i*2),
              p2: getWinner('R16', i*2 + 1)
          }));
      }

      if (mmPhase === 'SF') {
          if (isLivre) {
              return [0, 1].map(i => ({
                  idx: i,
                  p1: getWinner('QF', i*2),
                  p2: getWinner('QF', i*2 + 1)
              }));
          } else {
              // Direct from Ranking
              return pairingsSF_Small.map((pair, i) => ({
                  idx: i,
                  p1: catCompetitors[pair.p1],
                  p2: catCompetitors[pair.p2]
              }));
          }
      }

      if (mmPhase === 'F') {
          return [{
              idx: 0,
              p1: getWinner('SF', 0),
              p2: getWinner('SF', 1)
          }];
      }

      return [];
  };

  const currentMatchups = getMatchups();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
       <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
        <Medal className="w-8 h-8 text-wood-600" />
        Lançar Pontuação ({year})
      </h1>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 mb-8 w-fit">
          <button 
             onClick={() => setActiveTab('classificatoria')}
             className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'classificatoria' ? 'bg-wood-100 text-wood-800' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              Fase Classificatória
          </button>
          <button 
             onClick={() => setActiveTab('matamata')}
             className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'matamata' ? 'bg-wood-100 text-wood-800' : 'text-gray-500 hover:bg-gray-50'}`}
          >
              Mata-mata
          </button>
      </div>

      {/* --- TAB CLASSIFICATORIA --- */}
      {activeTab === 'classificatoria' && (
        <>
            {!selectedCompetitor && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                    <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none"
                    placeholder="Pesquisar por Nome ou Número de Inscrição..."
                    />
                </div>

                {searchTerm && (
                    <div className="mt-4 space-y-2">
                    {filteredCompetitors.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Nenhum competidor encontrado para {year}.</div>
                    ) : (
                        filteredCompetitors.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => setSelectedCompetitor(comp)}
                            className="w-full flex items-center justify-between p-4 hover:bg-wood-50 rounded-xl border border-transparent hover:border-wood-200 transition-all text-left group"
                        >
                            <div>
                            <div className="font-bold text-gray-800 group-hover:text-wood-800">{comp.name}</div>
                            <div className="text-xs text-gray-500 font-mono">Insc: {comp.id} • {comp.category}</div>
                            </div>
                            {comp.score !== null ? (
                            <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                {comp.score} pts
                            </div>
                            ) : (
                            <div className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                                Pendente
                            </div>
                            )}
                        </button>
                        ))
                    )}
                    </div>
                )}
                </div>
            )}

            {selectedCompetitor && (
                <div className="animate-fade-in relative">
                <div className="flex items-center justify-between mb-6">
                    <button 
                    onClick={() => setSelectedCompetitor(null)}
                    className="text-sm text-gray-500 hover:text-wood-600 underline"
                    >
                    &larr; Voltar para pesquisa
                    </button>
                    <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-wood-700">{selectedCompetitor.id}</span>
                    <div className="text-sm font-medium text-gray-600">{selectedCompetitor.name}</div>
                    </div>
                </div>
                
                <TargetBoard 
                    onScoreConfirm={handleSaveScore}
                    initialTargets={selectedCompetitor.targetsHit} 
                />

                <div className="mt-8 flex flex-col items-center gap-4 border-t border-gray-200 pt-8">
                    <button 
                        onClick={() => setIsTiebreakerModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors font-semibold w-full sm:w-auto justify-center"
                    >
                        <Gavel className="w-5 h-5" />
                        Desempate +1
                    </button>

                    <button 
                        onClick={() => setIsResetTiebreakerModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors font-semibold text-sm w-full sm:w-auto justify-center"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Redefinir Desempate
                    </button>
                </div>

                {isTiebreakerModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-2 border-indigo-100">
                            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Gavel className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Confirmar Desempate?</h3>
                            <p className="text-gray-500 text-center text-sm mb-6">
                                Isso adicionará <strong className="text-indigo-700">+1 ponto</strong> ao placar total de <strong>{selectedCompetitor.name}</strong> para fins de reclassificação.
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsTiebreakerModalOpen(false)}
                                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmTiebreaker}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                                >
                                    Confirmar (+1)
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isResetTiebreakerModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-2 border-orange-100">
                            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Redefinir Desempate?</h3>
                            <p className="text-gray-500 text-center text-sm mb-6">
                                Isso irá <strong>remover TODOS</strong> os pontos extras de desempate de <strong>{selectedCompetitor.name}</strong>. A pontuação voltará ao normal.
                            </p>
                            
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setIsResetTiebreakerModalOpen(false)}
                                    className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmResetTiebreaker}
                                    className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-600/20"
                                >
                                    Sim, Redefinir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            )}
        </>
      )}

      {/* --- TAB MATA-MATA --- */}
      {activeTab === 'matamata' && (
          <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selector Categoria */}
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                      <select 
                        value={mmCategory}
                        onChange={(e) => setMmCategory(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 outline-none bg-white"
                      >
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                  </div>
                   {/* Selector Fase */}
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fase</label>
                      <select 
                        value={mmPhase}
                        onChange={(e) => setMmPhase(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 outline-none bg-white"
                      >
                          {mmCategory === 'Livre' && <option value="R16">Oitavas de Final</option>}
                          {mmCategory === 'Livre' && <option value="QF">Quartas de Final</option>}
                          <option value="SF">Semifinal</option>
                          <option value="F">Final</option>
                      </select>
                  </div>
              </div>

              {currentMatchups.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500">
                      Nenhum confronto disponível para esta fase/categoria ainda.
                      <br/>
                      <span className="text-xs">Verifique se a fase anterior foi concluída ou se há competidores suficientes.</span>
                  </div>
              ) : (
                  <div className="space-y-4">
                      {currentMatchups.map((m) => (
                          <div key={m.idx} className="border-t border-gray-100 pt-4">
                              <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Confronto #{m.idx + 1}</h3>
                              <KnockoutMatchScoring 
                                p1={m.p1} 
                                p2={m.p2} 
                                onSave={(wid, s1, s2) => handleSaveMatch(m.idx, m.p1!, m.p2!, wid, s1, s2)}
                              />
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

// 5. Manage Page
const ManageParticipantsPage: React.FC<{ year: number }> = ({ year }) => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');

  const loadData = async () => {
    try {
        const all = await TournamentService.getAll();
        setCompetitors(all.filter(c => c.year === year));
        
        const cats = await TournamentService.getCategories();
        setCategories(cats);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const handleEdit = (c: Competitor) => {
      setEditingId(c.id);
      setEditName(c.name);
  };

  const handleSaveEdit = async () => {
      if (!editingId) return;
      await TournamentService.updateName(editingId, editName);
      setEditingId(null);
      loadData();
  };

  const handleDelete = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este competidor?')) {
          await TournamentService.deleteCompetitor(id);
          loadData();
      }
  };
  
  const handleAddCategory = async () => {
      if (!newCatName || !newCatPrefix) return;
      await TournamentService.addCategory(newCatName, newCatPrefix);
      setNewCatName('');
      setNewCatPrefix('');
      loadData();
  };

  const handleDeleteCategory = async (id: number) => {
      if (confirm('Excluir categoria?')) {
          await TournamentService.deleteCategory(id);
          loadData();
      }
  };

  const filtered = competitors.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
            <Users className="w-8 h-8 text-wood-600" />
            Gerenciar Participantes ({year})
          </h1>

          {/* Categories Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-wood-500" />
                  Categorias
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg border border-gray-200 text-sm">
                          <span className="font-bold text-gray-700">{cat.name} ({cat.prefix})</span>
                          <button onClick={() => handleDeleteCategory(cat.id!)} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                      </div>
                  ))}
              </div>
              <div className="flex gap-2 max-w-md">
                  <input 
                    type="text" 
                    placeholder="Nome (ex: Juvenil)" 
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Prefixo (ex: J)" 
                    className="w-24 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    value={newCatPrefix}
                    onChange={e => setNewCatPrefix(e.target.value)}
                  />
                  <button onClick={handleAddCategory} className="px-4 py-2 bg-wood-600 text-white rounded-lg text-sm font-bold hover:bg-wood-700">Add</button>
              </div>
          </div>

          {/* Participants Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
             <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Buscar competidor por nome ou ID..." 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-wood-500 outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              {filtered.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Nenhum competidor encontrado para {year}.</div>
              ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                      {filtered.map(comp => (
                          <div key={comp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-1">
                                  {editingId === comp.id ? (
                                      <div className="flex gap-2">
                                          <input 
                                              type="text" 
                                              value={editName}
                                              onChange={e => setEditName(e.target.value)}
                                              className="flex-1 px-3 py-1 rounded border border-gray-300"
                                          />
                                          <button onClick={handleSaveEdit} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check className="w-4 h-4"/></button>
                                          <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"><X className="w-4 h-4"/></button>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-wood-100 flex items-center justify-center font-mono font-bold text-wood-700 text-xs">
                                            {comp.id}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{comp.name}</div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{comp.category}</span>
                                                <span>•</span>
                                                <span className={comp.score !== null ? 'text-green-600 font-bold' : 'text-gray-400'}>
                                                    {comp.score !== null ? `${comp.score} pts` : 'Sem pontuação'}
                                                </span>
                                            </div>
                                        </div>
                                      </div>
                                  )}
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <button onClick={() => handleEdit(comp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Nome">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(comp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
          
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
              <h3 className="text-red-800 font-bold flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5" /> Zona de Perigo
              </h3>
              <p className="text-sm text-red-600 mb-4">Ações irreversíveis para o banco de dados.</p>
              <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={async () => {
                        if(confirm('Isso apagará TODOS os competidores (de todos os anos) e partidas. Tem certeza?')) {
                            await TournamentService.deleteAllCompetitors();
                            loadData();
                        }
                    }}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                      Limpar Tudo (Reset Completo)
                  </button>
                  <button 
                    onClick={async () => {
                        if(confirm('Isso apagará as partidas de mata-mata. Continuar?')) {
                            await TournamentService.deleteMatches();
                            alert('Chaves resetadas.');
                        }
                    }}
                    className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors"
                  >
                      Resetar Mata-mata
                  </button>
                  <button 
                    onClick={async () => {
                        if(confirm('Isso irá gerar dados fictícios. Continuar?')) {
                            await TournamentService.seedDatabase();
                            loadData();
                        }
                    }}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                  >
                      Popular Dados (Seed)
                  </button>
              </div>
          </div>
      </div>
  );
};

// 6. Bracket Page
const BracketPage: React.FC<{ year: number }> = ({ year }) => {
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [qualifiers, setQualifiers] = useState<Competitor[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await TournamentService.getCategories();
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0].name);
      } catch (e) { console.error(e); }
    };
    loadCats();
  }, []);

  const isLivre = selectedCategory === 'Livre';

  useEffect(() => {
    const load = async () => {
      if (!selectedCategory) return;
      try {
        const data = await TournamentService.getAll();
        const matchData = await TournamentService.getMatches();
        
        // Filter by Category AND Year Passed by Prop
        const filtered = data.filter(c => c.category === selectedCategory && c.year === year);
        
        // Use global sort logic (Score > MaxHit > Date)
        const sorted = sortCompetitors(filtered);
        
        // Define o limite com base na categoria
        const limit = isLivre ? 16 : 4;
        
        setQualifiers(sorted.slice(0, limit));
        setMatches(matchData.filter(m => m.id.startsWith(`${selectedCategory}-${year}`)));
      } catch(e) { console.error(e); }
    };
    load();
    // Poll for updates in bracket
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);

  }, [selectedCategory, isLivre, year]);

  // Helper to find match winner for display
  const getWinner = (phase: string, idx: number) => {
      const m = matches.find(m => m.id === `${selectedCategory}-${year}-${phase}-${idx}`);
      if (!m || !m.winnerId) return undefined;
      // Find comp in current loaded list (or fetch all if needed, assuming all are in qualifiers/all list)
      // Actually qualifiers only has top 16, but winner must be one of them.
      return qualifiers.find(c => c.id === m.winnerId);
  };
  
  const getMatchScore = (phase: string, idx: number, pId: string) => {
       const m = matches.find(m => m.id === `${selectedCategory}-${year}-${phase}-${idx}`);
       if (!m) return undefined;
       if (m.p1Id === pId) return m.score1;
       if (m.p2Id === pId) return m.score2;
       return undefined;
  };

  // Seeding logic
  const pairings16 = [
    { p1: 0, p2: 15 }, { p1: 7, p2: 8 }, { p1: 3, p2: 12 }, { p1: 4, p2: 11 },
    { p1: 1, p2: 14 }, { p1: 6, p2: 9 }, { p1: 2, p2: 13 }, { p1: 5, p2: 10 }
  ];

  const pairingsSF_Small = [
      { p1: 0, p2: 3 }, { p1: 1, p2: 2 }
  ];

  const MatchBox = ({ 
      p1, p2, phase, idx 
  }: { 
      p1?: Competitor, p2?: Competitor, phase: string, idx: number 
  }) => {
    const s1 = p1 ? getMatchScore(phase, idx, p1.id) : undefined;
    const s2 = p2 ? getMatchScore(phase, idx, p2.id) : undefined;
    
    // Determine winner style
    const w1 = s1 !== undefined && s2 !== undefined && s1 > s2;
    const w2 = s1 !== undefined && s2 !== undefined && s2 > s1;

    return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-sm w-full mb-4 overflow-hidden text-xs sm:text-sm relative z-10">
      <div className={`p-2 flex justify-between items-center ${w1 ? 'bg-green-50' : 'bg-gray-50'}`}>
        <span className={`font-semibold truncate w-24 sm:w-32 ${p1 ? 'text-gray-900' : 'text-gray-400'}`}>
          {p1 ? `#${qualifiers.indexOf(p1) + 1} ${p1.name}` : '...'}
        </span>
        <span className="font-bold text-gray-700">{s1 !== undefined ? s1 : '-'}</span>
      </div>
      <div className="h-px bg-gray-200"></div>
      <div className={`p-2 flex justify-between items-center ${w2 ? 'bg-green-50' : 'bg-gray-50'}`}>
        <span className={`font-semibold truncate w-24 sm:w-32 ${p2 ? 'text-gray-900' : 'text-gray-400'}`}>
           {p2 ? `#${qualifiers.indexOf(p2) + 1} ${p2.name}` : '...'}
        </span>
        <span className="font-bold text-gray-700">{s2 !== undefined ? s2 : '-'}</span>
      </div>
    </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 overflow-x-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-4 sm:mb-0">
          <GitMerge className="w-8 h-8 text-wood-600" />
          Chaveamento (Mata-mata)
        </h1>
        
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
            {categories.map(cat => (
                <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${selectedCategory === cat.name ? 'bg-wood-100 text-wood-800' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                {cat.name}
                </button>
            ))}
            </div>
        </div>
      </div>

      <div className="min-w-[1000px] flex justify-between gap-0 py-8 px-4">
        
        {isLivre ? (
          <>
            {/* Round of 16 */}
            <div className="flex-1 flex flex-col justify-around pr-8 relative">
               <h3 className="text-center font-bold text-gray-500 mb-6 uppercase tracking-wider text-xs bg-gray-100 py-1 rounded">Oitavas</h3>
               {pairings16.map((pair, idx) => (
                 <div key={idx} className="relative flex items-center">
                   <MatchBox p1={qualifiers[pair.p1]} p2={qualifiers[pair.p2]} phase="R16" idx={idx} />
                   {/* Connector to QF */}
                   <div className={`absolute -right-8 top-1/2 w-8 border-t-2 border-gray-300 ${idx % 2 === 0 ? 'h-[4.5rem] border-r-2 translate-y-[2.25rem]' : 'h-[4.5rem] border-r-2 -translate-y-[2.25rem] border-t-0 border-b-2'}`}></div>
                 </div>
               ))}
            </div>

            {/* Quarter Finals */}
            <div className="flex-1 flex flex-col justify-around px-4 relative">
              <h3 className="text-center font-bold text-gray-500 mb-6 uppercase tracking-wider text-xs bg-gray-100 py-1 rounded">Quartas</h3>
              {[...Array(4)].map((_, i) => (
                 <div key={i} className="relative flex items-center">
                    {/* QF Input comes from Previous Winner */}
                    <MatchBox 
                        p1={getWinner('R16', i*2)} 
                        p2={getWinner('R16', i*2 + 1)} 
                        phase="QF" idx={i} 
                    />
                    {/* Connector to SF */}
                    <div className={`absolute -right-8 top-1/2 w-8 border-t-2 border-gray-300 ${i % 2 === 0 ? 'h-[9rem] border-r-2 translate-y-[4.5rem]' : 'h-[9rem] border-r-2 -translate-y-[4.5rem] border-t-0 border-b-2'}`}></div>
                 </div>
              ))}
            </div>

            {/* Semi Finals */}
            <div className="flex-1 flex flex-col justify-around px-4 relative">
              <h3 className="text-center font-bold text-gray-500 mb-6 uppercase tracking-wider text-xs bg-gray-100 py-1 rounded">Semifinal</h3>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="relative flex items-center">
                   <MatchBox 
                        p1={getWinner('QF', i*2)} 
                        p2={getWinner('QF', i*2 + 1)} 
                        phase="SF" idx={i}
                    />
                   <div className={`absolute -right-8 top-1/2 w-8 border-t-2 border-gray-300 ${i % 2 === 0 ? 'h-[18rem] border-r-2 translate-y-[9rem]' : 'h-[18rem] border-r-2 -translate-y-[9rem] border-t-0 border-b-2'}`}></div>
                </div>
              ))}
            </div>

            {/* Final */}
            <div className="flex-1 flex flex-col justify-around pl-8 relative">
              <h3 className="text-center font-bold text-wood-600 mb-6 uppercase tracking-wider text-xs bg-wood-100 py-1 rounded">Final</h3>
              <div className="relative flex items-center">
                 <div className="absolute -left-8 top-1/2 w-8 border-t-2 border-gray-300"></div>
                 <MatchBox 
                    p1={getWinner('SF', 0)} 
                    p2={getWinner('SF', 1)} 
                    phase="F" idx={0}
                 />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Small Bracket Layout (Top 4) */}
            <div className="flex-1 flex items-center justify-center p-8">
                 <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <Swords className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="font-bold">Fase de Classificação</p>
                    <p className="text-xs mt-2">Top 4 avançam direto</p>
                 </div>
            </div>

            <div className="flex-1 flex flex-col justify-around px-8 relative">
               <h3 className="text-center font-bold text-gray-500 mb-6 uppercase tracking-wider text-xs bg-gray-100 py-1 rounded">Semifinal ({year})</h3>
               {pairingsSF_Small.map((pair, idx) => (
                 <div key={idx} className="relative flex items-center">
                   <MatchBox p1={qualifiers[pair.p1]} p2={qualifiers[pair.p2]} phase="SF" idx={idx} />
                   {/* Connector Right */}
                   <div className={`absolute -right-8 top-1/2 w-8 border-t-2 border-gray-300 ${idx % 2 === 0 ? 'h-[12rem] border-r-2 translate-y-[6rem]' : 'h-[12rem] border-r-2 -translate-y-[6rem] border-t-0 border-b-2'}`}></div>
                 </div>
               ))}
            </div>

             <div className="flex-1 flex flex-col justify-around pl-8 relative">
              <h3 className="text-center font-bold text-wood-600 mb-6 uppercase tracking-wider text-xs bg-wood-100 py-1 rounded">Final</h3>
              <div className="relative flex items-center">
                 <div className="absolute -left-8 top-1/2 w-8 border-t-2 border-gray-300"></div>
                 <MatchBox 
                    p1={getWinner('SF', 0)} 
                    p2={getWinner('SF', 1)} 
                    phase="F" idx={0}
                 />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- WELCOME MODAL ---

const WelcomeYearModal: React.FC<{ onSelect: (year: number) => void }> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-wood-900/90 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border-4 border-wood-200 transform scale-100 transition-all">
          <div className="bg-wood-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <Calendar className="w-10 h-10 text-wood-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo!</h2>
          <p className="text-gray-500 mb-8">Selecione o ano do torneio para acessar os registros.</p>
          
          <div className="grid grid-cols-2 gap-4">
             <button 
                onClick={() => onSelect(2024)}
                className="group relative overflow-hidden rounded-2xl bg-gray-100 hover:bg-wood-600 transition-all duration-300 p-6 text-center border-2 border-transparent hover:border-wood-700 hover:shadow-lg"
             >
                <span className="block text-2xl font-bold text-gray-700 group-hover:text-white mb-1">2024</span>
                <span className="text-xs text-gray-400 group-hover:text-wood-200 flex items-center justify-center gap-1">
                   Acessar <ArrowRight className="w-3 h-3" />
                </span>
             </button>

             <button 
                onClick={() => onSelect(2025)}
                className="group relative overflow-hidden rounded-2xl bg-wood-50 hover:bg-wood-600 transition-all duration-300 p-6 text-center border-2 border-wood-200 hover:border-wood-700 hover:shadow-lg"
             >
                <span className="block text-2xl font-bold text-wood-800 group-hover:text-white mb-1">2025</span>
                <span className="text-xs text-wood-600 group-hover:text-wood-200 flex items-center justify-center gap-1">
                   Acessar <ArrowRight className="w-3 h-3" />
                </span>
             </button>
          </div>
       </div>
    </div>
  );
};

// --- CONFIRM CHANGE YEAR MODAL ---

const ChangeYearConfirmModal: React.FC<{ onConfirm: () => void, onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
       <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200">
          <div className="flex items-center gap-4 mb-4">
             <div className="bg-orange-100 p-3 rounded-full">
                <RotateCcw className="w-6 h-6 text-orange-600" />
             </div>
             <h3 className="text-lg font-bold text-gray-900">Alterar Ano?</h3>
          </div>
          
          <p className="text-gray-600 text-sm mb-6">
            Você está prestes a sair da visualização atual. Isso fará com que o site recarregue os dados do novo ano selecionado.
          </p>
          
          <div className="flex gap-3">
             <button 
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors"
             >
                Cancelar
             </button>
             <button 
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl bg-wood-600 text-white font-bold hover:bg-wood-700 transition-colors shadow-lg shadow-wood-600/20"
             >
                Sim, Alterar
             </button>
          </div>
       </div>
    </div>
  );
};

// --- APP ROOT ---

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('leaderboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [globalYear, setGlobalYear] = useState<number | null>(null);
  const [isYearConfirmOpen, setIsYearConfirmOpen] = useState(false);

  useEffect(() => {
    // Check initial session (com try/catch implicito do getUser customizado)
    TournamentService.auth.getUser().then(user => {
      setIsAdmin(!!user);
    });

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setIsAdmin(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setCurrentView('registration');
  };

  const handleLogout = async () => {
    await TournamentService.auth.logout();
    setIsAdmin(false);
    setCurrentView('leaderboard');
  };

  // Logic to change year
  const handleChangeYearRequest = () => {
     setIsYearConfirmOpen(true);
  };

  const handleConfirmChangeYear = () => {
     setGlobalYear(null); // Resets global year, triggering WelcomeYearModal
     setIsYearConfirmOpen(false);
  };

  // Protected Route Logic
  const renderView = () => {
    // If no year selected, app logic doesn't render (Modal covers it)
    if (!globalYear) return null;

    switch (currentView) {
      case 'leaderboard':
        return <LeaderboardPage year={globalYear} />;
      case 'bracket':
        return <BracketPage year={globalYear} />; // Public view
      case 'login':
        return <LoginPage onSuccess={handleLoginSuccess} />;
      case 'registration':
        return isAdmin ? <RegistrationPage year={globalYear} /> : <LoginPage onSuccess={handleLoginSuccess} />;
      case 'scoring':
        return isAdmin ? <ScoringPage year={globalYear} /> : <LoginPage onSuccess={handleLoginSuccess} />;
      case 'manage':
        return isAdmin ? <ManageParticipantsPage year={globalYear} /> : <LoginPage onSuccess={handleLoginSuccess} />;
      default:
        return <LeaderboardPage year={globalYear} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      {/* Show Modal if no year selected */}
      {!globalYear && <WelcomeYearModal onSelect={setGlobalYear} />}

      {/* Confirmation Modal */}
      {isYearConfirmOpen && (
         <ChangeYearConfirmModal 
            onConfirm={handleConfirmChangeYear} 
            onCancel={() => setIsYearConfirmOpen(false)} 
         />
      )}

      <Navbar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
        year={globalYear}
        onChangeYear={handleChangeYearRequest}
      />
      <main className="mt-4">
        {renderView()}
      </main>
    </div>
  );
};

export default App;