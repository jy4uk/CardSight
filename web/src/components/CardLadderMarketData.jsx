import { ChevronDown, ChevronUp, Loader2, AlertCircle, ExternalLink, TrendingUp } from 'lucide-react';
import { useState } from 'react';

function formatGrade(raw) {
  if (!raw) return null;
  // "g10" → "PSA 10", "g9" → "PSA 9", etc.
  const match = raw.match(/^g(\d+(?:\.\d+)?)$/i);
  return match ? `PSA ${match[1]}` : raw.toUpperCase();
}

function SaleRow({ sale, index }) {
  const grade = formatGrade(sale.grade);
  return (
    <div className={`flex items-center justify-between px-3 py-2 text-xs ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400 w-4 text-right flex-shrink-0">{index + 1}</span>
        <span className="text-gray-500 flex-shrink-0 w-16">{sale.date || '—'}</span>
        {grade && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded flex-shrink-0">
            {grade}
          </span>
        )}
        {sale.title && (
          <span className="text-gray-500 truncate hidden sm:block">{sale.title}</span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {sale.cardLadderUrl ? (
          <a
            href={sale.cardLadderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            ${sale.price != null ? sale.price.toFixed(2) : '—'}
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>
        ) : (
          <span className="font-semibold text-green-700">
            ${sale.price != null ? sale.price.toFixed(2) : '—'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CardLadderMarketData({ certNumber, data, loading, error, onRetry }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const sales = data?.sales ?? [];
  const notConfigured = data?.notConfigured ?? false;

  const avgPrice = (() => {
    const prices = sales.filter(s => s.price != null).map(s => s.price);
    if (prices.length === 0) return null;
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  })();

  if (loading) {
    return (
      <div className="border border-orange-200 rounded-xl bg-orange-50/50 p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />
          <p className="text-xs font-medium text-orange-900">Fetching CardLadder sales...</p>
        </div>
      </div>
    );
  }

  if (notConfigured) return null;

  if (error) {
    return (
      <div className="border border-red-200 rounded-xl bg-red-50/50 p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-medium text-red-900">CardLadder data unavailable</p>
            <p className="text-[10px] text-red-700">{error}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data || sales.length === 0) {
    return (
      <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700">CardLadder</p>
            <p className="text-[10px] text-gray-500">No recent sales found for this cert</p>
          </div>
          <a
            href="https://app.cardladder.com/sales-history"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => navigator.clipboard.writeText(certNumber)}
            className="ml-auto text-[10px] text-orange-600 hover:underline flex items-center gap-1"
          >
            View on CardLadder
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-gray-900">CardLadder Sales</p>
            <p className="text-[10px] text-gray-500">
              Last {sales.length} sale{sales.length !== 1 ? 's' : ''} • {data.totalSales ?? 0} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {avgPrice != null && (
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Avg</p>
              <p className="text-sm font-bold text-green-700">${avgPrice.toFixed(2)}</p>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Sales list */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {sales.map((sale, i) => (
            <SaleRow key={i} sale={sale} index={i} />
          ))}
          <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {data.meta?.fetchedAt
                ? `Fetched ${new Date(data.meta.fetchedAt).toLocaleTimeString()}`
                : ''}
              {data.meta?.cached ? ' (cached)' : ''}
            </span>
            <a
              href="https://app.cardladder.com/sales-history"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => navigator.clipboard.writeText(certNumber)}
              className="text-[10px] text-orange-600 hover:underline flex items-center gap-1"
            >
              All sales on CardLadder
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
