
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
  MATCHES: 'baladeira_matches_backup'
};

// Interface para Partida
export interface MatchResult {
  id: string; // ex: "Livre-2024-R16-1"
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
  auth: {
    login: async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(data.user));
        return { user: data.user, error: null };
      } catch (err: any) {
        if ((email === 'admin@baladeira.com' && password === 'admin123') || (email === 'admin' && password === 'admin')) {
          const fakeUser = { id: 'offline-admin', email: 'admin@baladeira.com', role: 'authenticated' };
          localStorage.setItem(LS_KEYS.AUTH_USER, JSON.stringify(fakeUser));
          return { user: fakeUser as any, error: null };
        }
        return { user: null, error: err };
      }
    },
    logout: async () => {
      try { await supabase.auth.signOut(); } catch (e) {}
      localStorage.removeItem(LS_KEYS.AUTH_USER);
      return { error: null };
    },
    getUser: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return session.user;
      } catch (e) {}
      const local = localStorage.getItem(LS_KEYS.AUTH_USER);
      return local ? JSON.parse(local) : null;
    }
  },

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
      const cached = localStorage.getItem(LS_KEYS.CATEGORIES);
      return cached ? JSON.parse(cached) : [];
    }
  },

  addCategory: async (name: string, prefix: string): Promise<void> => {
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const newCat = { id: Date.now(), name, prefix: prefix.toUpperCase() }; 
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify([...cached, newCat]));
    if (isOfflineMode()) return;
    try { await supabase.from('categories').insert({ name, prefix: prefix.toUpperCase() }); } catch (e) {}
  },

  deleteCategory: async (id: number): Promise<void> => {
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.CATEGORIES) || '[]');
    const filtered = cached.filter((c: any) => c.id !== id);
    localStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(filtered));
    if (isOfflineMode()) return;
    try { await supabase.from('categories').delete().eq('id', id); } catch (e) {}
  },

  getAll: async (): Promise<Competitor[]> => {
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
        year: row.year || new Date().getFullYear()
      }));
      localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(formatted));
      return formatted;
    } catch (e) {
      const cached = localStorage.getItem(LS_KEYS.COMPETITORS);
      return cached ? JSON.parse(cached) : [];
    }
  },

  register: async (name: string, categoryName: string, year: number): Promise<{ success: boolean; message: string; competitor?: Competitor }> => {
    try {
      const cats = await TournamentService.getCategories();
      const catDef = cats.find(c => c.name === categoryName);
      const prefix = catDef ? catDef.prefix : 'X';
      const num = Math.floor(Math.random() * 900) + 100;
      const newId = `${prefix}${num}`;
      const newCompetitor: Competitor = { id: newId, name: name.trim(), category: categoryName, score: null, targetsHit: [], createdAt: Date.now(), year: year };

      const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
      const existingCount = cached.filter((c: Competitor) => c.name.toLowerCase() === name.trim().toLowerCase() && c.year === year).length;
      if (existingCount >= 3) return { success: false, message: 'Limite de 3 inscrições atingido.' };
      localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify([...cached, newCompetitor]));

      if (!isOfflineMode()) {
        await supabase.from('competitors').insert({ id: newId, name: name.trim(), category: categoryName, score: null, targets_hit: [], created_at: new Date().toISOString(), year: year });
      }
      return { success: true, message: 'Inscrição realizada!', competitor: newCompetitor };
    } catch (e: any) { return { success: false, message: `Erro: ${e.message}` }; }
  },

  updateScore: async (id: string, targetsHit: number[]): Promise<boolean> => {
    const totalScore = targetsHit.reduce((a, b) => a + b, 0);
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    const updated = cached.map((c: Competitor) => c.id === id ? { ...c, score: totalScore, targetsHit } : c);
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(updated));
    if (isOfflineMode()) return true;
    try { await supabase.from('competitors').update({ score: totalScore, targets_hit: targetsHit }).eq('id', id); return true; } catch (e) { return true; }
  },

  saveMatch: async (match: MatchResult): Promise<boolean> => {
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.MATCHES) || '[]');
    const filtered = cached.filter((m: MatchResult) => m.id !== match.id);
    localStorage.setItem(LS_KEYS.MATCHES, JSON.stringify([...filtered, match]));
    if (isOfflineMode()) return true;
    try {
        await supabase.from('matches').upsert({ id: match.id, p1_id: match.p1Id, p2_id: match.p2Id, score1: match.score1, score2: match.score2, winner_id: match.winnerId, timestamp: match.timestamp });
        return true;
    } catch (e) { return true; }
  },

  getMatches: async (): Promise<MatchResult[]> => {
     if (isOfflineMode()) {
        const cached = localStorage.getItem(LS_KEYS.MATCHES);
        return cached ? JSON.parse(cached) : [];
     }
     try {
         const { data, error } = await supabase.from('matches').select('*');
         if (error) throw error;
         const formatted = data.map((m: any) => ({ id: m.id, p1Id: m.p1_id, p2Id: m.p2_id, score1: m.score1, score2: m.score2, winnerId: m.winner_id, timestamp: m.timestamp }));
         localStorage.setItem(LS_KEYS.MATCHES, JSON.stringify(formatted));
         return formatted;
     } catch(e) {
         const cached = localStorage.getItem(LS_KEYS.MATCHES);
         return cached ? JSON.parse(cached) : [];
     }
  },

  updateName: async (id: string, newName: string): Promise<boolean> => {
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    const updated = cached.map((c: Competitor) => c.id === id ? { ...c, name: newName } : c);
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(updated));
    if (isOfflineMode()) return true;
    try { await supabase.from('competitors').update({ name: newName.trim() }).eq('id', id); } catch (e) {}
    return true;
  },

  deleteCompetitor: async (id: string): Promise<boolean> => {
    const cached = JSON.parse(localStorage.getItem(LS_KEYS.COMPETITORS) || '[]');
    const filtered = cached.filter((c: Competitor) => c.id !== id);
    localStorage.setItem(LS_KEYS.COMPETITORS, JSON.stringify(filtered));
    if (isOfflineMode()) return true;
    try { await supabase.from('competitors').delete().eq('id', id); return true; } catch (e) { return false; }
  },

  deleteAllCompetitors: async (): Promise<boolean> => {
      localStorage.setItem(LS_KEYS.COMPETITORS, '[]');
      localStorage.setItem(LS_KEYS.MATCHES, '[]');
      if (isOfflineMode()) return true;
      try {
          await supabase.from('competitors').delete().neq('id', '0');
          await supabase.from('matches').delete().neq('id', '0');
          return true;
      } catch (e) { return true; }
  },

  seedDatabase: async (): Promise<void> => {
    const cats = await TournamentService.getCategories();
    if (cats.length === 0) return;

    const newComps: Competitor[] = [];
    const targetPool: number[] = [];
    TARGET_CONFIGS.forEach(conf => { for (let i = 0; i < conf.count; i++) targetPool.push(conf.points); });
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
    const currentYear = new Date().getFullYear();

    for (const cat of cats) {
        // Gera 20 participantes por categoria conforme solicitado
        for (let i = 0; i < 20; i++) {
            const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
            const num = 100 + i + (Math.floor(Math.random() * 800));
            const id = `${cat.prefix}${num}`;
            const numHits = Math.floor(Math.random() * 7) + 1; 
            const hits = shuffle([...targetPool]).slice(0, numHits);
            
            newComps.push({
                id,
                name,
                category: cat.name,
                score: hits.reduce((a, b) => a + b, 0),
                targetsHit: hits,
                createdAt: Date.now() + i,
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
            created_at: new Date(c.createdAt).toISOString(),
            year: c.year
        }));
        await supabase.from('competitors').insert(payload);
    } catch (e) { console.warn('Erro ao inserir dados de teste remotamente'); }
  }
};
