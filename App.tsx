import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TargetBoard } from './components/TargetBoard';
import { TournamentService } from './services/storage';
import { Competitor, Category } from './types';
import { Trophy, Search, User, AlertCircle, Medal, BadgePlus, Check, Trash2, Edit2, Save, X, GitMerge, Users, Database, RefreshCw } from 'lucide-react';

// --- COMPONENTS ---

const CategorySection = ({ title, category, colorClass, iconColor, competitors }: { title: string, category: Category, colorClass: string, iconColor: string, competitors: Competitor[] }) => {
  const list = competitors.filter(c => c.category === category);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className={`px-6 py-4 border-b border-gray-100 ${colorClass} bg-opacity-10 flex items-center gap-3`}>
        <Trophy className={`w-6 h-6 ${iconColor}`} />
        <h2 className={`text-xl font-bold ${iconColor}`}>{title}</h2>
      </div>
      <div className="overflow-y-auto flex-1 p-4">
        {list.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            Nenhum competidor registrado.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((comp, index) => (
              <div key={comp.id} className="flex items-center bg-gray-50 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-full font-bold mr-4 shrink-0
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                    index === 1 ? 'bg-gray-200 text-gray-700' : 
                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500 border border-gray-200'}
                `}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 truncate">{comp.name}</div>
                  <div className="text-xs text-gray-500 font-mono">ID: {comp.id}</div>
                </div>
                <div className="text-right pl-4">
                  {comp.score === null ? (
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-500 rounded-md">Pendente</span>
                  ) : (
                    <span className="text-xl font-bold text-wood-700">{comp.score}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- PAGES ---

// 1. Leaderboard Page
const LeaderboardPage: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await TournamentService.getAll();
      const sorted = data.sort((a, b) => {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.createdAt - b.createdAt; 
      });
      setCompetitors(sorted);
    };
    
    load();
    const interval = setInterval(load, 2000); // Polling update
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Classificação Geral</h1>
        <p className="text-gray-500">Torneio de Baladeira - Acompanhe os resultados em tempo real</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 h-[600px]">
        <CategorySection 
          title="Categoria Livre" 
          category="Livre" 
          colorClass="bg-blue-50" 
          iconColor="text-blue-600"
          competitors={competitors}
        />
        <CategorySection 
          title="Categoria Feminina" 
          category="Feminina" 
          colorClass="bg-pink-50" 
          iconColor="text-pink-600"
          competitors={competitors}
        />
      </div>
    </div>
  );
};

// 2. Login Page
const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'admin' && pass === 'admin') {
      onSuccess();
    } else {
      setError('Credenciais inválidas. Tente novamente.');
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
          <p className="text-gray-500 mt-2">Área administrativa do torneio</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
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
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-wood-600 text-white py-3 rounded-lg font-bold hover:bg-wood-700 transition-colors shadow-lg shadow-wood-600/20"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

// 3. Registration Page
const RegistrationPage: React.FC = () => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Livre');
  const [lastRegistered, setLastRegistered] = useState<Competitor | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await TournamentService.register(name, category);
      
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
        Nova Inscrição
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
            <p className="text-xs text-gray-500 mt-2">Permitido até 3 inscrições por nome.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Categoria</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCategory('Livre')}
                className={`p-4 rounded-xl border-2 transition-all text-center font-medium ${
                  category === 'Livre' 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-blue-200'
                }`}
                disabled={isSubmitting}
              >
                Livre
              </button>
              <button
                type="button"
                onClick={() => setCategory('Feminina')}
                className={`p-4 rounded-xl border-2 transition-all text-center font-medium ${
                  category === 'Feminina' 
                  ? 'border-pink-500 bg-pink-50 text-pink-700' 
                  : 'border-gray-200 hover:border-pink-200'
                }`}
                disabled={isSubmitting}
              >
                Feminina
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-wood-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-wood-700 transition-colors shadow-lg ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
            <div className="text-sm text-gray-500 mb-1">Número de Inscrição</div>
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
const ScoringPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  // Reload competitors when searching or after update
  const refreshList = async () => {
    const data = await TournamentService.getAll();
    setCompetitors(data);
  };

  useEffect(() => {
    refreshList();
  }, []);

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
      setSelectedCompetitor(null);
      setSearchTerm('');
      refreshList();
    } else {
      alert('Erro ao salvar pontuação.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8">
       <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <Medal className="w-8 h-8 text-wood-600" />
        Lançar Pontuação
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
                <div className="text-center py-4 text-gray-500">Nenhum competidor encontrado.</div>
              ) : (
                filteredCompetitors.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompetitor(comp)}
                    className="w-full flex items-center justify-between p-4 hover:bg-wood-50 rounded-xl border border-transparent hover:border-wood-200 transition-all text-left group"
                  >
                    <div>
                      <div className="font-bold text-gray-800 group-hover:text-wood-800">{comp.name}</div>
                      <div className="text-xs text-gray-500 font-mono">ID: {comp.id} • {comp.category}</div>
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
        <div className="animate-fade-in">
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
        </div>
      )}
    </div>
  );
};

// 5. Manage Participants Page
const ManageParticipantsPage: React.FC = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const refreshList = async () => {
    const data = await TournamentService.getAll();
    setCompetitors(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleEdit = (comp: Competitor) => {
    setEditingId(comp.id);
    setEditName(comp.name);
  };

  const handleSave = async (id: string) => {
    if (!editName.trim()) return;
    await TournamentService.updateName(id, editName);
    setEditingId(null);
    refreshList();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este participante? Esta ação não pode ser desfeita.')) {
      await TournamentService.deleteCompetitor(id);
      refreshList();
    }
  };

  const handleSeed = async () => {
    if (window.confirm('Isso irá gerar 60 competidores aleatórios (30 Livre, 30 Feminino) com pontuações. Deseja continuar?')) {
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
  }

  const filteredCompetitors = competitors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-wood-600" />
          Gerenciar Participantes
        </h1>
        
        <button 
          onClick={handleSeed}
          disabled={isSeeding}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
        >
          {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Gerar Dados de Teste (Seed)
        </button>
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
              placeholder="Pesquisar..."
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
                    {editingId === comp.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1 border rounded-lg focus:ring-2 focus:ring-wood-500 outline-none w-full"
                        />
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{comp.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${comp.category === 'Livre' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                      {comp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {comp.score !== null ? comp.score : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === comp.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleSave(comp.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(comp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(comp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredCompetitors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Nenhum participante encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 6. Bracket Page
const BracketPage: React.FC = () => {
  const [category, setCategory] = useState<Category>('Livre');
  const [qualifiers, setQualifiers] = useState<Competitor[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await TournamentService.getAll();
      const filtered = data.filter(c => c.category === category);
      // Sort desc by score
      const sorted = filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
      // Take top 16
      setQualifiers(sorted.slice(0, 16));
    };
    load();
  }, [category]);

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

  const MatchBox = ({ p1, p2 }: { p1?: Competitor, p2?: Competitor }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm w-full mb-4 overflow-hidden text-xs sm:text-sm">
      <div className={`p-2 flex justify-between items-center ${p1 ? 'bg-gray-50' : 'bg-gray-100'}`}>
        <span className={`font-semibold truncate ${p1 ? 'text-gray-800' : 'text-gray-400'}`}>
          {p1 ? `#${qualifiers.indexOf(p1) + 1} ${p1.name}` : 'A definir'}
        </span>
        <span className="text-gray-500 font-mono text-xs">{p1?.score ?? '-'}</span>
      </div>
      <div className="h-px bg-gray-200"></div>
      <div className={`p-2 flex justify-between items-center ${p2 ? 'bg-gray-50' : 'bg-gray-100'}`}>
        <span className={`font-semibold truncate ${p2 ? 'text-gray-800' : 'text-gray-400'}`}>
           {p2 ? `#${qualifiers.indexOf(p2) + 1} ${p2.name}` : 'A definir'}
        </span>
        <span className="text-gray-500 font-mono text-xs">{p2?.score ?? '-'}</span>
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
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
           <button
             onClick={() => setCategory('Livre')}
             className={`px-4 py-2 rounded-lg font-medium transition-colors ${category === 'Livre' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Livre
           </button>
           <button
             onClick={() => setCategory('Feminina')}
             className={`px-4 py-2 rounded-lg font-medium transition-colors ${category === 'Feminina' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-gray-50'}`}
           >
             Feminina
           </button>
        </div>
      </div>

      <div className="min-w-[800px] flex justify-between gap-4 py-8">
        {/* Round of 16 */}
        <div className="flex-1 flex flex-col justify-around">
           <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Oitavas de Final</h3>
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

        {/* Semi Finals */}
        <div className="flex-1 flex flex-col justify-around pt-24 pb-24">
          <h3 className="text-center font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">Semifinal</h3>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="relative">
               <MatchBox />
               <div className={`hidden sm:block absolute right-[-1rem] top-1/2 w-4 border-t-2 border-gray-300 ${i % 2 === 0 ? 'h-[18rem] border-r-2 translate-y-0' : 'h-[18rem] border-r-2 -translate-y-[18rem]'}`}></div>
            </div>
          ))}
        </div>

        {/* Final */}
        <div className="flex-1 flex flex-col justify-around pt-48 pb-48">
          <h3 className="text-center font-bold text-wood-600 mb-4 uppercase tracking-wider text-xs">Final</h3>
          <div className="relative">
             <MatchBox />
             <div className="absolute -left-4 top-1/2 w-4 border-t-2 border-gray-300"></div>
          </div>
        </div>
      </div>
      
      <p className="text-center text-gray-400 mt-8 text-sm">
        * A chave é montada automaticamente com base nos 16 melhores colocados do Ranking.
      </p>
    </div>
  );
};

// --- APP ROOT ---

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('leaderboard');
  const [isAdmin, setIsAdmin] = useState(false);

  // Simple persisted auth state for session
  useEffect(() => {
    const session = sessionStorage.getItem('isAdmin');
    if (session === 'true') setIsAdmin(true);
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    sessionStorage.setItem('isAdmin', 'true');
    // Navigate to the view they likely wanted, defaulting to registration
    setCurrentView('registration');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('isAdmin');
    setCurrentView('leaderboard');
  };

  // Protected Route Logic
  const renderView = () => {
    switch (currentView) {
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'bracket':
        return <BracketPage />; // Public view
      case 'login':
        return <LoginPage onSuccess={handleLoginSuccess} />;
      case 'registration':
        return isAdmin ? <RegistrationPage /> : <LoginPage onSuccess={handleLoginSuccess} />;
      case 'scoring':
        return isAdmin ? <ScoringPage /> : <LoginPage onSuccess={handleLoginSuccess} />;
      case 'manage':
        return isAdmin ? <ManageParticipantsPage /> : <LoginPage onSuccess={handleLoginSuccess} />;
      default:
        return <LeaderboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <Navbar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isAdmin={isAdmin} 
        onLogout={handleLogout}
      />
      <main className="mt-4">
        {renderView()}
      </main>
    </div>
  );
};

export default App;