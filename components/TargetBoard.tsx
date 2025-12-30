import React, { useState, useEffect } from 'react';
import { TARGET_CONFIGS, MAX_SHOTS } from '../types';
import { Circle, CheckCircle2, Target } from 'lucide-react';

interface TargetBoardProps {
  onScoreConfirm: (targets: number[]) => void;
  initialTargets?: number[];
}

export const TargetBoard: React.FC<TargetBoardProps> = ({ onScoreConfirm, initialTargets = [] }) => {
  // We flatten the config to individual selectable items
  // e.g., if 10 has count 2, we have two items with value 10
  const [availableTargets, setAvailableTargets] = useState<{ id: string; value: number; isSelected: boolean }[]>([]);

  useEffect(() => {
    let items: { id: string; value: number; isSelected: boolean }[] = [];
    let idCounter = 0;

    // Constrói a lista de todos os alvos disponíveis
    TARGET_CONFIGS.forEach(conf => {
      for (let i = 0; i < conf.count; i++) {
        items.push({
          id: `target-${idCounter++}`,
          value: conf.points,
          isSelected: false
        });
      }
    });

    // Se houver pontuação salva, pré-seleciona os alvos correspondentes
    if (initialTargets && initialTargets.length > 0) {
      // Cria uma cópia dos alvos atingidos para ir "consumindo" conforme encontra match
      const targetsToSelect = [...initialTargets];
      
      items = items.map(item => {
        // Verifica se o valor deste alvo está na lista de alvos atingidos
        const index = targetsToSelect.indexOf(item.value);
        if (index > -1) {
          // Encontrou match: marca como selecionado e remove da lista temporária
          // para garantir que se houver 2 alvos de 10pts e o usuário acertou apenas 1, apenas 1 seja marcado
          targetsToSelect.splice(index, 1);
          return { ...item, isSelected: true };
        }
        return item;
      });
    }
    
    setAvailableTargets(items);
  }, [initialTargets]);

  const selectedCount = availableTargets.filter(t => t.isSelected).length;
  const currentTotal = availableTargets.filter(t => t.isSelected).reduce((sum, t) => sum + t.value, 0);

  const toggleTarget = (id: string) => {
    setAvailableTargets(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      // Se estiver desmarcando, sempre permite
      if (target.isSelected) {
        return prev.map(t => t.id === id ? { ...t, isSelected: false } : t);
      }

      // Se estiver marcando, verifica o limite
      const currentlySelected = prev.filter(t => t.isSelected).length;
      if (currentlySelected >= MAX_SHOTS) {
        alert(`Máximo de ${MAX_SHOTS} alvos permitidos!`);
        return prev;
      }

      return prev.map(t => t.id === id ? { ...t, isSelected: true } : t);
    });
  };

  const handleConfirm = () => {
    const selectedValues = availableTargets
      .filter(t => t.isSelected)
      .map(t => t.value);
    onScoreConfirm(selectedValues);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Seletor de Alvos</h3>
          <p className="text-sm text-gray-500">Selecione os alvos abatidos (Máx: {MAX_SHOTS})</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-wood-600">{currentTotal} <span className="text-sm font-normal text-gray-400">pts</span></div>
          <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${selectedCount === MAX_SHOTS ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
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
                ? 'border-wood-600 bg-wood-50 shadow-inner' 
                : 'border-gray-200 hover:border-wood-300 hover:bg-gray-50'}
            `}
          >
            {target.isSelected && (
              <div className="absolute top-2 right-2 text-wood-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center mb-2 font-bold text-white shadow-sm
              ${target.isSelected ? 'bg-wood-600 ring-4 ring-wood-200' : 'bg-gray-400'}
            `}>
              {target.value}
            </div>
            <span className={`text-sm font-medium ${target.isSelected ? 'text-wood-800' : 'text-gray-500'}`}>
              Alvo {target.value}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        className="w-full py-4 bg-wood-600 hover:bg-wood-700 text-white rounded-xl font-bold text-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        <Target className="w-5 h-5" />
        {initialTargets && initialTargets.length > 0 ? 'Atualizar Pontuação' : 'Confirmar Pontuação'}
      </button>
    </div>
  );
};