import Dexie, { type Table } from 'dexie';
import { Competitor, CategoryDef, TARGET_CONFIGS } from '../types';

// Definição da classe do Banco de Dados
class TournamentDatabase extends Dexie {
  competitors!: Table<Competitor, string>;
  categories!: Table<CategoryDef, number>;

  constructor() {
    super('BaladeiraTournamentDB');
    
    // Versão 1: Inicial
    // Versão 2: Adiciona categorias
    (this as any).version(2).stores({
      competitors: 'id, name, category, score, createdAt',
      categories: '++id, name, prefix'
    });
  }
}

export const db = new TournamentDatabase();

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
  // --- Initialize ---
  initDefaults: async () => {
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkAdd([
        { name: 'Livre', prefix: 'L', color: 'blue' },
        { name: 'Feminina', prefix: 'F', color: 'pink' }
      ]);
    }
  },

  // --- Categories ---
  getCategories: async (): Promise<CategoryDef[]> => {
    return await db.categories.toArray();
  },

  addCategory: async (name: string, prefix: string): Promise<void> => {
    await db.categories.add({ name, prefix: prefix.toUpperCase() });
  },

  deleteCategory: async (id: number): Promise<void> => {
    await db.categories.delete(id);
  },

  getCategoryByPrefix: async (prefix: string): Promise<CategoryDef | undefined> => {
    return await db.categories.where('prefix').equals(prefix).first();
  },

  getCategoryByName: async (name: string): Promise<CategoryDef | undefined> => {
    return await db.categories.where('name').equals(name).first();
  },

  // --- Competitors ---
  getAll: async (): Promise<Competitor[]> => {
    return await db.competitors.toArray();
  },

  register: async (name: string, categoryName: string): Promise<{ success: boolean; message: string; competitor?: Competitor }> => {
    const count = await db.competitors
      .filter(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())
      .count();

    if (count >= 3) {
      return { success: false, message: 'Este participante já possui o limite máximo de 3 inscrições.' };
    }

    // Buscar prefixo da categoria
    const categoryDef = await db.categories.where('name').equals(categoryName).first();
    const prefix = categoryDef ? categoryDef.prefix : categoryName.charAt(0).toUpperCase();

    let newId = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      const num = Math.floor(Math.random() * 900) + 100;
      newId = `${prefix}${num}`;
      
      const existing = await db.competitors.get(newId);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return { success: false, message: 'Não foi possível gerar um ID único. Tente novamente.' };
    }

    const newCompetitor: Competitor = {
      id: newId,
      name: name.trim(),
      category: categoryName,
      score: null,
      targetsHit: [],
      createdAt: Date.now(),
    };

    await db.competitors.add(newCompetitor);
    return { success: true, message: 'Inscrição realizada com sucesso!', competitor: newCompetitor };
  },

  updateScore: async (id: string, targetsHit: number[]): Promise<boolean> => {
    const totalScore = targetsHit.reduce((a, b) => a + b, 0);
    
    const updated = await db.competitors.update(id, {
      score: totalScore,
      targetsHit: targetsHit
    });

    return updated === 1;
  },

  updateName: async (id: string, newName: string): Promise<boolean> => {
    const updated = await db.competitors.update(id, {
      name: newName.trim()
    });
    return updated === 1;
  },

  deleteCompetitor: async (id: string): Promise<void> => {
    await db.competitors.delete(id);
  },

  reset: async () => {
    await db.competitors.clear();
  },

  // Nova função para gerar dados de teste
  seedDatabase: async (): Promise<void> => {
    // Ensure default categories exist
    await TournamentService.initDefaults();
    const categories = await db.categories.toArray();

    const newCompetitors: Competitor[] = [];

    // Carrega IDs existentes para evitar colisão na geração
    const existingKeys = await db.competitors.toCollection().primaryKeys();
    const existingIds = new Set(existingKeys);

    // Flatten available targets for simulation
    const targetPool: number[] = [];
    TARGET_CONFIGS.forEach(conf => {
      for (let i = 0; i < conf.count; i++) targetPool.push(conf.points);
    });

    // Função auxiliar para embaralhar array
    const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);

    for (const cat of categories) {
      for (let i = 0; i < 15; i++) { // 15 por categoria
        // Generate Random Name
        const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
        
        // Generate Unique ID
        let id = '';
        let unique = false;
        let attempts = 0;
        
        // Tenta gerar ID único (Ex: L1000 - L9999 para diferenciar dos manuais)
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
              targetsHit,
              createdAt: Date.now() + i, 
            });
        }
      }
    }
    
    // Usamos bulkPut ao invés de bulkAdd para evitar erros caso algum ID escape da verificação
    if (newCompetitors.length > 0) {
        await db.competitors.bulkPut(newCompetitors);
    }
  }
};