import { Package, ArrowLeftRight, BarChart3, ShoppingCart, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

export default function MobileBottomNav({ 
  currentView, 
  onViewChange, 
  hasInsightsFeature = false 
}) {
  const { theme, toggleTheme } = useTheme();
  const { cartCount, setIsCartOpen } = useCart();

  const navItems = [
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'intake', label: 'Intake', icon: ArrowLeftRight, requiresFeature: true },
    { id: 'insights', label: 'Insights', icon: BarChart3, requiresFeature: true },
  ].filter(item => !item.requiresFeature || hasInsightsFeature);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden pb-[env(safe-area-inset-bottom)]">
      {/* Gradient blur background */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white to-white/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/80 backdrop-blur-xl border-t border-slate-200/60 dark:border-slate-700/60" />
      
      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[4rem] py-2 px-3 rounded-2xl transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 scale-105' 
                  : 'text-slate-500 dark:text-slate-400 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800'
                }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center justify-center min-w-[4rem] py-2 px-3 rounded-2xl transition-all duration-200
                     text-slate-500 dark:text-slate-400 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 px-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center min-w-[4rem] py-2 px-3 rounded-2xl transition-all duration-200
                     text-slate-500 dark:text-slate-400 active:scale-95 active:bg-slate-100 dark:active:bg-slate-800"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 mb-0.5" />
          ) : (
            <Moon className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px] font-medium">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </span>
        </button>
      </div>
    </nav>
  );
}
