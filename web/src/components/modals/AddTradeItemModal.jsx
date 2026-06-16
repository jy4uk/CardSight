import { useState, useEffect, useRef } from 'react';
import { Loader2, X, ArrowLeftRight, CheckCircle, DollarSign, ChevronDown } from 'lucide-react';
import { searchTCGProducts } from '../../api';
import { CONDITIONS, GRADES, GAMES, CARD_TYPES } from '../../constants';
import { cleanCardName, cleanSetName, toTitleCase } from '../../utils';

const EMPTY_FORM = {
  card_name: '',
  card_number: '',
  set_name: '',
  game: 'pokemon',
  card_type: 'raw',
  condition: 'NM',
  grade: '',
  grade_qualifier: '',
  cert_number: '',
  barcode_id: '',
  image_url: '',
  tcg_product_id: null,
};

export default function AddTradeItemModal({ isOpen, trade, onClose, onAdd }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [marketPrice, setMarketPrice] = useState('');
  const [creditPrice, setCreditPrice] = useState('');
  const [pricePercentage, setPricePercentage] = useState(80);
  const [showGradedDetails, setShowGradedDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [selectedTcgProduct, setSelectedTcgProduct] = useState(null);
  const [showAllTcgResults, setShowAllTcgResults] = useState(false);
  const [preSelectionFormData, setPreSelectionFormData] = useState(null);
  const tcgDebounceRef = useRef(null);
  const cardNameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM);
      setMarketPrice('');
      setCreditPrice('');
      setPricePercentage(parseFloat(trade?.trade_percentage) || 80);
      setShowGradedDetails(false);
      setSelectedTcgProduct(null);
      setPreSelectionFormData(null);
      setTcgProducts([]);
      setTimeout(() => cardNameInputRef.current?.focus(), 100);
    }
  }, [isOpen, trade]);

  const cleanForCardLookup = (name) => {
    if (!name) return '';
    return name.replace(/[.\s']/g, '');
  };

  const handleTCGSearch = async (cardName, setName, cardNumber) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return;
    }

    setTcgLoading(true);
    try {
      let result = await searchTCGProducts(cardName, setName, cardNumber, 9);

      if ((!result.success || !result.products || result.products.length === 0) &&
          (cardName.includes('.') || cardName.includes(' '))) {
        const cleanedName = cleanForCardLookup(cardName);
        if (cleanedName !== cardName) {
          result = await searchTCGProducts(cleanedName, setName, cardNumber, 9);
        }
      }

      if ((!result.success || !result.products || result.products.length === 0) && setName) {
        result = await searchTCGProducts(cardName, '', cardNumber, 9);
      }

      if (result.success && result.products) {
        setTcgProducts(result.products);
        setShowAllTcgResults(false);
      } else {
        setTcgProducts([]);
        setShowAllTcgResults(false);
      }
    } catch (err) {
      console.error('TCG search error:', err);
      setTcgProducts([]);
    } finally {
      setTcgLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'card_name' || field === 'set_name' || field === 'card_number') {
      if (tcgDebounceRef.current) clearTimeout(tcgDebounceRef.current);

      const newCardName = field === 'card_name' ? value : formData.card_name;
      const newSetName = field === 'set_name' ? value : formData.set_name;
      const newCardNumber = field === 'card_number' ? value : formData.card_number;

      if (newCardName && newCardName.trim().length >= 2) {
        tcgDebounceRef.current = setTimeout(() => {
          handleTCGSearch(newCardName, newSetName, newCardNumber);
        }, 400);
      } else {
        setTcgProducts([]);
      }
    }
  };

  const detectGameFromProduct = (product) => {
    const categoryId = product.categoryId;
    switch (categoryId) {
      case 3: return 'pokemon';
      case 68: return 'onepiece';
      default: return 'pokemon';
    }
  };

  const handleSelectTcgProduct = (product) => {
    setPreSelectionFormData({ ...formData });
    setSelectedTcgProduct(product);

    const formattedCardName = toTitleCase(cleanCardName(product.cleanName || product.name || ''));
    const formattedSetName = toTitleCase(cleanSetName(product.setName || ''));
    const detectedGame = detectGameFromProduct(product);

    setFormData(prev => {
      const isGradedCard = prev.card_type !== 'raw';
      if (isGradedCard) {
        return { ...prev, image_url: product.imageUrl || prev.image_url, tcg_product_id: product.productId, game: detectedGame };
      }
      return {
        ...prev,
        image_url: product.imageUrl || prev.image_url,
        tcg_product_id: product.productId,
        card_name: formattedCardName,
        set_name: formattedSetName,
        card_number: product.cardNumber || prev.card_number,
        game: detectedGame,
        condition: prev.condition || 'NM',
      };
    });
    setTcgProducts([]);
  };

  const handleUndoSelection = () => {
    if (preSelectionFormData) {
      setFormData(preSelectionFormData);
      if (preSelectionFormData.card_name) handleTCGSearch(preSelectionFormData.card_name, preSelectionFormData.set_name, preSelectionFormData.card_number);
    } else {
      setFormData(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
      if (formData.card_name) handleTCGSearch(formData.card_name, formData.set_name, formData.card_number);
    }
    setSelectedTcgProduct(null);
    setPreSelectionFormData(null);
  };

  const recalcCredit = (mp, pct) => {
    const mpNum = parseFloat(mp);
    if (!isNaN(mpNum) && mpNum > 0) {
      const raw = mpNum * pct / 100;
      const dec = raw - Math.floor(raw);
      setCreditPrice(String(dec < 0.5 ? Math.floor(raw) : Math.ceil(raw)));
    }
  };

  const isGraded = formData.card_type !== 'raw';
  const pillSelected = 'px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-600 border-green-600 text-white';
  const pillUnselected = 'px-2.5 py-0.5 rounded-full text-xs font-medium border bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700';

  const handleSubmit = async () => {
    if (!formData.card_name?.trim()) return;
    setSubmitting(true);
    try {
      await onAdd?.(trade.id, {
        direction: 'in',
        card_name: formData.card_name.trim(),
        set_name: formData.set_name || null,
        card_number: formData.card_number || null,
        game: formData.game || 'pokemon',
        card_type: formData.card_type || 'raw',
        condition: formData.card_type === 'raw' ? (formData.condition || 'NM') : null,
        grade: formData.card_type !== 'raw' ? (formData.grade || null) : null,
        grade_qualifier: formData.card_type !== 'raw' ? (formData.grade_qualifier || null) : null,
        cert_number: formData.cert_number || null,
        barcode_id: formData.barcode_id || null,
        image_url: formData.image_url || null,
        tcg_product_id: formData.tcg_product_id || null,
        card_value: parseFloat(marketPrice) || 0,
        trade_value: parseFloat(creditPrice) || 0,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Add Trade-In Item</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded">
            <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Card Name + Number */}
          <div className="flex gap-2">
            <input
              ref={cardNameInputRef}
              type="text"
              value={formData.card_name}
              onChange={(e) => handleFieldChange('card_name', e.target.value)}
              placeholder="Card name *"
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <input
              type="text"
              value={formData.card_number}
              onChange={(e) => handleFieldChange('card_number', e.target.value)}
              placeholder="#"
              className="w-16 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Set Name */}
          <input
            type="text"
            value={formData.set_name}
            onChange={(e) => handleFieldChange('set_name', e.target.value)}
            placeholder="Set name"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
          />

          {/* Game pills */}
          <div className="flex flex-wrap gap-1">
            {GAMES.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, game: g.id }))}
                className={formData.game === g.id ? pillSelected : pillUnselected}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Card type pills */}
          <div className="flex flex-wrap gap-1">
            {CARD_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, card_type: t.id }))}
                className={formData.card_type === t.id ? pillSelected : pillUnselected}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isGraded ? (
            <button
              type="button"
              onClick={() => setShowGradedDetails(v => !v)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGradedDetails ? 'rotate-180' : ''}`} />
              {showGradedDetails ? 'Hide grading details' : 'Add grading details'}
            </button>
          ) : (
            <div className="flex flex-wrap gap-1">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, condition: c }))}
                  className={formData.condition === c ? pillSelected : pillUnselected}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {isGraded && showGradedDetails && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg"
                >
                  <option value="">Grade</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="text"
                  value={formData.grade_qualifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade_qualifier: e.target.value }))}
                  placeholder="Qualifier"
                  className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg"
                />
              </div>
              <input
                type="text"
                value={formData.cert_number}
                onChange={(e) => setFormData(prev => ({ ...prev, cert_number: e.target.value }))}
                placeholder="Cert / barcode number"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg"
              />
            </div>
          )}

          {/* Image lookup */}
          {tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 py-1">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              Looking up images…
            </div>
          )}

          {tcgProducts.length > 0 && !selectedTcgProduct && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600 dark:text-slate-400">
                  Match image {tcgLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                </label>
                {tcgProducts.length > 3 && (
                  <button type="button" onClick={() => setShowAllTcgResults(!showAllTcgResults)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {showAllTcgResults ? 'Show less' : `Show more (${tcgProducts.length})`}
                  </button>
                )}
              </div>
              <div className={showAllTcgResults ? 'overflow-x-auto pb-2 -mx-1' : 'flex gap-2'}>
                <div className={showAllTcgResults ? 'flex gap-2 px-1' : 'flex gap-2'} style={showAllTcgResults ? { width: 'max-content' } : undefined}>
                  {(showAllTcgResults ? tcgProducts : tcgProducts.slice(0, 3)).map((product) => (
                    <button key={product.productId} type="button" onClick={() => handleSelectTcgProduct(product)}
                      className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-slate-600 hover:border-green-400 transition-all text-left">
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                        : <div className="w-full aspect-[2.5/3.5] bg-gray-100 dark:bg-slate-700 flex items-center justify-center"><span className="text-gray-400 text-xs">No image</span></div>}
                      <div className="px-1.5 py-1 bg-gray-50 dark:bg-slate-800 text-[10px] leading-tight">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}</p>
                        <p className="text-gray-500 dark:text-slate-400 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {formData.card_name?.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
            <p className="text-xs text-gray-400">No matching card images found.</p>
          )}

          {selectedTcgProduct && tcgProducts.length === 0 && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              {selectedTcgProduct.imageUrl && (
                <img src={selectedTcgProduct.imageUrl} alt={selectedTcgProduct.name} className="w-10 h-auto rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-slate-100 truncate">{selectedTcgProduct.cleanName || selectedTcgProduct.name}</p>
                {selectedTcgProduct.setName && <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{selectedTcgProduct.setName}</p>}
              </div>
              <button type="button" onClick={handleUndoSelection} className="p-1 hover:bg-green-100 dark:hover:bg-green-800/40 rounded flex-shrink-0">
                <X className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
          )}

          {/* Price section */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                inputMode="decimal"
                value={marketPrice}
                onChange={(e) => {
                  const mp = e.target.value;
                  setMarketPrice(mp);
                  recalcCredit(mp, pricePercentage);
                }}
                placeholder="Market price"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>% of market</span>
                <span className="font-medium text-gray-700 dark:text-slate-300">{pricePercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={pricePercentage}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  setPricePercentage(pct);
                  recalcCredit(marketPrice, pct);
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-green-600 bg-gray-200 dark:bg-slate-700"
              />
            </div>

            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                inputMode="decimal"
                value={creditPrice}
                onChange={(e) => {
                  const cp = e.target.value;
                  setCreditPrice(cp);
                  const mpNum = parseFloat(marketPrice);
                  const cpNum = parseFloat(cp);
                  if (!isNaN(mpNum) && mpNum > 0 && !isNaN(cpNum)) {
                    setPricePercentage(Math.min(100, Math.max(0, Math.round(cpNum / mpNum * 100))));
                  }
                }}
                placeholder="Credit price"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!formData.card_name?.trim() || submitting}
            className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Add Item
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
