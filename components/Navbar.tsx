import React from 'react';
import { Trophy, Target, UserPlus, LogOut, Lock, Users, GitMerge, Calendar } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  isAdmin: boolean;
  onLogout: () => void;
  year: number | null;
  onChangeYear: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView, isAdmin, onLogout, year, onChangeYear }) => {
  
  const navItemClass = (viewName: string) => `
    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base whitespace-nowrap
    ${currentView === viewName 
      ? 'bg-wood-600 text-white shadow-lg' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-wood-400'}
  `;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer shrink-0 mr-4" onClick={() => onChangeView('leaderboard')}>
            <div className="bg-wood-600 p-2 rounded-full mr-2 sm:mr-3 shadow-lg shadow-wood-600/20">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-slate-100 hidden md:block">Torneio Baladeira</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar mask-gradient">
            
            {/* Botão de Ano */}
            {year && (
              <button 
                onClick={onChangeYear}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-bold text-sm sm:text-base whitespace-nowrap bg-slate-800 text-wood-400 border border-slate-700 hover:bg-slate-700 mr-2"
                title="Alterar Ano"
              >
                <Calendar className="w-4 h-4" />
                <span>{year}</span>
              </button>
            )}

            <button onClick={() => onChangeView('leaderboard')} className={navItemClass('leaderboard')}>
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Ranking</span>
            </button>
            
            <button onClick={() => onChangeView('bracket')} className={navItemClass('bracket')}>
              <GitMerge className="w-4 h-4" />
              <span className="hidden sm:inline">Chaves</span>
            </button>
            
            <button onClick={() => onChangeView('registration')} className={navItemClass('registration')}>
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Inscrição</span>
            </button>

            <button onClick={() => onChangeView('scoring')} className={navItemClass('scoring')}>
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Pontos</span>
            </button>

            <button onClick={() => onChangeView('manage')} className={navItemClass('manage')}>
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar</span>
            </button>

            {isAdmin ? (
               <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors font-medium ml-2">
                <LogOut className="w-4 h-4" />
               </button>
            ) : (
              <button onClick={() => onChangeView('login')} className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-wood-400 transition-colors ml-2">
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};