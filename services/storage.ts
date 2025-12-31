import { createClient } from '@supabase/supabase-js';
import { Competitor, CategoryDef, TARGET_CONFIGS } from '../types';

// Configuração do Supabase
const SUPABASE_URL = 'https://zwgcmyotzjfwvhgqgcad.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FP5Ukh5MKYUGJkbV1s3_GQ_F8oBRvRK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Chaves do LocalStorage para Fallback Offline
const LS_KEYS = {
  CATEGORIES: 'baladeira_categories_backup',
  COMPETITORS: 'baladeira_competitors_backup',
  AUTH_USER: 'baladeira_auth_user_backup',
  MATCHES: 'baladeira_matches_backup' // Nova chave para partidas
};

// Interface para Partida
export interface MatchResult {
  id: string; // ex: "Livre-2024-R16-1" (Categoria-Ano-Fase-Indice)
  p1Id: string;
  p2Id: string;
  score1: number;
  score2: number;
  winnerId: string | null;
  timestamp: number;
}

// Dados para geração aleatória
const FIRST_NAMES = [
  'João', 'Maria', 'José', 'Ana', 'Pedro', 'Francisca', 'Antônio', 'Adriana', 'Carlos', 'Márcia',
  'Paulo', 'Fernanda', 'Lucas', 'Patrícia', 'Luiz', 'Aline', 'Marcos', 'Sandra', 'Gabriel', 'Camila',
  'Rafael', 'Amanda', 'Daniel', 'Bruna', 'Marcelo', 'Jéssica', 'Bruno', 'Letícia', 'Eduardo', 'Júlia',
  'Felipe', 'Luciana', 'Raimundo', 'Vanessa', 'Francisco', 'Mariana', 'Rodrigo', 'Gabriela'
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
  'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas'
];

// Helper para verificar se estamos operando no modo Admin Local (Sem backend)
const isOfflineMode = () => {
  try {
    const userStr = localStorage.getItem(LS_KEYS.AUTH_USER);
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return user.id === 'offline-admin';
  } catch (e) {
    return false;
  }
};

export const TournamentService = {
  // --- Auth Wrapper ---
  auth: {
    login: async (email: string, password: string) => {
      try {
        // Tentativa Online
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Salva sessão localmente para persistência simples
        localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(data.user));
        return { user: data.user, error: null };

      } catch (err: any) {
        console.warn('Falha no login online, tentando modo offline/backup...', err.message);

        // Fallback para ADMIN local (Modo de emergência/teste)
        // Permite admin/admin ou a credencial correta mesmo sem rede
        if (
          (email === 'admin@baladeira.com' && password === 'admin123') || 
          (email === 'admin' && password === 'admin')
        ) {
          const fakeUser = { id: 'offline-admin', email: 'admin@baladeira.com', role: 'authenticated' };
          localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(fakeUser));
          return { user: fakeUser as any, error: null };
        }

        return { user: null, error: err };
      }
    },
    logout: async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Erro ao deslogar do Supabase', e);
      }
      localStorage.removeItem(LS_KEYS.AUTH_USER);
      return { error: null };
    },
    getUser: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return session.user;
      } catch (e) {
        // Ignora erro de fetch na sessão
      }
      
      // Fallback local
      const local = localStorage.getItem(LS_KEYS.AUTH_USER);
      return local ? JSON.parse(local) : null;
    }
  },

  // --- Health Check ---
  checkHealth: async (): Promise<{ ok: boolean; message?: string }> => {
    if (isOfflineMode()) return { ok: false, message: 'Modo Admin Local (Dados apenas no navegador)' };

    try {
      const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true }).limit(1);
      if (error) throw error;
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: 'Sem conexão com banco (Offline)' };
    }
  },

  // --- Initialize ---
  initDefaults: async () => {
    // Carrega categorias locais se existirem
    const localCats = localStorage.getItem(LS_KEYS.CATEGORIES);
    let hasLocal = localCats && JSON.parse(localCats).length > 0;

    if (!hasLocal) {
        const defaults = [
            { id: 1, name: 'Livre', prefix: 'L' },
            { id: 2, name: 'Feminina', prefix: 'F' }
        ];
        localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(defaults));
    }

    if (isOfflineMode()) return;

    try {
      const { count, error } = await supabase.from('categories').select('*', { count: 'exact', head: true });
      if (!error && count === 0) {
        await supabase.from('categories').insert([
          { name: 'Livre', prefix: 'L' },
          { name: 'Feminina', prefix: 'F' }
        ]);
      }
    } catch (e) {
      console.log('Modo offline: pulando inicialização remota.');
    }
  },

  // --- Categories ---
  getCategories: async (): Promise<CategoryDef[]> => {
    if (isOfflineMode()) {
        const cached = localStorage.getItem(LS_KEYS.CATEGORIES);
        return cached ? JSON.parse(cached) : [];
    }

    try {
      const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: true });
      if (error) throw error;
      
      localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(data));
      return data as CategoryDef[];
    } catch (e) {
      console.warn('Usando categorias em cache (Offline)');
      const cached = localStorage.getItem(LS_KEYS.CATEGORIES);
      return cached ? JSON.parse(cached) : [];
    }
  },

  addCategory: async (name: string, prefix: string): Promise<void> => {
    // 1. Atualiza Local
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const newCat = { id: Date.now(), name, prefix: prefix.toUpperCase() }; 
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify([...cached, newCat]));

    if (isOfflineMode()) return;

    // 2. Tenta Remoto
    try {
      await supabase.from('categories').insert({ name, prefix: prefix.toUpperCase() });
    } catch (e) { console.error('Erro remoto add cat', e); }
  },

  deleteCategory: async (id: number): Promise<void> => {
    // 1. Atualiza Local
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const filtered = cached.filter((c: any) => c.id !== id);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(filtered));

    if (isOfflineMode()) return;

    // 2. Tenta Remoto
    try {
      await supabase.from('categories').delete().eq('id', id);
    } catch (e) { console.error('Erro remoto delete cat', e); }
  },

  // --- Competitors ---
  getAll: async (): Promise<Competitor[]> => {
    // SE FOR MODO OFFLINE ADMIN, NÃO TENTE BUSCAR DO SUPABASE
    // Isso evita que o getAll sobrescreva a exclusão local com dados antigos do servidor
    if (isOfflineMode()) {
        const cached = localStorage.getItem(LS_KEYS.COMPETITORS);
        return cached ? JSON.parse(cached) : [];
    }

    try {
      const { data, error } = await supabase.from('competitors').select('*');
      if (error) throw error;

      const formatted = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        score: row.score,
        targetsHit: row.targets_hit || [],
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        // Se a coluna year não existir ou for null, tenta extrair do created_at ou usa o ano atual
        year: row.year || (row.created_at ? new Date(row.created_at).getFullYear() : new Date().getFullYear())
      }));

      // Atualiza Cache
      localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      console.warn('Usando competidores em cache (Offline)');
      const cached = localStorage.getItem(LS_KEYS.COMPETITORS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  register: async (name: string, categoryName: string, year: number): Promise<{ success: boolean; message: string; competitor?: Competitor }> => {
    try {
      // Tenta obter prefixo
      const cats = await TournamentService.getCategories();
      const catDef = cats.find(c => c.name === categoryName);
      const prefix = catDef ? catDef.prefix : 'X';
      
      // Gerar ID
      const num = Math.floor(Math.random() * 900) + 100;
      const newId = `${prefix}${num}`;
      
      const newCompetitor: Competitor = {
        id: newId,
        name: name.trim(),
        category: categoryName,
        score: null,
        targetsHit: [],
        createdAt: Date.now(),
        year: year
      };

      // 1. Salvar Localmente
      const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
      const existingCount = cached.filter((c: Competitor) => 
        c.name.toLowerCase() === name.trim().toLowerCase() && 
        c.year === year // Limite de 3 por ANO
      ).length;
      
      if (existingCount >= 3) {
        return { success: false, message: 'Limite de 3 inscrições por pessoa atingido neste ano.' };
      }
      localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify([...cached, newCompetitor]));

      if (isOfflineMode()) {
          return { success: true, message: 'Inscrição realizada (Local)!', competitor: newCompetitor };
      }

      // 2. Tentar Salvar Remotamente
      try {
        const { error } = await supabase.from('competitors').insert({
          id: newId,
          name: name.trim(),
          category: categoryName,
          score: null,
          targets_hit: [],
          created_at: new Date().toISOString(),
          year: year
        });
        if (error) throw error;
      } catch (remoteError) {
        console.warn('Salvo apenas localmente (Erro de sincronização)', remoteError);
      }

      return { success: true, message: 'Inscrição realizada!', competitor: newCompetitor };

    } catch (e: any) {
      return { success: false, message: `Erro: ${e.message}` };
    }
  },

  updateScore: async (id: string, targetsHit: number[]): Promise<boolean> => {
    const totalScore = targetsHit.reduce((a, b) => a + b, 0);

    // 1. Atualiza Local
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    const updated = cached.map((c: Competitor) => {
        if (c.id === id) {
            return { ...c, score: totalScore, targetsHit: targetsHit };
        }
        return c;
    });
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(updated));

    if (isOfflineMode()) return true;

    // 2. Atualiza Remoto
    try {
      await supabase
        .from('competitors')
        .update({ score: totalScore, targets_hit: targetsHit })
        .eq('id', id);
      return true;
    } catch (e) {
      return true;
    }
  },

  // Adiciona 1 ponto à lista de alvos atingidos e recalcula
  addTiebreaker: async (id: string, currentTargets: number[]): Promise<boolean> => {
    // Adiciona o valor '1' que representa o desempate
    const newTargets = [...currentTargets, 1];
    return await TournamentService.updateScore(id, newTargets);
  },

  // Remove todos os pontos de desempate (valor 1)
  resetTiebreaker: async (id: string, currentTargets: number[]): Promise<boolean> => {
    // Filtra removendo o valor '1'
    const newTargets = currentTargets.filter(val => val !== 1);
    return await TournamentService.updateScore(id, newTargets);
  },

  // --- MATCHES (Mata-mata) ---
  saveMatch: async (match: MatchResult): Promise<boolean> => {
    // 1. Local
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.MATCHES) || '[]');
    // Remove se já existir (update)
    const filtered = cached.filter((m: MatchResult) => m.id !== match.id);
    localStorage.setItem(LS_KEYS.MATCHES, JSON.stringify([...filtered, match]));

    if (isOfflineMode()) return true;

    // 2. Remoto (Tentativa simplificada, armazenando em tabela se existisse ou localStorage backup)
    // Como não temos tabela 'matches' no setup original, vamos assumir persistencia local robusta
    // ou usar uma coluna JSON em competitors se fosse crítico, mas aqui usaremos local first.
    return true; 
  },

  getMatches: async (): Promise<MatchResult[]> => {
     const cached = localStorage.getItem(LS_KEYS.MATCHES);
     return cached ? JSON.parse(cached) : [];
  },

  deleteMatches: async (): Promise<void> => {
      localStorage.removeItem(LS_KEYS.MATCHES);
  },

  updateName: async (id: string, newName: string): Promise<boolean> => {
    // 1. Local
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    const updated = cached.map((c: Competitor) => c.id === id ? { ...c, name: newName } : c);
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(updated));

    if (isOfflineMode()) return true;

    // 2. Remoto
    try {
      await supabase.from('competitors').update({ name: newName.trim() }).eq('id', id);
    } catch (e) { console.error(e); }
    return true;
  },

  deleteCompetitor: async (id: string): Promise<boolean> => {
    // 1. Local (Sempre tenta atualizar o cache local para consistência)
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
      const filtered = cached.filter((c: Competitor) => c.id !== id);
      localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(filtered));
    } catch(e) { console.error("Erro cache local", e); }

    if (isOfflineMode()) return true;

    // 2. Remoto
    try {
      const { error } = await supabase.from('competitors').delete().eq('id', id);
      if (error) {
        console.error('Erro ao excluir do Supabase:', error);
        return false;
      }
      return true;
    } catch (e) { 
      console.error('Exceção ao excluir:', e);
      return false; 
    }
  },

  deleteAllCompetitors: async (): Promise<boolean> => {
      try {
          // 1. Local
          localStorage.setItem(LS_KEYS.COMPETITORS, '[]');
          localStorage.removeItem(LS_KEYS.MATCHES);

          if (isOfflineMode()) return true;

          // 2. Remoto
          const { error } = await supabase.from('competitors').delete().neq('id', '0');
          if (error) throw error;
          return true;
      } catch (e) {
          console.error('Erro ao limpar tudo:', e);
          return true;
      }
  },

  seedDatabase: async (): Promise<void> => {
    const cats = await TournamentService.getCategories();
    if (cats.length === 0) return;

    const newComps: Competitor[] = [];
    const targetPool: number[] = [];
    TARGET_CONFIGS.forEach(conf => {
      for (let i = 0; i < conf.count; i++) targetPool.push(conf.points);
    });
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
    const currentYear = new Date().getFullYear();

    for (const cat of cats) {
        for (let i = 0; i < 5; i++) {
            const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
            const num = Math.floor(Math.random() * 900) + 100;
            const id = `${cat.prefix}${num}`;
            const numHits = Math.floor(Math.random() * 5) + 3; 
            const hits = shuffle([...targetPool]).slice(0, numHits);
            
            newComps.push({
                id,
                name,
                category: cat.name,
                score: hits.reduce((a:number, b:number) => a+b, 0),
                targetsHit: hits,
                createdAt: Date.now(),
                year: currentYear
            });
        }
    }

    const current = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify([...current, ...newComps]));
    
    if (isOfflineMode()) return;

    try {
        const payload = newComps.map(c => ({
            id: c.id,
            name: c.name,
            category: c.category,
            score: c.score,
            targets_hit: c.targetsHit,
            created_at: new Date().toISOString(),
            year: c.year
        }));
        await supabase.from('competitors').insert(payload);
    } catch (e) { console.warn('Seed salvo apenas localmente'); }
  }
};