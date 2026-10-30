import React from 'react';
import {
  LayoutGrid,
  ArrowLeftRight,
  Mic,
  PieChart,
  Bookmark,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { NavSection } from '../types/decision';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  savedCount: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  savedCount,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const mainNavItems: {
    id: NavSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'new-comparison', label: 'New Comparison', icon: ArrowLeftRight },
    { id: 'voice-assistant', label: 'AI Voice Assistant', icon: Mic },
    { id: 'results', label: 'Results', icon: PieChart },
    { id: 'saved', label: 'Saved Comparisons', icon: Bookmark, count: savedCount },
  ];

  const handleSelect = (section: NavSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  const renderBrandCube = () => (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      {/* Top Diamond - Cyan */}
      <path d="M16 3L28 9.9282L16 16.8564L4 9.9282L16 3Z" fill="#06B6D4" />
      {/* Left Face - Indigo */}
      <path d="M4 9.9282L16 16.8564V29L4 22.0718V9.9282Z" fill="#3B82F6" />
      {/* Right Face - Purple/Indigo */}
      <path d="M28 9.9282L16 16.8564V29L28 22.0718V9.9282Z" fill="#6366F1" />
    </svg>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between py-6 px-4 select-none">
      <div className="space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            {renderBrandCube()}
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
              Decision Arena
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-indigo-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-cyan-500 dark:text-cyan-400'
                        : 'text-slate-400 dark:text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {typeof item.count === 'number' && (
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isActive
                        ? 'text-cyan-600 dark:text-cyan-300 font-semibold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Settings Link */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => handleSelect('settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
            activeSection === 'settings'
              ? 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-indigo-500/5 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              activeSection === 'settings'
                ? 'text-cyan-500 dark:text-cyan-400'
                : 'text-slate-400'
            }`}
          />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B1120]/95 sticky top-0 z-30 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5"
        >
          {renderBrandCube()}
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Decision Arena
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 shrink-0 bg-slate-50 dark:bg-[#0B1120] border-r border-slate-200 dark:border-slate-800/80 transition-transform duration-200 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
