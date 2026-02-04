import { Package, ArrowLeftRight, BarChart3, FileText } from 'lucide-react';

export default function MobileBottomNav({ 
  currentView, 
  onViewChange, 
  hasInsightsFeature = false,
  hasBarcodeFeature = false
}) {
  const navItems = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'intake', label: 'Intake', icon: ArrowLeftRight, requiresFeature: 'insights' },
    { id: 'insights', label: 'Insights', icon: BarChart3, requiresFeature: 'insights' },
    // Barcodes hidden on mobile - only accessible from desktop
  ].filter(item => {
    if (!item.requiresFeature) return true;
    if (item.requiresFeature === 'insights') return hasInsightsFeature;
    if (item.requiresFeature === 'barcodes') return hasBarcodeFeature;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden pb-[env(safe-area-inset-bottom)]">
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-white/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/60" />
      
      {/* Navigation items - evenly distributed */}
      <div className="relative flex items-center justify-around px-4 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[56px] py-2 px-3 rounded-2xl transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 dark:text-slate-400 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800'
                }`}
            >
              <Icon className={`w-6 h-6 mb-0.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[11px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
