import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, DollarSign, Search, Loader2, Scan, X, ShoppingBag, CheckCircle, Check, Pencil } from 'lucide-react';
import { fetchPSAData, isPSACertNumber, searchTCGProducts, addInventoryItem } from '../api';
import { usePendingPurchase } from '../context/PendingPurchaseContext.jsx';
import PSAMarketData from './PSAMarketData';
import { CONDITIONS, GRADES, GAMES, CARD_TYPES } from '../constants';
import { getInitialFormData } from '../utils';

export default function PurchasePanel({ inventoryItems = [], onPurchaseComplete }) {
  const { pendingItems, addPendingItem, updatePendingItem, removePendingItem, clearPending, totalQuantity, totalCost } = usePendingPurchase();
  
  const [formData, setFormData] = useState(getInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Editing staged items state
  const [editingLineId, setEditingLineId] = useState(null);
  const [editingData, setEditingData] = useState({});
  
  // TCG product matching state
  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [selectedTcgProduct, setSelectedTcgProduct] = useState(null);
  const [showAllTcgResults, setShowAllTcgResults] = useState(false);
  const [preSelectionFormData, setPreSelectionFormData] = useState(null); // Store form state before TCG selection
  const tcgDebounceRef = useRef(null);
  
  // PSA lookup state
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const psaDebounceRef = useRef(null);
  const psaFetchedRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // Check for duplicate barcode
  const isDuplicateBarcode = useMemo(() => {
    if (!formData.barcode_id?.trim()) return false;
    const barcode = formData.barcode_id.trim().toLowerCase();
    // Check existing inventory
    const inInventory = inventoryItems.some(item => 
      item.barcode_id?.toLowerCase() === barcode
    );
    // Check pending items
    const inPending = pendingItems.some(item => 
      item.barcode_id?.toLowerCase() === barcode
    );
    return inInventory || inPending;
  }, [formData.barcode_id, inventoryItems, pendingItems]);

  // PSA lookup handler with full parsing (matching AddItemModal)
  const handlePSALookup = async (certNumber) => {
    if (psaFetchedRef.current === certNumber) return;
    
    setPsaLoading(true);
    setPsaError(null);
    psaFetchedRef.current = certNumber;

    try {
      const result = await fetchPSAData(certNumber);
      
      if (result.success && result.psa) {
        setPsaData(result);
        
        // Extract numeric grade from PSA grade (e.g., "GEM MT 10" -> "10")
        const extractNumericGrade = (psaGrade) => {
          if (!psaGrade) return '';
          const match = psaGrade.match(/(\d+(?:\.\d+)?)/);
          return match ? match[1] : '';
        };

        // Strip PSA variant prefixes from card name (e.g., "Fa/Lugia V" -> "Lugia V")
        const cleanPSACardName = (name) => {
          if (!name) return '';
          const prefixPattern = /^(Fa|Sr|Ar|Sar|Ir|Sir|Ur|Chr|Csr|Tg|Gg|Rr|Pr|Hr)\//i;
          return name.replace(prefixPattern, '').trim();
        };

        // Game prefixes to detect and strip from set name
        const GAME_PREFIXES = [
          { pattern: /^POKEMON\s+/i, game: 'pokemon' },
          { pattern: /^ONE PIECE\s+/i, game: 'onepiece' },
          { pattern: /^ONEPIECE\s+/i, game: 'onepiece' },
          { pattern: /^MTG\s+/i, game: 'mtg' },
          { pattern: /^MAGIC\s+/i, game: 'mtg' },
          { pattern: /^MAGIC:?\s*THE GATHERING\s+/i, game: 'mtg' },
          { pattern: /^YU-?GI-?OH!?\s+/i, game: 'yugioh' },
          { pattern: /^YUGIOH!?\s+/i, game: 'yugioh' },
        ];

        // Parse set name: extract game prefix, series, set code, and true set name
        const parseSetName = (rawSet) => {
          if (!rawSet) return { game: null, series: '', setName: '', setCode: '', tcgSetName: '' };
          
          let setName = rawSet;
          let detectedGame = null;
          let detectedSeries = '';
          let setCode = '';

          for (const { pattern, game } of GAME_PREFIXES) {
            if (pattern.test(setName)) {
              detectedGame = game;
              setName = setName.replace(pattern, '');
              break;
            }
          }

          // Handle One Piece set format: "Op11-A Fist Of Divine Speed" or "OP11-A Fist Of Divine Speed"
          // Format: [SetCode]-[LexicalName] -> display as "[LexicalName] - [SetCode]"
          const onePieceMatch = setName.match(/^(OP\d+[A-Z]?)-(.+)$/i);
          if (onePieceMatch || detectedGame === 'onepiece') {
            if (onePieceMatch) {
              setCode = onePieceMatch[1].toUpperCase(); // e.g., "OP11"
              const lexicalName = toTitleCase(onePieceMatch[2].trim()); // e.g., "A Fist Of Divine Speed"
              return { 
                game: 'onepiece', 
                series: '', 
                setName: `${lexicalName} - ${setCode}`, // Display format
                setCode,
                tcgSetName: lexicalName // For TCG lookup
              };
            }
          }

          // Extract Pokemon series prefixes
          const POKEMON_SERIES_PREFIXES = [
            { pattern: /^(SWORD\s*&?\s*SHIELD)\s+/i, series: 'Sword & Shield' },
            { pattern: /^(SUN\s*&?\s*MOON)\s+/i, series: 'Sun & Moon' },
            { pattern: /^(XY)\s+/i, series: 'XY' },
            { pattern: /^(BLACK\s*&?\s*WHITE)\s+/i, series: 'Black & White' },
            { pattern: /^(SCARLET\s*&?\s*VIOLET)\s+/i, series: 'Scarlet & Violet' },
            { pattern: /^(DIAMOND\s*&?\s*PEARL)\s+/i, series: 'Diamond & Pearl' },
            { pattern: /^(HEARTGOLD\s*&?\s*SOULSILVER)\s+/i, series: 'HeartGold & SoulSilver' },
            { pattern: /^(PLATINUM)\s+/i, series: 'Platinum' },
            { pattern: /^(EX)\s+/i, series: 'EX' },
          ];

          if (detectedGame === 'pokemon') {
            for (const { pattern, series } of POKEMON_SERIES_PREFIXES) {
              if (pattern.test(setName)) {
                detectedSeries = series;
                setName = setName.replace(pattern, '');
                break;
              }
            }
          }

          const finalSetName = toTitleCase(setName.trim());
          return { game: detectedGame, series: detectedSeries, setName: finalSetName, setCode: '', tcgSetName: finalSetName };
        };

        const { game: detectedGame, series: detectedSeries, setName: parsedSetName, tcgSetName } = parseSetName(result.psa.set);
        const cardName = toTitleCase(cleanPSACardName(result.psa.name));
        const cardNumber = result.psa.number;

        // Auto-fill form fields from PSA data
        setFormData(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          game: detectedGame || prev.game,
          card_name: cardName || prev.card_name,
          set_name: parsedSetName || prev.set_name,
          card_number: cardNumber || prev.card_number,
          grade: extractNumericGrade(result.psa.grade) || prev.grade,
        }));

        // Trigger TCG product search to find matching images
        // Use tcgSetName (lexical name only) for better TCG matching
        if (cardName && cardName.trim().length >= 2) {
          handleTCGSearch(cardName, tcgSetName || parsedSetName, cardNumber);
        }
      } else {
        setPsaError(result.error || 'PSA certification not found');
      }
    } catch (err) {
      setPsaError(err.message || 'Failed to fetch PSA data');
    } finally {
      setPsaLoading(false);
    }
  };

  // PSA cert number detection - trigger lookup on barcode change
  useEffect(() => {
    const barcode = formData.barcode_id?.trim() || '';
    
    if (psaDebounceRef.current) clearTimeout(psaDebounceRef.current);
    setPsaError(null);
    
    if (isPSACertNumber(barcode)) {
      psaDebounceRef.current = setTimeout(() => {
        handlePSALookup(barcode);
      }, 1200);
    } else {
      setPsaData(null);
      psaFetchedRef.current = null;
    }
    
    return () => {
      if (psaDebounceRef.current) clearTimeout(psaDebounceRef.current);
    };
  }, [formData.barcode_id]);

 const cleanForCardLookup = (name) => {
  if (!name) return '';
  return name.replace(/[.\s']/g, '');
};

  // TCG product search with fallback for different naming conventions
  const handleTCGSearch = async (cardName, setName, cardNumber) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return;
    }
    
    setTcgLoading(true);
    try {
      // First try with original card name (works for Pokemon, etc.)
      let result = await searchTCGProducts(cardName, setName, cardNumber, 9);
      
      // If no results and name contains periods or multiple words, try cleaned version (One Piece style)
      if ((!result.success || !result.products || result.products.length === 0) && 
          (cardName.includes('.') || cardName.includes(' '))) {
        const cleanedName = cleanForCardLookup(cardName);
        if (cleanedName !== cardName) {
          result = await searchTCGProducts(cleanedName, setName, cardNumber, 9);
        }
      }
      
      // If still no results and set name was provided, try without set name (graded cards often have mismatched set names)
      if ((!result.success || !result.products || result.products.length === 0) && setName) {
        result = await searchTCGProducts(cardName, '', cardNumber, 9);
        
        // Also try cleaned name without set name
        if ((!result.success || !result.products || result.products.length === 0) && 
            (cardName.includes('.') || cardName.includes(' '))) {
          const cleanedName = cleanForCardLookup(cardName);
          if (cleanedName !== cardName) {
            result = await searchTCGProducts(cleanedName, '', cardNumber, 9);
          }
        }
      }
      
      if (result.success && result.products) {
        setTcgProducts(result.products);
        setShowAllTcgResults(false); // Reset expanded state on new search
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

  // Debounced TCG search when card name, set name, or card number changes
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

  // Start editing a staged item
  const startEditingItem = (item) => {
    setEditingLineId(item.lineId);
    setEditingData({
      purchase_price: item.purchase_price || '',
      condition: item.condition || 'NM',
      grade: item.grade || '',
      card_name: item.card_name || '',
    });
  };

  // Save edited item
  const saveEditingItem = () => {
    if (!editingLineId) return;
    updatePendingItem(editingLineId, {
      purchase_price: Number(editingData.purchase_price) || 0,
      condition: editingData.condition,
      grade: editingData.grade,
      card_name: editingData.card_name,
    });
    setEditingLineId(null);
    setEditingData({});
  };

  // Cancel editing
  const cancelEditingItem = () => {
    setEditingLineId(null);
    setEditingData({});
  };

  // Convert to title case
  const toTitleCase = (str) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Strip trailing numbers and variant suffixes
  const cleanCardName = (name) => {
    if (!name) return '';
    let cleaned = name.replace(/\s+\d+\s+\d+$/, '').replace(/\s+-\s+\d+\/\d+$/, '').trim();
    const variantSuffixes = [
      /\s+Alternate Full Art$/i, /\s+Full Art$/i, /\s+Special Art Rare$/i,
      /\s+Illustration Rare$/i, /\s+Ultra Rare$/i, /\s+Secret Rare$/i,
    ];
    for (const suffix of variantSuffixes) {
      cleaned = cleaned.replace(suffix, '');
    }
    return cleaned.trim();
  };

  // Strip set code prefixes
  const cleanSetName = (name) => {
    if (!name) return '';
    return name.replace(/^[A-Za-z]+\d*:\s*/i, '').trim();
  };

  // Auto-detect PSA card type from barcode
  useEffect(() => {
    const barcode = formData.barcode_id?.trim() || '';
    if (isPSACertNumber(barcode) && formData.card_type === 'raw') {
      setFormData(prev => ({ ...prev, card_type: 'psa' }));
    }
  }, [formData.barcode_id, formData.card_type]);

  // Detect game from TCG product categoryId
  // TCGPlayer category IDs: Pokemon = 3, One Piece = 68, Magic = 1, Yu-Gi-Oh = 2
  const detectGameFromProduct = (product) => {
    const categoryId = product.categoryId;
    
    switch (categoryId) {
      case 3:
        return 'pokemon';
      case 68:
        return 'onepiece';
      case 1:
        return 'mtg';
      case 2:
        return 'yugioh';
      default:
        // Default to pokemon if unknown category
        return 'pokemon';
    }
  };

  const handleSelectTcgProduct = (product) => {
    // Save current form state before making changes (for restore on deselect)
    setPreSelectionFormData({ ...formData });
    
    setSelectedTcgProduct(product);
    
    const formattedCardName = toTitleCase(cleanCardName(product.cleanName || product.name || ''));
    const formattedSetName = toTitleCase(cleanSetName(product.setName || ''));
    const detectedGame = detectGameFromProduct(product);
    
    setFormData(prev => {
      const isGradedCard = prev.card_type !== 'raw';
      
      // For graded cards, only update image and game - preserve PSA data for other fields
      if (isGradedCard) {
        return {
          ...prev,
          image_url: product.imageUrl || prev.image_url,
          tcg_product_id: product.productId,
          game: prev.game || detectedGame, // Use existing if set, otherwise detect
        };
      }
      // For raw cards, populate all fields including game and condition
      return {
        ...prev,
        image_url: product.imageUrl || prev.image_url,
        tcg_product_id: product.productId,
        card_name: formattedCardName,
        set_name: formattedSetName,
        card_number: product.cardNumber || prev.card_number,
        game: prev.game || detectedGame, // Use existing if set, otherwise detect
        condition: prev.condition || 'NM', // Default to NM if not set
      };
    });
    setTcgProducts([]); // Clear suggestions after selection
  };

  const handleAddToStaged = () => {
    if (!formData.card_name?.trim()) return;
    if (formData.barcode_id?.trim() && isDuplicateBarcode) return;
    
    addPendingItem({
      ...formData,
      purchase_price: Number(formData.purchase_price) || 0,
      front_label_price: Number(formData.front_label_price) || null,
      quantity: 1,
    });
    
    // Reset form for next card
    setFormData(getInitialFormData);
    setSelectedTcgProduct(null);
    setPsaData(null);
    psaFetchedRef.current = null;
    
    // Focus barcode input for next scan
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleSubmitAll = async () => {
    if (pendingItems.length === 0) return;
    
    setSubmitting(true);
    try {
      for (const item of pendingItems) {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          const itemData = { ...item };
          // Only first item gets the barcode if quantity > 1
          if (i > 0) {
            delete itemData.barcode_id;
          }
          delete itemData.lineId;
          delete itemData.quantity;
          await addInventoryItem(itemData);
        }
      }
      
      clearPending();
      setSuccessMessage(`Successfully added ${totalQuantity} card${totalQuantity > 1 ? 's' : ''} to inventory!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    } catch (err) {
      console.error('Failed to add items:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isGraded = formData.card_type !== 'raw';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Purchases</h2>
          </div>
          {pendingItems.length > 0 && (
            <span className="text-sm text-gray-600">
              {totalQuantity} card{totalQuantity !== 1 ? 's' : ''} • ${totalCost.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Add Card Form */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        {/* Barcode Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Barcode / Cert #</label>
          <div className="relative">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={formData.barcode_id}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode_id: e.target.value }))}
              placeholder="Scan or enter barcode"
              className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                isDuplicateBarcode ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {psaLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>
          {isDuplicateBarcode && (
            <p className="text-xs text-red-600 mt-1">This barcode already exists in your inventory</p>
          )}
        </div>

        {/* PSA Market Data Panel */}
        {(psaData || psaLoading || psaError) && (
          <PSAMarketData
            data={psaData}
            loading={psaLoading}
            error={psaError}
            onRetry={() => formData.barcode_id && handlePSALookup(formData.barcode_id)}
          />
        )}

        {/* Card Name & Card Number Row*/}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Card Name *</label>
            <input
              type="text"
              value={formData.card_name}
              onChange={(e) => handleFieldChange('card_name', e.target.value)}
              placeholder="e.g., Charizard VMAX"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          {/* Card Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Card Number</label>
            <input
              type="text"
              value={formData.card_number}
              onChange={(e) => handleFieldChange('card_number', e.target.value)}
              placeholder="e.g., 136/172"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Set Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Set Name</label>
          <input
            type="text"
            value={formData.set_name}
            onChange={(e) => handleFieldChange('set_name', e.target.value)}
            placeholder="e.g., Brilliant Stars"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Game & Card Type Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Game</label>
            <select
              value={formData.game}
              onChange={(e) => setFormData(prev => ({ ...prev, game: e.target.value }))}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select Game</option>
              {GAMES.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={formData.card_type}
              onChange={(e) => setFormData(prev => ({ ...prev, card_type: e.target.value }))}
              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              {CARD_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* TCG Loading Spinner */}
        {tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Looking up Image(s)...</span>
          </div>
        )}

        {/* TCG Product Grid - shows 3 by default, carousel if more */}
        {tcgProducts.length > 0 && !selectedTcgProduct && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                Match Card {tcgLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
              </label>
              {tcgProducts.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllTcgResults(!showAllTcgResults)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAllTcgResults ? 'Show less' : `Show more (${tcgProducts.length})`}
                </button>
              )}
            </div>
            
            {/* Carousel view when expanded and more than 3 results */}
            {showAllTcgResults && tcgProducts.length > 3 ? (
              <div className="overflow-x-auto pb-2 -mx-1">
                <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
                  {tcgProducts.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => handleSelectTcgProduct(product)}
                      className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                    >
                      <div className="relative">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full aspect-[2.5/3.5] object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                        <p className="font-medium text-gray-900 truncate">
                          {(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}
                        </p>
                        <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Grid view - default 3 items, same size as carousel */
              <div className="flex gap-2">
                {tcgProducts.slice(0, 3).map((product) => (
                  <button
                    key={product.productId}
                    type="button"
                    onClick={() => handleSelectTcgProduct(product)}
                    className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                  >
                    <div className="relative">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full aspect-[2.5/3.5] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                      <p className="font-medium text-gray-900 truncate">
                        {(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}
                      </p>
                      <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No matches message */}
        {formData.card_name && formData.card_name.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
          <p className="text-xs text-gray-500">No matching cards found. Try adjusting the card name.</p>
        )}

        {/* Selected card preview */}
        {selectedTcgProduct && tcgProducts.length === 0 && (
          <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
            {selectedTcgProduct.imageUrl && (
              <img 
                src={selectedTcgProduct.imageUrl} 
                alt={selectedTcgProduct.name}
                className="w-12 h-auto rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{selectedTcgProduct.cleanName || selectedTcgProduct.name}</p>
              {selectedTcgProduct.setName && (
                <p className="text-xs text-gray-500 truncate">{selectedTcgProduct.setName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                // Restore form state to before selection
                if (preSelectionFormData) {
                  setFormData(preSelectionFormData);
                  // Re-trigger search with restored values
                  if (preSelectionFormData.card_name) {
                    handleTCGSearch(preSelectionFormData.card_name, preSelectionFormData.set_name, preSelectionFormData.card_number);
                  }
                } else {
                  setFormData(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
                  if (formData.card_name) handleTCGSearch(formData.card_name, formData.set_name, formData.card_number);
                }
                setSelectedTcgProduct(null);
                setPreSelectionFormData(null);
              }}
              className="p-1 hover:bg-green-100 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        {/* TCGPlayer Link - only for raw cards */}
        {selectedTcgProduct?.url && formData.card_type === 'raw' && (
          <a
            href={(() => {
              const conditionMap = {
                'NM': 'Near+Mint',
                'LP': 'Lightly+Played',
                'MP': 'Moderately+Played',
                'HP': 'Heavily+Played',
                'DMG': 'Damaged',
              };
              const baseUrl = selectedTcgProduct.url;
              const condition = conditionMap[formData.condition] || 'Near+Mint';
              const separator = baseUrl.includes('?') ? '&' : '?';
              return `${baseUrl}${separator}Language=English&Condition=${condition}&page=1`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            View on TCGPlayer →
          </a>
        )}

        {/* Card Ladder Link - for graded cards */}
        {formData.card_type !== 'raw' && formData.barcode_id && (
          <a
            href="https://app.cardladder.com/sales-history"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              navigator.clipboard.writeText(formData.barcode_id);
            }}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            Search on Card Ladder (cert # copied) →
          </a>
        )}

        {/* Condition/Grade Row */}
        <div className="grid grid-cols-2 gap-2">
          {isGraded ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select</option>
                  {GRADES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Qualifier</label>
                <input
                  type="text"
                  value={formData.grade_qualifier}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade_qualifier: e.target.value }))}
                  placeholder="e.g., OC"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
              <div className="flex gap-1">
                {CONDITIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, condition: c }))}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                      formData.condition === c
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price</label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                inputMode="decimal"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Market Price</label>
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                inputMode="decimal"
                value={formData.front_label_price}
                onChange={(e) => setFormData(prev => ({ ...prev, front_label_price: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* PSA Market Data */}
        {psaData && <PSAMarketData psaData={psaData} />}

        {/* Add to Staged Button */}
        <button
          onClick={handleAddToStaged}
          disabled={!formData.card_name?.trim() || (formData.barcode_id?.trim() && isDuplicateBarcode)}
          className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to Purchase
        </button>
      </div>

      {/* Staged Items List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {pendingItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No cards staged yet</p>
            <p className="text-xs mt-1">Add cards above to create a purchase</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div 
                key={item.lineId} 
                className={`rounded-lg p-3 ${editingLineId === item.lineId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
              >
                {editingLineId === item.lineId ? (
                  /* Editing Mode */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                      )}
                      <input
                        type="text"
                        value={editingData.card_name}
                        onChange={(e) => setEditingData(prev => ({ ...prev, card_name: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Card Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Price</label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                          <input
                            inputMode="decimal"
                            step="0.01"
                            value={editingData.purchase_price}
                            onChange={(e) => setEditingData(prev => ({ ...prev, purchase_price: e.target.value }))}
                            className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      {item.card_type === 'raw' ? (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Condition</label>
                          <select
                            value={editingData.condition}
                            onChange={(e) => setEditingData(prev => ({ ...prev, condition: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            {CONDITIONS.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Grade</label>
                          <select
                            value={editingData.grade}
                            onChange={(e) => setEditingData(prev => ({ ...prev, grade: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          >
                            {GRADES.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={cancelEditingItem}
                        className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEditingItem}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View */
                  <div className="flex items-start gap-3">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-12 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.card_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.set_name} {item.card_number && `#${item.card_number}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                          {item.card_type === 'raw' ? item.condition : `${item.card_type.toUpperCase()} ${item.grade}`}
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          ${Number(item.purchase_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Edit Button */}
                    <button
                      onClick={() => startEditingItem(item)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit item"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Quantity Control */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updatePendingItem(item.lineId, { quantity: item.quantity - 1 });
                          } else {
                            removePendingItem(item.lineId);
                          }
                        }}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity || 1}</span>
                      <button
                        onClick={() => updatePendingItem(item.lineId, { quantity: (item.quantity || 1) + 1 })}
                        className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removePendingItem(item.lineId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with Submit */}
      {pendingItems.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total ({totalQuantity} cards)</span>
            <span className="font-bold text-lg">${totalCost.toFixed(2)}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearPending}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={submitting}
              className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 
                         disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Purchase
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
