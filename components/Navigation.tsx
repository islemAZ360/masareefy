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
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
       <nav className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] px-6 py-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)] flex items-center justify-between w-full max-w-sm pointer-events-auto transition-transform duration-300">
          
          <NavItem view="dashboard" icon={Home} />
          <NavItem view="transactions" icon={List} />

          {/* Central Add Button (Restored to Center) */}
          <button 
              onClick={() => onNavigate('add')}
              className="w-14 h-14 bg-white text-black rounded-[1.2rem] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 -mt-8 border-4 border-[#050505] relative z-20 group shrink-0"
          >
              <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <NavItem view="reports" icon={PieIcon} />
          <NavItem view="settings" icon={Settings} />
          
       </nav>
    </div>
  );
};