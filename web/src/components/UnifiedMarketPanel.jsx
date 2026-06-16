import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, AlertCircle, ExternalLink, TrendingUp, TrendingDown, Minus, ShoppingCart, Gavel } from 'lucide-react';

// ─── Shared helpers ──────────────────────────────────────────────────────────

function formatGrade(raw) {
  if (!raw) return null;
  const match = raw.match(/^g(\d+(?:\.\d+)?)$/i);
  return match ? `PSA ${match[1]}` : raw.toUpperCase();
}

function avgPrice(sales) {
  const prices = (sales || []).filter(s => s.price != null).map(s => s.price);
  if (!prices.length) return null;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

// Sales are sorted date desc (index 0 = most recent).
// Compare avg of newer half vs older half; 5% threshold to call it trending.
function calcTrend(sales) {
  const prices = (sales || []).filter(s => s.price != null).map(s => s.price);
  if (prices.length < 4) return null;
  const mid = Math.floor(prices.length / 2);
  const recentAvg = prices.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const olderAvg = prices.slice(mid).reduce((a, b) => a + b, 0) / (prices.length - mid);
  if (olderAvg === 0) return null;
  const delta = (recentAvg - olderAvg) / olderAvg;
  if (delta > 0.05) return 'up';
  if (delta < -0.05) return 'down';
  return 'stable';
}

// ─── CardLadder sales list ────────────────────────────────────────────────────

function SaleRow({ sale, index }) {
  const grade = formatGrade(sale.grade);
  return (
    <div className={`flex items-center justify-between px-3 py-2 text-xs ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-400 w-4 text-right flex-shrink-0 tabular-nums">{index + 1}</span>
        <span className="text-gray-500 flex-shrink-0 w-16 tabular-nums">{sale.date || '—'}</span>
        {grade && (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded flex-shrink-0">
            {grade}
          </span>
        )}
        {sale.title && (
          <span className="text-gray-400 truncate hidden sm:block text-[10px]">{sale.title}</span>
        )}
      </div>
      <div className="flex-shrink-0">
        {sale.cardLadderUrl ? (
          <a href={sale.cardLadderUrl} target="_blank" rel="noopener noreferrer"
            className="font-semibold text-green-700 hover:text-green-800 flex items-center gap-1">
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

// ─── eBay listing card ────────────────────────────────────────────────────────

function ConfidenceDot({ category }) {
  const colors = { high: 'bg-green-500', medium: 'bg-yellow-500', low: 'bg-red-500' };
  return <span className={`w-1.5 h-1.5 rounded-full inline-block ${colors[category] || colors.low}`} />;
}

function EbayRow({ listing, type }) {
  const price = type === 'auction' ? listing.currentBid : listing.price;
  return (
    <a href={listing.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-2 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
      {listing.thumbnail && (
        <img src={listing.thumbnail} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-700 line-clamp-2 leading-tight">{listing.title}</p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-sm font-semibold text-gray-900">${price?.toFixed(2)}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {type === 'sold' && listing.date && (
              <span className="text-[9px] text-gray-500 hidden sm:inline">{listing.date}</span>
            )}
            {type === 'auction' && listing.endsIn && (
              <span className="text-[9px] text-orange-600 font-medium">{listing.endsIn}</span>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border border-gray-200 text-gray-600">
              <ConfidenceDot category={listing.confidenceCategory} />
              {listing.confidence?.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
      <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 mt-1 hidden sm:block" />
    </a>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5
        ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      <Icon className="w-3 h-3" />
      {label}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-blue-500' : 'bg-gray-200'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Population report ────────────────────────────────────────────────────────

function PopReport({ psa }) {
  const [open, setOpen] = useState(false);

  const psaGradeKey = (() => {
    const g = psa?.grade?.toString();
    if (!g) return null;
    const match = g.match(/(\d+(?:\.\d+)?)/);
    return match?.[1] || g;
  })();

  const gradeRows = (() => {
    const breakdown = psa?.population?.gradeBreakdown;
    if (!breakdown) return [];
    const keyToLabel = (key) => key === 'auth' ? 'Auth' : key.replace(/^g/, '').replace('_', '.');
    const rows = Object.entries(breakdown)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([key, count]) => ({ label: keyToLabel(key), count }));
    const qualBreakdown = psa?.population?.qualifierGrades;
    if (qualBreakdown) {
      Object.entries(qualBreakdown)
        .filter(([, v]) => typeof v === 'number' && v > 0)
        .forEach(([key, count]) => rows.push({ label: keyToLabel(key) + 'Q', count }));
    }
    return rows.sort((a, b) => {
      const key = l => l === 'Auth' ? -1 : parseFloat(l.replace('Q', '')) + (l.endsWith('Q') ? 0.1 : 0);
      return key(b.label) - key(a.label);
    });
  })();

  const popSummary = psa?.population;
  const gradePopLine = (() => {
    if (!psa?.grade || !popSummary) return null;
    const parts = [];
    if (typeof popSummary.total === 'number') parts.push(`Pop ${psa.grade}: ${popSummary.total.toLocaleString()}`);
    if (typeof popSummary.higher === 'number') parts.push(`Higher: ${popSummary.higher.toLocaleString()}`);
    return parts.join(' • ') || null;
  })();

  const hasPopData = !!psa?.population?.gradeBreakdown;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-600">
          {gradePopLine || <span className="text-gray-400">Population unavailable</span>}
        </span>
        {hasPopData && (
          <button type="button" onClick={() => setOpen(v => !v)}
            className="text-[10px] font-medium text-blue-600 hover:text-blue-700">
            {open ? 'Hide pop' : 'Pop report'}
          </button>
        )}
      </div>

      {open && hasPopData && (
        <div className="mt-2 border border-gray-200 rounded-lg bg-white">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-900">Population Report</p>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {gradeRows.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {gradeRows.map(r => (
                  <div key={r.label}
                    className={`flex items-center justify-between px-3 py-1.5 text-xs ${psaGradeKey === r.label ? 'bg-blue-50' : ''}`}>
                    <span className="text-gray-700">{r.label}</span>
                    <span className="font-semibold text-gray-900">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-xs text-gray-500">No population data available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main unified component ───────────────────────────────────────────────────

export default function UnifiedMarketPanel({
  psaData, psaLoading, psaError, onRetryPSA,
  clData, clLoading, clError, onRetryCL,
  certNumber,
}) {
  const [expanded, setExpanded] = useState(true);
  const [ebayTab, setEbayTab] = useState('sold');

  const psa = psaData?.psa;
  const sold = psaData?.sold || [];
  const active = psaData?.active || [];
  const auctions = psaData?.auctions || [];
  const ebayMeta = psaData?.meta || {};

  const clSales = clData?.sales || [];
  const clTotal = clData?.totalSales ?? 0;
  const clAvg = avgPrice(clSales);
  const clTrend = calcTrend(clSales);
  const clNotConfigured = clData?.notConfigured;

  // Overall loading: PSA still fetching (CL depends on it)
  const anyLoading = psaLoading;

  if (anyLoading) {
    return (
      <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-900">Fetching market data…</p>
            <p className="text-xs text-blue-700">Looking up PSA cert &amp; recent sales</p>
          </div>
        </div>
      </div>
    );
  }

  if (psaError && !psaData) {
    return (
      <div className="border border-red-200 rounded-xl bg-red-50/50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Failed to load market data</p>
            <p className="text-xs text-red-700">{psaError}</p>
          </div>
          {onRetryPSA && (
            <button type="button" onClick={onRetryPSA}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!psaData) return null;

  const ebayListings = { sold, active, auctions };
  const ebayTabItems = ebayListings[ebayTab] || [];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">PSA</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {psa?.name || 'Market Data'}
              {psa?.grade && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">
                  {psa.grade}
                </span>
              )}
            </p>
            <p className="text-[10px] text-gray-500">
              {psa?.set || ''}
              {psa?.cert && <span className="ml-1 text-gray-400">#{psa.cert}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Trend indicator */}
          {clTrend === 'up' && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-medium hidden sm:inline">Growing</span>
            </div>
          )}
          {clTrend === 'down' && (
            <div className="flex items-center gap-1 text-red-500">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-medium hidden sm:inline">Declining</span>
            </div>
          )}
          {clTrend === 'stable' && (
            <div className="flex items-center gap-1 text-gray-400">
              <Minus className="w-4 h-4" />
              <span className="text-[10px] font-medium hidden sm:inline">Stable</span>
            </div>
          )}
          {/* Headline price — CL avg if available, else placeholder */}
          <div className="text-right">
            {clLoading ? (
              <div className="flex items-center gap-1 justify-end">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Loading sales…</span>
              </div>
            ) : clAvg != null ? (
              <>
                <p className="text-[10px] text-gray-500">Avg ({clSales.length} sales)</p>
                <p className="text-sm font-bold text-green-700">${clAvg.toFixed(2)}</p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-400">—</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-100">

          {/* ── PSA card identity ── */}
          {psa && (
            <div className="p-3">
              <div className="flex gap-3">
                {psa.imageUrl && (
                  <div className="flex-shrink-0">
                    <img src={psa.imageUrl} alt={psa.name}
                      className="w-16 h-auto rounded-lg border border-gray-200 shadow-sm"
                      onError={e => { e.target.style.display = 'none'; }} />
                    <p className="text-[8px] text-gray-400 text-center mt-1">{psa.imageSource || 'psa'}</p>
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    {psa.number && (
                      <div><span className="text-gray-500">#:</span> <span className="text-gray-900">{psa.number}</span></div>
                    )}
                    {psa.year && (
                      <div><span className="text-gray-500">Year:</span> <span className="text-gray-900">{psa.year}</span></div>
                    )}
                    {psa.cert && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Cert:</span>{' '}
                        <span className="text-gray-900 font-mono text-[10px]">{psa.cert}</span>
                      </div>
                    )}
                  </div>
                  <PopReport psa={psa} />
                </div>
              </div>
            </div>
          )}

          {/* ── CardLadder recent sales ── */}
          {!clNotConfigured && (clData || clLoading || clError) && (
            <div>
              <div className="px-3 py-2 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-700">Recent Sales</span>
                  {clTotal > 0 && (
                    <span className="text-[10px] text-gray-400">{clSales.length} of {clTotal} total</span>
                  )}
                </div>
                {clError && onRetryCL && (
                  <button type="button" onClick={onRetryCL}
                    className="text-[10px] text-red-600 hover:underline">Retry</button>
                )}
                {!clLoading && !clError && certNumber && (
                  <a href="https://app.cardladder.com/sales-history" target="_blank" rel="noopener noreferrer"
                    onClick={() => navigator.clipboard.writeText(certNumber)}
                    className="text-[10px] text-orange-600 hover:underline flex items-center gap-0.5">
                    All on CardLadder <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {clLoading ? (
                <div className="px-3 py-4 flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  Fetching CardLadder sales…
                </div>
              ) : clError ? (
                <div className="px-3 py-3 text-xs text-red-700">{clError}</div>
              ) : clSales.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-500">No recent sales found on CardLadder.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {clSales.map((sale, i) => <SaleRow key={i} sale={sale} index={i} />)}
                </div>
              )}
            </div>
          )}

          {/* ── eBay comps ── */}
          {(sold.length > 0 || active.length > 0 || auctions.length > 0) && (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <TabBtn active={ebayTab === 'sold'} onClick={() => setEbayTab('sold')}
                  icon={TrendingUp} label="Sold" count={sold.length} />
                <TabBtn active={ebayTab === 'active'} onClick={() => setEbayTab('active')}
                  icon={ShoppingCart} label="Active" count={active.length} />
                <TabBtn active={ebayTab === 'auctions'} onClick={() => setEbayTab('auctions')}
                  icon={Gavel} label="Auctions" count={auctions.length} />
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {ebayTabItems.length > 0 ? (
                  ebayTabItems.map((item, i) => (
                    <EbayRow key={item.itemId || i} listing={item}
                      type={ebayTab === 'auctions' ? 'auction' : ebayTab} />
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-3">No {ebayTab} listings found</p>
                )}
              </div>
              {ebayMeta.fetchedAt && (
                <p className="text-[10px] text-gray-400 text-right">
                  eBay data: {new Date(ebayMeta.fetchedAt).toLocaleString()}
                  {ebayMeta.cached && ' (cached)'}
                </p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
