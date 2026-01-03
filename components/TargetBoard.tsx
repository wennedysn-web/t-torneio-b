import React, { useState, useEffect } from 'react';
import { TARGET_CONFIGS, MAX_SHOTS } from '../types';
import { Circle, CheckCircle2, Target, PlusCircle } from 'lucide-react';

interface TargetBoardProps {
  onScoreConfirm: (targets: number[]) => void;
  initialTargets?: number[];
}

export const TargetBoard: React.FC<TargetBoardProps> = ({ onScoreConfirm, initialTargets = [] }) => {
  const [availableTargets, setAvailableTargets] = useState<{ id: string; value: number; isSelected: boolean }[]>([]);
  const [extraPoints, setExtraPoints] = useState<number[]>([]);

  useEffect(() => {
    let items: { id: string; value: number; isSelected: boolean }[] = [];
    let idCounter = 0;
    TARGET_CONFIGS.forEach(conf => {
      for (let i = 0; i < conf.count; i++) {
        items.push({ id: `target-${idCounter++}`, value: conf.points, isSelected: false });
      }
    });

    const extras: number[] = [];
    if (initialTargets && initialTargets.length > 0) {
      const targetsToSelect = [...initialTargets];
      items = items.map(item => {
        const index = targetsToSelect.indexOf(item.value);
        if (index > -1) {
          targetsToSelect.splice(index, 1);
          return { ...item, isSelected: true };
        }
        return item;
      });
      targetsToSelect.forEach(val => extras.push(val));
    }
    setAvailableTargets(items);
    setExtraPoints(extras);
  }, [initialTargets]);

  const selectedCount = availableTargets.filter(t => t.isSelected).length;
  const standardTotal = availableTargets.filter(t => t.isSelected).reduce((sum, t) => sum + t.value, 0);
  const extraTotal = extraPoints.reduce((a, b) => a + b, 0);
  const currentTotal = standardTotal + extraTotal;

  const toggleTarget = (id: string) => {
    setAvailableTargets(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;
      if (target.isSelected) return prev.map(t => t.id === id ? { ...t, isSelected: false } : t);
      if (prev.filter(t => t.isSelected).length >= MAX_SHOTS) {
        alert(`Máximo de ${MAX_SHOTS} alvos permitidos!`);
        return prev;
      }
      return prev.map(t => t.id === id ? { ...t, isSelected: true } : t);
    });
  };

  return (
    <div className="bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Seletor de Alvos</h3>
          <p className="text-sm text-slate-400">Selecione os alvos abatidos (Máx: {MAX_SHOTS})</p>
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end">
             <div className="text-3xl font-bold text-wood-500">
               {currentTotal} <span className="text-sm font-normal text-slate-500">pts</span>
             </div>
             {extraTotal > 0 && (
               <div className="text-[10px] font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <PlusCircle className="w-3 h-3" />
                 Desempate ({extraTotal})
               </div>
             )}
          </div>
          <div className={`mt-1 text-[10px] uppercase font-bold px-2 py-1 rounded-full inline-block ${selectedCount === MAX_SHOTS ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
            {selectedCount}/{MAX_SHOTS} Disparos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {availableTargets.map((target) => (
          <button
            key={target.id}
            onClick={() => toggleTarget(target.id)}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 border-2
              ${target.isSelected 
                ? 'border-wood-600 bg-wood-600/10 shadow-lg shadow-wood-600/5' 
                : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800'}
            `}
          >
            {target.isSelected && <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-wood-500" />}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-2 font-bold text-white shadow-lg
              ${target.isSelected ? 'bg-wood-600 ring-2 ring-wood-500/20' : 'bg-slate-700 text-slate-400'}
            `}>
              {target.value}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${target.isSelected ? 'text-wood-400' : 'text-slate-500'}`}>
              Ponto {target.value}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onScoreConfirm([...availableTargets.filter(t => t.isSelected).map(t => t.value), ...extraPoints])}
        className="w-full py-4 bg-wood-600 hover:bg-wood-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-wood-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <Target className="w-5 h-5" />
        Salvar Pontuação
      </button>
    </div>
  );
};