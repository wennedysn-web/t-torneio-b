import Dexie, { type Table } from 'dexie';
import { Competitor, Category, TARGET_CONFIGS } from '../types';

// Definição da classe do Banco de Dados
class TournamentDatabase extends Dexie {
  competitors!: Table<Competitor, string>;

  constructor() {
    super('BaladeiraTournamentDB');
    // Cast to any to bypass TS error: Property 'version' does not exist on type 'TournamentDatabase'
    (this as any).version(1).stores({
      competitors: 'id, name, category, score, createdAt' // Define índices para busca rápida
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
  getAll: async (): Promise<Competitor[]> => {
    return await db.competitors.toArray();
  },

  register: async (name: string, category: Category): Promise<{ success: boolean; message: string; competitor?: Competitor }> => {
    const count = await db.competitors
      .filter(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())
      .count();

    if (count >= 3) {
      return { success: false, message: 'Este participante já possui o limite máximo de 3 inscrições.' };
    }

    let newId = '';
    let isUnique = false;
    const prefix = category === 'Livre' ? 'L' : 'F';
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
      category,
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
    const categories: Category[] = ['Livre', 'Feminina'];
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

    for (const category of categories) {
      for (let i = 0; i < 30; i++) {
        // Generate Random Name
        const name = `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`;
        
        // Generate Unique ID
        let id = '';
        let unique = false;
        let attempts = 0;
        
        // Tenta gerar ID único (L1000 - L9999 para diferenciar dos manuais)
        while (!unique && attempts < 200) {
           const num = Math.floor(Math.random() * 9000) + 1000; 
           id = `${category === 'Livre' ? 'L' : 'F'}${num}`;
           
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
            category,
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