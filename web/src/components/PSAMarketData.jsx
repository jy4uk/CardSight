import { useState } from 'react';
import { ExternalLink, TrendingUp, ShoppingCart, Gavel, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { fetchPSAPopulationReport } from '../api';

const CONFIDENCE_COLORS = {
  high: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-red-100 text-red-700 border-red-200',
};

const CONFIDENCE_DOT_COLORS = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-500',
};

function ConfidenceBadge({ score, category }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded border ${CONFIDENCE_COLORS[category] || CONFIDENCE_COLORS.low}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${CONFIDENCE_DOT_COLORS[category] || CONFIDENCE_DOT_COLORS.low}`} />
      {score?.toFixed(1)}
    </span>
  );
}

function ListingCard({ listing, type }) {
  const price = type === 'auction' ? listing.currentBid : listing.price;
  
  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-2 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors active:bg-blue-100 touch-manipulation"
    >
      {listing.thumbnail && (
        <img
          src={listing.thumbnail}
          alt=""
          className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs text-gray-700 line-clamp-2 leading-tight">{listing.title}</p>
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-sm font-semibold text-gray-900">
            ${price?.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {type === 'sold' && listing.date && (
              <span className="text-[9px] sm:text-[10px] text-gray-500 hidden sm:inline">{listing.date}</span>
            )}
            {type === 'auction' && listing.endsIn && (
              <span className="text-[9px] sm:text-[10px] text-orange-600 font-medium">{listing.endsIn}</span>
            )}
            <ConfidenceBadge score={listing.confidence} category={listing.confidenceCategory} />
          </div>
        </div>
      </div>
      <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 mt-1 hidden sm:block" />
    </a>
  );
}

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5
        ${active 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
    >
      {children}
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-blue-500' : 'bg-gray-200'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function PSAMarketData({ data, loading, error, onRetry }) {
  const [activeTab, setActiveTab] = useState('sold');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopulation, setShowPopulation] = useState(false);
  const [popLoading, setPopLoading] = useState(false);
  const [popError, setPopError] = useState(null);
  const [popReport, setPopReport] = useState(null);

  const { psa, sold = [], active = [], auctions = [], meta = {} } = data || {};

  const popSummary = psa?.population || null;
  const hasSpecId = !!psa?.specId;

  const psaGradeKey = (() => {
    const g = psa?.grade?.toString();
    if (!g) return null;
    const match = g.match(/(\d+(?:\.\d+)?)/);
    return match?.[1] || g;
  })();

  const gradePopulationLine = (() => {
    if (!psa?.grade || !popSummary) return null;
    const parts = [];
    if (typeof popSummary.total === 'number') parts.push(`Pop ${psa.grade}: ${popSummary.total.toLocaleString()}`);
    if (typeof popSummary.higher === 'number') parts.push(`Higher: ${popSummary.higher.toLocaleString()}`);
    return parts.join(' • ') || null;
  })();

  const gradeRows = (() => {
    const summary = popReport?.psaPop;
    if (!summary) return [];

    const rows = [];
    const direct = {
      '1': summary.Grade1,
      '1Q': summary.Grade1Q,
      '1.5': summary.Grade1_5,
      '1.5Q': summary.Grade1_5Q,
      '2': summary.Grade2,
      '2Q': summary.Grade2Q,
      '2.5': summary.Grade2_5,
      '2.5Q': summary.Grade2_5Q,
      '3': summary.Grade3,
      '3Q': summary.Grade3Q,
      '3.5': summary.Grade3_5,
      '3.5Q': summary.Grade3_5Q,
      '4': summary.Grade4,
      '4Q': summary.Grade4Q,
      '4.5': summary.Grade4_5,
      '4.5Q': summary.Grade4_5Q,
      '5': summary.Grade5,
      '5Q': summary.Grade5Q,
      '5.5': summary.Grade5_5,
      '5.5Q': summary.Grade5_5Q,
      '6': summary.Grade6,
      '6Q': summary.Grade6Q,
      '6.5': summary.Grade6_5,
      '6.5Q': summary.Grade6_5Q,
      '7': summary.Grade7,
      '7Q': summary.Grade7Q,
      '7.5': summary.Grade7_5,
      '7.5Q': summary.Grade7_5Q,
      '8': summary.Grade8,
      '8Q': summary.Grade8Q,
      '8.5': summary.Grade8_5,
      '8.5Q': summary.Grade8_5Q,
      '9': summary.Grade9,
      '9Q': summary.Grade9Q,
      '9.5': summary.Grade9_5,
      '9.5Q': summary.Grade9_5Q,
      '10': summary.Grade10,
      '10Q': summary.Grade10Q,
      'Auth': summary.Auth,
    };

    for (const [label, count] of Object.entries(direct)) {
      if (typeof count === 'number' && count > 0) {
        rows.push({ label, count });
      }
    }

    rows.sort((a, b) => {
      const toKey = (l) => {
        if (l === 'Auth') return -1; // Auth goes first
        const q = l.endsWith('Q') ? 0.1 : 0;
        const base = parseFloat(l.replace('Q', ''));
        return (Number.isFinite(base) ? base : 0) + q;
      };
      return toKey(b.label) - toKey(a.label); // Sort highest to lowest
    });

    return rows;
  })();

  const handleTogglePopulation = async () => {
    if (showPopulation) {
      setShowPopulation(false);
      return;
    }

    setShowPopulation(true);

    if (!hasSpecId) return;
    if (popLoading) return;
    if (popReport?.specId === psa?.specId) return;

    try {
      setPopLoading(true);
      setPopError(null);
      const resp = await fetchPSAPopulationReport(psa.specId);
      setPopReport(resp);
    } catch (e) {
      setPopError(e?.message || 'Failed to fetch population report');
    } finally {
      setPopLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-900">Fetching PSA & Market Data...</p>
            <p className="text-xs text-blue-700">Querying PSA database and eBay listings</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-xl bg-red-50/50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Failed to load market data</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const listings = {
    sold,
    active,
    auctions,
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">PSA</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Market Data</p>
            <p className="text-[10px] text-gray-500">
              {meta.soldCount || 0} sold • {meta.activeCount || 0} active • {meta.auctionsCount || 0} auctions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-green-600">Est. Value: --</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* PSA Card Info + Image */}
          {psa && (
            <div className="flex gap-2 sm:gap-3">
              {psa.imageUrl && (
                <div className="flex-shrink-0">
                  <img
                    src={psa.imageUrl}
                    alt={psa.name}
                    className="w-16 sm:w-20 h-auto rounded-lg border border-gray-200 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <p className="text-[8px] sm:text-[9px] text-gray-400 text-center mt-1">
                    {psa.imageSource || 'psa'}
                  </p>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 sm:line-clamp-1">{psa.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-600 truncate">{psa.set}</p>
                  </div>
                  {psa.grade && (
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded flex-shrink-0">
                      {psa.grade}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 sm:mt-2 grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-0.5 sm:gap-y-1 text-[10px] sm:text-xs">
                  {psa.number && (
                    <div>
                      <span className="text-gray-500">#:</span>{' '}
                      <span className="text-gray-900">{psa.number}</span>
                    </div>
                  )}
                  {psa.year && (
                    <div>
                      <span className="text-gray-500">Year:</span>{' '}
                      <span className="text-gray-900">{psa.year}</span>
                    </div>
                  )}
                  {psa.cert && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Cert:</span>{' '}
                      <span className="text-gray-900 font-mono text-[9px] sm:text-xs">{psa.cert}</span>
                    </div>
                  )}
                </div>

                {/* Population summary + expandable report */}
                <div className="mt-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] sm:text-xs text-gray-700">
                      {gradePopulationLine ? (
                        <span>{gradePopulationLine}</span>
                      ) : (
                        <span className="text-gray-500">Population: unavailable</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePopulation}
                      disabled={!hasSpecId}
                      className="text-[10px] sm:text-xs font-medium text-blue-700 hover:text-blue-800 disabled:text-gray-400"
                      title={!hasSpecId ? 'Population report requires SpecID' : 'Toggle population report'}
                    >
                      {showPopulation ? 'Hide pop report' : 'Pop report'}
                    </button>
                  </div>

                  {showPopulation && (
                    <div className="mt-2 border border-gray-200 rounded-lg bg-white">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-900">Population Report</p>
                        {popReport?.description && (
                          <p className="text-[10px] text-gray-500 truncate">{popReport.description}</p>
                        )}
                      </div>

                      <div className="max-h-40 overflow-y-auto">
                        {popLoading ? (
                          <div className="p-3 flex items-center gap-2 text-xs text-gray-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading population report...
                          </div>
                        ) : popError ? (
                          <div className="p-3 text-xs text-red-700">{popError}</div>
                        ) : gradeRows.length > 0 ? (
                          <div className="divide-y divide-gray-100">
                            {gradeRows.map((r) => (
                              <div
                                key={r.label}
                                className={`flex items-center justify-between px-3 py-1.5 text-xs ${psaGradeKey === r.label ? 'bg-blue-50' : ''}`}
                              >
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
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            <TabButton 
              active={activeTab === 'sold'} 
              onClick={() => setActiveTab('sold')}
              count={sold.length}
            >
              <TrendingUp className="w-3 h-3" />
              Sold
            </TabButton>
            <TabButton 
              active={activeTab === 'active'} 
              onClick={() => setActiveTab('active')}
              count={active.length}
            >
              <ShoppingCart className="w-3 h-3" />
              Active
            </TabButton>
            <TabButton 
              active={activeTab === 'auctions'} 
              onClick={() => setActiveTab('auctions')}
              count={auctions.length}
            >
              <Gavel className="w-3 h-3" />
              Auctions
            </TabButton>
          </div>

          {/* Listings */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {listings[activeTab]?.length > 0 ? (
              listings[activeTab].map((listing, idx) => (
                <ListingCard 
                  key={listing.itemId || idx} 
                  listing={listing} 
                  type={activeTab === 'auctions' ? 'auction' : activeTab}
                />
              ))
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">
                No {activeTab} listings found
              </p>
            )}
          </div>

          {/* Footer */}
          {meta.fetchedAt && (
            <p className="text-[10px] text-gray-400 text-right">
              Data fetched: {new Date(meta.fetchedAt).toLocaleString()}
              {meta.cached && ' (cached)'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
