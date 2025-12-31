export type Category = string; // Mudado de Union Type fixo para string para suportar BD

export interface CategoryDef {
  id?: number;
  name: string;
  prefix: string; // Ex: 'L' para Livre, 'F' para Feminina
  color?: string; // Opcional: para UI
}

export interface Competitor {
  id: string; // The generated ID (e.g., L123)
  name: string;
  category: string;
  score: number | null; // null represents not yet played
  targetsHit: number[]; // Array of points from hit targets
  createdAt: number;
  year: number; // Novo campo para histórico anual
}

export interface TargetConfig {
  points: number;
  count: number;
}

export const TARGET_CONFIGS: TargetConfig[] = [
  { points: 10, count: 2 },
  { points: 12, count: 1 },
  { points: 14, count: 1 },
  { points: 16, count: 1 },
  { points: 18, count: 1 },
  { points: 20, count: 1 },
  { points: 22, count: 1 },
  { points: 24, count: 1 },
];

export const MAX_SHOTS = 7;