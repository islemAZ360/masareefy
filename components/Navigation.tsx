import React from 'react';
import { Home, List, Plus, PieChart as PieIcon, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Navigation: React.FC<Props> = ({ currentView, onNavigate }) => {
  
  const NavItem = ({ view, icon: Icon }: { view: ViewState; icon: any }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => onNavigate(view)}
        className={`flex flex-col items-center gap-1 transition-all duration-300 group ${isActive ? 'text-white -translate-y-1' : 'text-zinc-500 hover:text-gray-300'}`}
      >
        <div className={`absolute -bottom-6 w-1 h-1 rounded-full bg-white transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}></div>
        <Icon size={24} strokeWidth={isActive ? 3 : 2} className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`} />
      </button>
    );
  };

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
       <nav className="bg-[#161618]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-8 py-4 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)] flex items-center gap-8 pointer-events-auto transition-transform duration-300">
          
          <NavItem view="dashboard" icon={Home} />
          <NavItem view="transactions" icon={List} />

          {/* Central Add Button */}
          <button 
              onClick={() => onNavigate('add')}
              className="w-16 h-16 bg-white text-black rounded-[1.2rem] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 -mt-10 border-4 border-[#050505] relative z-20 group"
          >
              <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <NavItem view="reports" icon={PieIcon} />
          <NavItem view="settings" icon={Settings} />
          
       </nav>
    </div>
  );
};