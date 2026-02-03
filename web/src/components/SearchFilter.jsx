import { Search, SlidersHorizontal, X } from 'lucide-react';
import { GAMES, CARD_TYPES, CONDITIONS } from '../constants';

export default function SearchFilter({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFilterChange,
  showFilters,
  onToggleFilters 
}) {

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl 
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base text-slate-900 dark:text-slate-100
                       placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[48px]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </button>
          )}
        </div>
        <button
          onClick={onToggleFilters}
          className={`p-3 rounded-xl border transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center
            ${showFilters 
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-4">
          {/* Game Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Game
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange({ ...filters, game: null })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                  ${!filters.game
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                All
              </button>
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onFilterChange({ ...filters, game: g.id })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                    ${filters.game === g.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Card Type
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange({ ...filters, cardType: null })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                  ${!filters.cardType
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                All
              </button>
              {CARD_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onFilterChange({ ...filters, cardType: t.id })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                    ${filters.cardType === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Condition
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onFilterChange({ ...filters, condition: null })}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                  ${!filters.condition
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
              >
                All
              </button>
              {CONDITIONS.map((cond) => (
                <button
                  key={cond}
                  onClick={() => onFilterChange({ ...filters, condition: cond })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]
                    ${filters.condition === cond
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">$</span>
                <input
                  inputMode="decimal"
                  value={filters.minPrice || ''}
                  onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 text-sm">$</span>
                <input
                  inputMode="decimal"
                  value={filters.maxPrice || ''}
                  onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
                  placeholder="999"
                  min="0"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onFilterChange({ condition: null, minPrice: '', maxPrice: '', game: null, cardType: null })}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
