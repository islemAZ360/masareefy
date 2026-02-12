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
        className="relative w-12 h-12 flex items-center justify-center transition-all duration-300 group"
      >
        {/* Active Glow Background */}
        {isActive && (
          <div className="absolute inset-1 bg-primary/15 rounded-2xl blur-lg animate-pulse-glow"></div>
        )}

        {/* Icon */}
        <Icon
          size={22}
          strokeWidth={isActive ? 2.5 : 1.8}
          className={`relative z-10 transition-all duration-500 ${isActive ? 'text-white scale-110 drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]' : 'text-zinc-600 group-hover:text-zinc-300 group-active:scale-90'}`}
        />

        {/* Active Neon Dot */}
        <div className={`absolute -bottom-1.5 transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
          <div className="neon-dot animate-pulse"></div>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto w-full max-w-sm glass-premium rounded-[2rem] p-2 flex items-center justify-between shadow-[0_10px_60px_-10px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden">

        {/* Shimmer Sweep */}
        <div className="shimmer-overlay rounded-[2rem]"></div>

        {/* Top Edge Light */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>

        <NavItem view="dashboard" icon={Home} />
        <NavItem view="transactions" icon={List} />

        {/* Central Add Button (Floating & Glowing) */}
        <div className="relative -top-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-white to-accent rounded-[1.8rem] opacity-30 blur-md animate-breathe pointer-events-none"></div>
          <button
            onClick={() => onNavigate('add')}
            className="w-16 h-16 bg-white text-black rounded-[1.5rem] flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-90 transition-all duration-300 relative z-20 group"
          >
            <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
          {/* Button Reflection */}
          <div className="absolute top-4 left-2 right-2 h-12 bg-white/20 blur-xl rounded-full -z-10 animate-pulse-slow"></div>
        </div>

        <NavItem view="reports" icon={PieIcon} />
        <NavItem view="settings" icon={Settings} />

      </nav>
    </div>
  );
};