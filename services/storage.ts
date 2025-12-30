import { createClient } from '@supabase/supabase-js';
import { Competitor, CategoryDef, TARGET_CONFIGS } from '../types';

// Configuração do Supabase
// Note: Ensure RLS policies are enabled and tables 'categories' and 'competitors' exist in Supabase.
const SUPABASE_URL = 'https://zwgcmyotzjfwvhgqgcad.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FP5Ukh5MKYUGJkbV1s3_GQ_F8oBRvRK';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export const TournamentService = {
  // --- Auth Wrapper ---
  auth: {
    login: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { user: data.user, error };
    },
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },
    getUser: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  },

  // --- Health Check ---
  checkHealth: async (): Promise<{ ok: boolean; message?: string }> => {
    try {
      // Tenta fazer uma query leve para verificar se a tabela existe e a conexão está ativa
      const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
      
      if (error) {
        // Código 42P01 indica tabela não encontrada no Postgres
        if (error.code === '42P01') {
          return { ok: false, message: 'Tabelas não encontradas. Verifique se o script SQL foi rodado.' };
        }
        return { ok: false, message: `Erro de conexão: ${error.message}` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Erro desconhecido' };
    }
  },

  // --- Initialize ---
  initDefaults: async () => {
    // Verifica se existem categorias
    const { count, error } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Erro ao inicializar categorias (Verifique se a tabela existe no Supabase):', error.message || error);
      return;
    }

    if (count === 0) {
      const { error: insertError } = await supabase.from('categories').insert([
        { name: 'Livre', prefix: 'L' },
        { name: 'Feminina', prefix: 'F' }
      ]);
      
      if (insertError) {
        console.error('Erro ao criar categorias padrão:', insertError.message || insertError);
      }
    }
  },

  // --- Categories ---
  getCategories: async (): Promise<CategoryDef[]> => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Erro ao buscar categorias:', error.message || error);
      return [];
    }
    return (data || []) as CategoryDef[];
  },

  addCategory: async (name: string, prefix: string): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .insert({ name, prefix: prefix.toUpperCase() });
      
    if (error) console.error('Erro ao adicionar categoria:', error.message || error);
  },

  deleteCategory: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) console.error('Erro ao deletar categoria:', error.message || error);
  },

  // --- Competitors ---
  getAll: async (): Promise<Competitor[]> => {
    const { data, error } = await supabase
      .from('competitors')
      .select('*');

    if (error) {
      console.error('Erro ao buscar competidores:', error.message || error);
      return [];
    }

    if (!data) return [];

    // Mapeamento para garantir que o frontend receba os tipos corretos
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      score: row.score,
      targetsHit: row.targets_hit || [], // Supabase retorna jsonb, mapeamos para array
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
    }));
  },

  register: async (name: string, categoryName: string): Promise<{ success: boolean; message: string; competitor?: Competitor }> => {
    // 1. Verificar limite de inscrições (3 por pessoa)
    const { count, error: countError } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .ilike('name', name.trim()); // Case insensitive search

    if (countError) {
      console.error('Erro ao contar inscrições:', countError.message || countError);
      return { success: false, message: 'Erro de conexão ao verificar inscrições.' };
    }

    if ((count || 0) >= 3) {
      return { success: false, message: 'Este participante já possui o limite máximo de 3 inscrições.' };
    }

    // 2. Buscar prefixo da categoria
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('prefix')
      .eq('name', categoryName)
      .single();

    if (catError && catError.code !== 'PGRST116') { // PGRST116 is 'Row not found' which we handle
        console.error('Erro ao buscar categoria:', catError.message);
    }

    const prefix = catData ? catData.prefix : categoryName.charAt(0).toUpperCase();

    // 3. Gerar ID Único
    let newId = '';
    let isUnique = false;
    let attempts = 0;

    // Tentativa otimista de gerar ID
    while (!isUnique && attempts < 10) {
      const num = Math.floor(Math.random() * 900) + 100;
      newId = `${prefix}${num}`;
      
      // Verifica se existe
      const { data: existing, error: checkError } = await supabase
        .from('competitors')
        .select('id')
        .eq('id', newId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error on not found
      
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, message: 'Não foi possível gerar um ID único. Tente novamente.' };
    }

    // 4. Inserir
    const newCompetitorPayload = {
      id: newId,
      name: name.trim(),
      category: categoryName,
      score: null,
      targets_hit: [],
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('competitors')
      .insert(newCompetitorPayload);

    if (insertError) {
      console.error('Erro ao inserir competidor:', insertError.message || insertError);
      return { success: false, message: 'Erro ao salvar no banco de dados.' };
    }

    // Retorna no formato que o frontend espera
    const competitor: Competitor = {
      id: newId,
      name: name.trim(),
      category: categoryName,
      score: null,
      targetsHit: [],
      createdAt: Date.now()
    };

    return { success: true, message: 'Inscrição realizada com sucesso!', competitor };
  },

  updateScore: async (id: string, targetsHit: number[]): Promise<boolean> => {
    const totalScore = targetsHit.reduce((a, b) => a + b, 0);
    
    const { error } = await supabase
      .from('competitors')
      .update({
        score: totalScore,
        targets_hit: targetsHit
      })
      .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar pontuação:', error.message || error);
        return false;
    }
    return true;
  },

  updateName: async (id: string, newName: string): Promise<boolean> => {
    const { error } = await supabase
      .from('competitors')
      .update({ name: newName.trim() })
      .eq('id', id);
      
    if (error) {
        console.error('Erro ao atualizar nome:', error.message || error);
        return false;
    }
    return true;
  },

  deleteCompetitor: async (id: string): Promise<void> => {
    const { error } = await supabase.from('competitors').delete().eq('id', id);
    if (error) console.error('Erro ao deletar competidor:', error.message || error);
  },

  // Nova função para gerar dados de teste
  seedDatabase: async (): Promise<void> => {
    await TournamentService.initDefaults();
    
    // Obter categorias
    const { data: categories, error: catError } = await supabase.from('categories').select('*');
    if (catError || !categories) {
        console.error('Erro ao obter categorias para seed:', catError?.message);
        return;
    }

    // Carregar IDs existentes para evitar colisão (simplificado para o seed)
    const { data: existingData } = await supabase.from('competitors').select('id');
    const existingIds = new Set(existingData?.map(d => d.id) || []);

    const newCompetitors = [];
    
    // Flatten available targets for simulation
    const targetPool: number[] = [];
    TARGET_CONFIGS.forEach(conf => {
      for (let i = 0; i < conf.count; i++) targetPool.push(conf.points);
    });

    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

    for (const cat of categories) {
      for (let i = 0; i < 15; i++) { // 15 por categoria
        const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
        
        let id = '';
        let unique = false;
        let attempts = 0;
        
        while (!unique && attempts < 200) {
           const num = Math.floor(Math.random() * 9000) + 1000; 
           id = `${cat.prefix}${num}`;
           if (!existingIds.has(id) && !newCompetitors.find(c => c.id === id)) {
             unique = true;
           }
           attempts++;
        }

        if (unique) {
            const numHits = Math.floor(Math.random() * 5) + 3; 
            const shuffledTargets = shuffle([...targetPool]);
            const targetsHit = shuffledTargets.slice(0, numHits);
            const score = targetsHit.reduce((a: number, b: number) => a + b, 0);

            newCompetitors.push({
              id,
              name,
              category: cat.name,
              score,
              targets_hit: targetsHit,
              created_at: new Date().toISOString()
            });
        }
      }
    }
    
    if (newCompetitors.length > 0) {
        const { error } = await supabase.from('competitors').insert(newCompetitors);
        if (error) {
            console.error('Erro ao inserir dados de seed:', error.message);
            throw error;
        }
    }
  }
};