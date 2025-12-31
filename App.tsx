import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TargetBoard } from './components/TargetBoard';
import { TournamentService, supabase } from './services/storage';
import { Competitor, CategoryDef } from './types';
import { Trophy, Search, User, AlertCircle, Medal, BadgePlus, Check, Trash2, Edit2, Save, X, GitMerge, Users, Database, RefreshCw, Settings, Plus, Tag, Wifi, WifiOff, AlertTriangle, Scale, Calendar, ArrowRight, RotateCcw, Gavel } from 'lucide-react';

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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Classificação Geral</h1>
            <p className="text-gray-500">Torneio de Baladeira - Resultados {year}</p>
        </div>
      </div>

      <div className={`grid gap-6 ${categories.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-2'}`}>
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

// 4. Scoring Page
const ScoringPage: React.FC<{ year: number }> = ({ year }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isTiebreakerModalOpen, setIsTiebreakerModalOpen] = useState(false);
  const [isResetTiebreakerModalOpen, setIsResetTiebreakerModalOpen] = useState(false);

  // Reload competitors when searching or after update
  const refreshList = async () => {
    try {
      const data = await TournamentService.getAll();
      // Filter for Selected YEAR passed by prop
      setCompetitors(data.filter(c => c.year === year));
      
      // Update selected competitor if it exists to reflect changes (like extra points)
      if (selectedCompetitor) {
          const updated = data.find(c => c.id === selectedCompetitor.id);
          if (updated) setSelectedCompetitor(updated);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    refreshList();
  }, [year]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedCompetitor(null); // Deselect if searching again
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
      // setSelectedCompetitor(null); // Optional: Keep selected to see result
      setSearchTerm('');
      refreshList();
    } else {
      alert('Erro ao salvar pontuação.');
    }
  };

  const handleConfirmTiebreaker = async () => {
      if (!selectedCompetitor) return;
      
      const success = await TournamentService.addTiebreaker(selectedCompetitor.id, selectedCompetitor.targetsHit || []);
      if (success) {
          setIsTiebreakerModalOpen(false);
          await refreshList(); // Update UI
          alert("Ponto de desempate (+1) adicionado com sucesso!");
      } else {
          alert("Erro ao adicionar ponto de desempate.");
      }
  };

  const handleConfirmResetTiebreaker = async () => {
      if (!selectedCompetitor) return;
      
      const success = await TournamentService.resetTiebreaker(selectedCompetitor.id, selectedCompetitor.targetsHit || []);
      if (success) {
          setIsResetTiebreakerModalOpen(false);
          await refreshList(); // Update UI
          alert("Todos os pontos de desempate foram removidos!");
      } else {
          alert("Erro ao resetar pontos de desempate.");
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
       <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <Medal className="w-8 h-8 text-wood-600" />
        Lançar Pontuação ({year})
      </h1>

      {/* Search Section */}
      {!selectedCompetitor && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none"
              placeholder="Pesquisar por Nome ou Número de Inscrição (ex: L123)..."
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

      {/* Scoring Section */}
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

          {/* Botões de Ação Extra (Desempate) */}
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

          {/* Modal de Confirmação de Desempate (+1) */}
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

          {/* Modal de Confirmação de RESET Desempate */}
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
    </div>
  );
};

// 5. Manage Participants Page (Includes Categories)
const ManageParticipantsPage: React.FC<{ year: number }> = ({ year }) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'categories'>('participants');

  // --- Participants Logic ---
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [editName, setEditName] = useState('');

  // Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const [isSeeding, setIsSeeding] = useState(false);

  // --- Categories Logic ---
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPrefix, setNewCatPrefix] = useState('');

  // --- DB Status ---
  const [dbStatus, setDbStatus] = useState<{ok: boolean, message?: string} | null>(null);

  const refreshList = async () => {
    try {
      const data = await TournamentService.getAll();
      setCompetitors(sortCompetitors(data)); 
      
      const cats = await TournamentService.getCategories();
      setCategories(cats);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    refreshList();
    // Check DB health
    TournamentService.checkHealth().then(status => setDbStatus(status));
  }, []);

  // -- Participant Handlers
  const openEditModal = (comp: Competitor) => {
    setEditingCompetitor(comp);
    setEditName(comp.name);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCompetitor(null);
    setEditName('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompetitor || !editName.trim()) return;
    
    // VERIFICAÇÃO DE LIMITE DE INSCRIÇÕES (No mesmo ano)
    const nameToCheck = editName.trim().toLowerCase();
    const existingCount = competitors.filter(c => 
      c.name.toLowerCase() === nameToCheck && 
      c.id !== editingCompetitor.id &&
      c.year === editingCompetitor.year
    ).length;

    if (existingCount >= 3) {
      alert(`Erro: Já existem ${existingCount} participantes com o nome "${editName}" no ano ${editingCompetitor.year}. O limite é de 3 inscrições por pessoa/ano.`);
      return;
    }

    const success = await TournamentService.updateName(editingCompetitor.id, editName);
    if (!success) {
      alert("Erro ao salvar.");
      return;
    }
    closeEditModal();
    refreshList();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita.')) {
      
      const originalList = [...competitors];
      
      // 1. Atualização Otimista
      setCompetitors(current => current.filter(c => c.id !== id));
      
      // 2. Chama o serviço em segundo plano
      const success = await TournamentService.deleteCompetitor(id);

      // 3. Se falhar, reverte a alteração
      if (!success) {
          alert("Erro ao excluir do banco de dados. Verifique sua conexão ou permissões.");
          setCompetitors(originalList);
      }
    }
  };

  const handleSeed = async () => {
    if (window.confirm(`Isso irá gerar competidores aleatórios nas categorias existentes para o ano ${year}. Deseja continuar?`)) {
      setIsSeeding(true);
      try {
        await TournamentService.seedDatabase();
        await refreshList();
        alert('Dados de teste gerados com sucesso!');
      } catch (e: any) {
        console.error(e);
        alert(`Erro ao gerar dados: ${e.message || e}`);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const handleResetData = async (e: React.FormEvent) => {
      e.preventDefault();
      // Verificação simples de senha (Admin Offline ou senha padrão)
      if (resetPassword === 'admin' || resetPassword === 'admin123') {
          const confirmed = await TournamentService.deleteAllCompetitors();
          if (confirmed) {
              alert("Todos os dados foram excluídos.");
              setIsResetModalOpen(false);
              setResetPassword('');
              setCompetitors([]);
              refreshList();
          } else {
              alert("Erro ao tentar excluir.");
          }
      } else {
          alert("Senha incorreta.");
      }
  };

  // -- Category Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatPrefix.trim()) return;
    
    // Check duplication
    const existing = categories.find(c => c.name.toLowerCase() === newCatName.toLowerCase() || c.prefix === newCatPrefix.toUpperCase());
    if (existing) {
      alert("Já existe uma categoria com esse nome ou prefixo.");
      return;
    }

    await TournamentService.addCategory(newCatName.trim(), newCatPrefix.trim());
    setNewCatName('');
    setNewCatPrefix('');
    refreshList();
  };

  const handleDeleteCategory = async (id: number) => {
    if (window.confirm('Tem certeza? Isso não exclui os competidores, mas pode causar confusão na organização.')) {
      await TournamentService.deleteCategory(id);
      refreshList();
    }
  };

  // Filter competitors for display
  const filteredCompetitors = competitors.filter(c => 
    c.year === year &&
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-wood-600" />
            Administração ({year})
          </h1>
          {dbStatus && (
            <div className={`mt-2 text-sm flex items-center gap-2 ${dbStatus.ok ? 'text-green-600' : 'text-orange-600'}`}>
              {dbStatus.ok ? (
                <>
                  <Wifi className="w-4 h-4" />
                  Conectado ao Servidor
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  Modo Admin Local (Offline)
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'participants' ? 'bg-wood-100 text-wood-800' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Users className="w-4 h-4" />
            Participantes
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'categories' ? 'bg-wood-100 text-wood-800' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Tag className="w-4 h-4" />
            Categorias
          </button>
        </div>
      </div>

      {activeTab === 'participants' && (
        <div className="space-y-4 animate-fade-in">
           <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex gap-2">
                <button 
                  onClick={() => setIsResetModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-sm text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
                >
                  {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Gerar
                </button>
            </div>
           </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none"
                  placeholder={`Pesquisar participantes de ${year}...`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                  <tr>
                    <th className="px-6 py-4">Inscrição</th>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Pontos</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCompetitors.map((comp) => (
                    <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-500">{comp.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{comp.name}</div>
                        {comp.score !== null && (
                            <div className="text-xs text-gray-400">Alvos: {formatTargets(comp)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">
                          {comp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {comp.score !== null ? comp.score : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditModal(comp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(comp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCompetitors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Nenhum participante encontrado para {year}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="animate-fade-in grid gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Plus className="w-5 h-5 text-wood-600" />
                 Nova Categoria
               </h3>
               <form onSubmit={handleAddCategory} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                   <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wood-500 outline-none"
                    placeholder="Ex: Infantil"
                    required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Prefixo do ID</label>
                   <input
                    type="text"
                    maxLength={1}
                    value={newCatPrefix}
                    onChange={(e) => setNewCatPrefix(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wood-500 outline-none uppercase"
                    placeholder="Ex: I"
                    required
                   />
                   <p className="text-xs text-gray-500 mt-1">Uma letra única para gerar IDs (Ex: I123).</p>
                 </div>
                 <button 
                  type="submit"
                  className="w-full bg-wood-600 text-white py-2 rounded-lg font-bold hover:bg-wood-700 transition-colors"
                 >
                   Adicionar
                 </button>
               </form>
             </div>
          </div>

          <div className="md:col-span-2">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold text-sm">
                    <tr>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4">Prefixo</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map(cat => (
                      <tr key={cat.id}>
                        <td className="px-6 py-4 font-medium">{cat.name}</td>
                        <td className="px-6 py-4 font-mono text-gray-500">{cat.prefix}***</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => cat.id && handleDeleteCategory(cat.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Excluir Categoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {isEditModalOpen && editingCompetitor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Editar Participante ({editingCompetitor.year})</h3>
                  <p className="text-xs text-gray-500">Atualize os dados cadastrais</p>
                </div>
                <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6">
                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Número de Inscrição</label>
                    <div className="font-mono font-bold text-gray-700 bg-gray-100 px-4 py-3 rounded-xl border border-gray-200 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        {editingCompetitor.id}
                    </div>
                </div>
                <div className="mb-8">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo</label>
                    <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-wood-500 focus:border-transparent outline-none transition-all text-lg text-gray-900"
                        autoFocus
                        placeholder="Digite o novo nome"
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <button 
                        type="button" 
                        onClick={closeEditModal}
                        className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        className="px-6 py-3 bg-wood-600 text-white font-bold rounded-xl hover:bg-wood-700 transition-colors shadow-lg shadow-wood-600/20 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Salvar Alterações
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {isResetModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in border-2 border-red-100">
                 <div className="p-6 text-center">
                     <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                         <AlertTriangle className="w-8 h-8 text-red-600" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Todos os Dados?</h3>
                     <p className="text-gray-500 text-sm mb-6">
                         Isso irá apagar <strong>permanentemente</strong> todos os participantes e pontuações do servidor.
                     </p>
                     
                     <form onSubmit={handleResetData}>
                         <div className="mb-6 text-left">
                             <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Confirme sua senha</label>
                             <input 
                                 type="password" 
                                 value={resetPassword}
                                 onChange={(e) => setResetPassword(e.target.value)}
                                 className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                 placeholder="Senha de Admin"
                                 autoFocus
                                 required
                             />
                         </div>
                         <div className="flex gap-2">
                             <button 
                                 type="button" 
                                 onClick={() => { setIsResetModalOpen(false); setResetPassword(''); }}
                                 className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl"
                             >
                                 Cancelar
                             </button>
                             <button 
                                 type="submit" 
                                 className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20"
                             >
                                 Sim, Excluir
                             </button>
                         </div>
                     </form>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

// 6. Bracket Page
const BracketPage: React.FC<{ year: number }> = ({ year }) => {
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [qualifiers, setQualifiers] = useState<Competitor[]>([]);

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

  const isFeminina = selectedCategory === 'Feminina';

  useEffect(() => {
    const load = async () => {
      if (!selectedCategory) return;
      try {
        const data = await TournamentService.getAll();
        
        // Filter by Category AND Year Passed by Prop
        const filtered = data.filter(c => c.category === selectedCategory && c.year === year);
        
        // Use global sort logic (Score > MaxHit > Date)
        const sorted = sortCompetitors(filtered);
        
        // Define o limite com base na categoria
        const limit = isFeminina ? 4 : 16;
        
        setQualifiers(sorted.slice(0, limit));
      } catch(e) { console.error(e); }
    };
    load();
  }, [selectedCategory, isFeminina, year]);

  // Standard seeding logic for 16 players
  // 1vs16, 8vs9, 4vs13, 5vs12, 2vs15, 7vs10, 3vs14, 6vs11
  const pairings = [
    { p1: 0, p2: 15 },
    { p1: 7, p2: 8 },
    { p1: 3, p2: 12 },
    { p1: 4, p2: 11 },
    { p1: 1, p2: 14 },
    { p1: 6, p2: 9 },
    { p1: 2, p2: 13 },
    { p1: 5, p2: 10 }
  ];

  // Seeding logic for 4 players (Feminina)
  // 1vs4, 2vs3
  const pairingsSmall = [
      { p1: 0, p2: 3 },
      { p1: 1, p2: 2 }
  ];

  const MatchBox = ({ p1, p2 }: { p1?: Competitor, p2?: Competitor }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full mb-4 overflow-hidden text-xs sm:text-sm">
      <div className={`p-2 flex justify-between items-center ${p1 ? 'bg-gray-50' : 'bg-gray-100'}`}>
        <span className={`font-semibold truncate ${p1 ? 'text-gray-800' : 'text-gray-400'}`}>
          {p1 ? `#${qualifiers.indexOf(p1) + 1} ${p1.name}` : 'A definir'}
        </span>
        <div className="flex flex-col items-end">
            <span className="text-gray-500 font-mono text-xs">{p1?.score ?? '-'}</span>
            {p1?.score && <span className="text-[10px] text-gray-400">Alvos: {formatTargets(p1)}</span>}
        </div>
      </div>
      <div className="h-px bg-gray-200"></div>
      <div className={`p-2 flex justify-between items-center ${p2 ? 'bg-gray-50' : 'bg-gray-100'}`}>
        <span className={`font-semibold truncate ${p2 ? 'text-gray-800' : 'text-gray-400'}`}>
           {p2 ? `#${qualifiers.indexOf(p2) + 1} ${p2.name}` : 'A definir'}
        </span>
        <div className="flex flex-col items-end">
            <span className="text-gray-500 font-mono text-xs">{p2?.score ?? '-'}</span>
            {p2?.score && <span className="text-[10px] text-gray-400">Alvos: {formatTargets(p2)}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 overflow-x-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-4 sm:mb-0">
          <GitMerge className="w-8 h-8 text-wood-600" />
          Chaveamento (Mata-mata)
        </h1>
        
        <div className="flex flex-wrap gap-4 items-center">
            {/* Year is now handled globally, removed local selector */}

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

      <div className="min-w-[800px] flex justify-between gap-4 py-8">
        
        {!isFeminina ? (
          <>
            {/* Round of 16 */}
            <div className="flex-1 flex flex-col justify-around">
               <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Oitavas de Final ({year})</h3>
               {pairings.map((pair, idx) => (
                 <div key={idx} className="relative">
                   <MatchBox p1={qualifiers[pair.p1]} p2={qualifiers[pair.p2]} />
                   {/* Connector Right */}
                   <div className={`hidden sm:block absolute right-[-1rem] top-1/2 w-4 border-t-2 border-gray-300 ${idx % 2 === 0 ? 'h-[4.5rem] border-r-2 translate-y-0' : 'h-[4.5rem] border-r-2 -translate-y-[4.5rem]'}`}></div>
                 </div>
               ))}
            </div>

            {/* Quarter Finals */}
            <div className="flex-1 flex flex-col justify-around pt-8 pb-8">
              <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Quartas de Final</h3>
              {[...Array(4)].map((_, i) => (
                 <div key={i} className="relative">
                    <MatchBox />
                    {/* Connector Right */}
                    <div className={`hidden sm:block absolute right-[-1rem] top-1/2 w-4 border-t-2 border-gray-300 ${i % 2 === 0 ? 'h-[9rem] border-r-2 translate-y-0' : 'h-[9rem] border-r-2 -translate-y-[9rem]'}`}></div>
                 </div>
              ))}
            </div>

            {/* Semi Finals (Empty for Large Bracket) */}
            <div className="flex-1 flex flex-col justify-around pt-24 pb-24">
              <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Semifinal</h3>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="relative">
                   <MatchBox />
                   <div className={`hidden sm:block absolute right-[-1rem] top-1/2 w-4 border-t-2 border-gray-300 ${i % 2 === 0 ? 'h-[18rem] border-r-2 translate-y-0' : 'h-[18rem] border-r-2 -translate-y-[18rem]'}`}></div>
                </div>
              ))}
            </div>

            {/* Final (Empty for Large Bracket) */}
            <div className="flex-1 flex flex-col justify-around pt-48 pb-48">
              <h3 className="text-center font-bold text-wood-600 mb-4 uppercase tracking-wider text-xs">Final</h3>
              <div className="relative">
                 <MatchBox />
                 <div className="absolute -left-4 top-1/2 w-4 border-t-2 border-gray-300"></div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Small Bracket Layout (Top 4) */}
            <div className="flex-1 flex items-center justify-center">
                 <div className="text-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl">
                    <p>Fase de Classificação</p>
                    <p className="text-xs mt-2">Top 4 avançam direto</p>
                 </div>
            </div>

            <div className="flex-1 flex flex-col justify-around pt-12 pb-12">
               <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Semifinal ({year})</h3>
               {pairingsSmall.map((pair, idx) => (
                 <div key={idx} className="relative">
                   <MatchBox p1={qualifiers[pair.p1]} p2={qualifiers[pair.p2]} />
                   {/* Connector Right */}
                   <div className={`hidden sm:block absolute right-[-1rem] top-1/2 w-4 border-t-2 border-gray-300 ${idx % 2 === 0 ? 'h-[12rem] border-r-2 translate-y-0' : 'h-[12rem] border-r-2 -translate-y-[12rem]'}`}></div>
                 </div>
               ))}
            </div>

             <div className="flex-1 flex flex-col justify-around pt-32 pb-32">
              <h3 className="text-center font-bold text-wood-600 mb-4 uppercase tracking-wider text-xs">Final</h3>
              <div className="relative">
                 <MatchBox />
                 <div className="absolute -left-4 top-1/2 w-4 border-t-2 border-gray-300"></div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <p className="text-center text-gray-400 mt-8 text-sm">
        {isFeminina 
          ? "* Na Categoria Feminina, apenas as 4 melhores avançam para a fase Semifinal." 
          : "* A chave é montada automaticamente com base nos 16 melhores colocados do Ranking deste ano."}
      </p>
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