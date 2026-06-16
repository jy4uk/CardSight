import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, DollarSign, Loader2, Scan, X, ShoppingBag, CheckCircle, Pencil, Bookmark, HelpCircle, ChevronDown } from 'lucide-react';
import { fetchPSAData, isPSACertNumber, searchTCGProducts, addInventoryItem, fetchCardLadderSales } from '../../api';
import { usePendingPurchase } from '../../context/PendingPurchaseContext.jsx';
import { useSavedDeals } from '../../context/SavedDealsContext';
import { usePurchaseTutorial } from '../../hooks/useTutorial';
import UnifiedMarketPanel from '../UnifiedMarketPanel';
import { CONDITIONS, GRADES, GAMES, CARD_TYPES } from '../../constants';
import { getInitialFormData, cleanCardName, cleanSetName, toTitleCase } from '../../utils';

export default function AddPurchaseModal({ isOpen, onClose, inventoryItems = [], onPurchaseComplete, resumedDeal = null }) {
  const { pendingItems, addPendingItem, updatePendingItem, removePendingItem, clearPending, totalQuantity, totalCost } = usePendingPurchase();
  const { saveDeal, deleteDeal } = useSavedDeals();
  const { startTutorial: startPurchaseTutorial } = usePurchaseTutorial();

  const [formData, setFormData] = useState(getInitialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Save for later state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveCustomerName, setSaveCustomerName] = useState('');
  const [saveCustomerNote, setSaveCustomerNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [resumedDealId, setResumedDealId] = useState(null);

  // Editing staged items state
  const [editingLineId, setEditingLineId] = useState(null);
  const [editingData, setEditingData] = useState({});

  // TCG product matching state
  const [tcgProducts, setTcgProducts] = useState([]);
  const [tcgLoading, setTcgLoading] = useState(false);
  const [selectedTcgProduct, setSelectedTcgProduct] = useState(null);
  const [showAllTcgResults, setShowAllTcgResults] = useState(false);
  const [preSelectionFormData, setPreSelectionFormData] = useState(null);
  const tcgDebounceRef = useRef(null);

  // PSA lookup state
  const [psaData, setPsaData] = useState(null);
  const [psaLoading, setPsaLoading] = useState(false);
  const [psaError, setPsaError] = useState(null);
  const psaDebounceRef = useRef(null);
  const psaFetchedRef = useRef(null);
  const barcodeInputRef = useRef(null);

  // CardLadder sales state
  const [clData, setClData] = useState(null);
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState(null);
  const clFetchedRef = useRef(null);

  // Graded card detail collapse
  const [showGradedDetails, setShowGradedDetails] = useState(false);

  // Market price + percentage slider
  const [marketPrice, setMarketPrice] = useState('');
  const [pricePercentage, setPricePercentage] = useState(80);

  // Check for duplicate barcodes
  const isDuplicateBarcode = useMemo(() => {
    const barcode = formData.barcode_id?.trim();
    if (!barcode) return false;
    return inventoryItems.some(item => item.barcode_id === barcode);
  }, [formData.barcode_id, inventoryItems]);

  // Focus barcode input when modal opens
  useEffect(() => {
    if (isOpen && barcodeInputRef.current) {
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Start tutorial for first-time users
  useEffect(() => {
    if (isOpen) {
      startPurchaseTutorial();
    }
  }, [isOpen, startPurchaseTutorial]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(getInitialFormData);
      setSelectedTcgProduct(null);
      setPsaData(null);
      setTcgProducts([]);
      setEditingLineId(null);
      setEditingData({});
      setShowSaveDialog(false);
      setSaveCustomerName('');
      setSaveCustomerNote('');
      setResumedDealId(null);
      setClData(null);
      setClError(null);
      clFetchedRef.current = null;
      setShowGradedDetails(false);
    }
  }, [isOpen]);

  // Hydrate from resumed deal
  useEffect(() => {
    if (isOpen && resumedDeal && resumedDeal.deal_data) {
      // Clear existing pending items first
      clearPending();

      // Add items from resumed deal
      const dealData = typeof resumedDeal.deal_data === 'string'
        ? JSON.parse(resumedDeal.deal_data)
        : resumedDeal.deal_data;

      if (dealData.items && Array.isArray(dealData.items)) {
        dealData.items.forEach(item => {
          addPendingItem(item);
        });
      }

      // Pre-fill customer name if available
      if (resumedDeal.customer_name) {
        setSaveCustomerName(resumedDeal.customer_name);
      }
      if (resumedDeal.customer_note) {
        setSaveCustomerNote(resumedDeal.customer_note);
      }

      // Track the resumed deal ID for deletion after completion
      setResumedDealId(resumedDeal.id);
    }
  }, [isOpen, resumedDeal, clearPending, addPendingItem]);

  const handleCardLadderLookup = async (certNumber, specId, cardName, grade) => {
    const cacheKey = `${certNumber}:${specId || cardName}:${grade}`;
    if (clFetchedRef.current === cacheKey) return;
    clFetchedRef.current = cacheKey;
    setClLoading(true);
    setClError(null);
    setClData(null);
    try {
      const result = await fetchCardLadderSales(certNumber, specId, cardName, grade);
      setClData(result);
      if (!result.success && result.error && !result.notConfigured) {
        setClError(result.error);
      }
    } catch (err) {
      setClError(err.message || 'Failed to fetch CardLadder data');
    } finally {
      setClLoading(false);
    }
  };

  // PSA lookup with full parsing (matching PurchasePanel)
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
          const onePieceMatch = setName.match(/^(OP\d+[A-Z]?)-(.+)$/i);
          if (onePieceMatch || detectedGame === 'onepiece') {
            if (onePieceMatch) {
              setCode = onePieceMatch[1].toUpperCase();
              const lexicalName = toTitleCase(onePieceMatch[2].trim());
              return {
                game: 'onepiece',
                series: '',
                setName: `${lexicalName} - ${setCode}`,
                setCode,
                tcgSetName: lexicalName
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

        const numericGrade = extractNumericGrade(result.psa.grade);

        // Auto-fill form fields from PSA data
        setFormData(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          game: detectedGame || prev.game,
          card_name: cardName || prev.card_name,
          set_name: parsedSetName || prev.set_name,
          card_number: cardNumber || prev.card_number,
          grade: numericGrade || prev.grade,
        }));

        // Trigger TCG product search to find matching images
        if (cardName && cardName.trim().length >= 2) {
          handleTCGSearch(cardName, tcgSetName || parsedSetName, cardNumber);
        }

        // Trigger CardLadder lookup — use PSA specId for exact card matching
        if (cardName) {
          handleCardLadderLookup(certNumber, result.psa.specId, cardName, numericGrade);
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
      setClData(null);
      setClError(null);
      clFetchedRef.current = null;
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

  // Debounced TCG search
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

  // Auto-detect PSA card type from barcode
  useEffect(() => {
    const barcode = formData.barcode_id?.trim() || '';
    if (isPSACertNumber(barcode) && formData.card_type === 'raw') {
      setFormData(prev => ({ ...prev, card_type: 'psa' }));
    }
  }, [formData.barcode_id, formData.card_type]);

  // Detect game from TCG product categoryId
  const detectGameFromProduct = (product) => {
    const categoryId = product.categoryId;
    switch (categoryId) {
      case 3: return 'pokemon';
      case 68: return 'onepiece';
      case 1: return 'mtg';
      case 2: return 'yugioh';
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
        return {
          ...prev,
          image_url: product.imageUrl || prev.image_url,
          tcg_product_id: product.productId,
          game: detectedGame,
        };
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

  const handleAddToStaged = () => {
    if (!formData.card_name?.trim()) return;
    if (formData.barcode_id?.trim() && isDuplicateBarcode) return;

    addPendingItem({
      ...formData,
      purchase_price: Number(formData.purchase_price) || 0,
      front_label_price: Number(formData.front_label_price) || null,
      market_price: parseFloat(marketPrice) || null,
      quantity: 1,
    });

    setFormData(getInitialFormData);
    setSelectedTcgProduct(null);
    setPsaData(null);
    psaFetchedRef.current = null;
    setClData(null);
    setClError(null);
    clFetchedRef.current = null;
    setShowGradedDetails(false);
    setMarketPrice('');
    setPricePercentage(80);

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
          if (i > 0) delete itemData.barcode_id;
          delete itemData.lineId;
          delete itemData.quantity;
          await addInventoryItem(itemData);
        }
      }

      // If this was a resumed deal, delete the saved deal
      if (resumedDealId) {
        await deleteDeal(resumedDealId);
      }

      clearPending();
      setSuccessMessage(`Successfully added ${totalQuantity} card${totalQuantity > 1 ? 's' : ''} to inventory!`);

      setTimeout(() => {
        setSuccessMessage('');
        onClose();
        if (onPurchaseComplete) onPurchaseComplete();
      }, 1500);
    } catch (err) {
      console.error('Failed to add items:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit handlers
  const handleStartEdit = (item) => {
    setEditingLineId(item.lineId);
    setEditingData({
      card_name: item.card_name,
      set_name: item.set_name || '',
      card_number: item.card_number || '',
      purchase_price: item.purchase_price || '',
      front_label_price: item.front_label_price || '',
      condition: item.condition || '',
      grade: item.grade || '',
      card_type: item.card_type || 'raw',
      game: item.game || '',
    });
  };

  const handleSaveEdit = (lineId) => {
    updatePendingItem(lineId, editingData);
    setEditingLineId(null);
    setEditingData({});
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setEditingData({});
  };

  // Generate TCGPlayer product URL with condition
  const generateTCGPlayerUrl = (product, condition) => {
    // Use the direct product URL if available
    if (product?.url) {
      const conditionMap = {
        'NM': 'Near Mint',
        'LP': 'Lightly Played',
        'MP': 'Moderately Played',
        'HP': 'Heavily Played',
        'DMG': 'Damaged'
      };
      const tcgCondition = conditionMap[condition] || 'Near Mint';
      const separator = product.url.includes('?') ? '&' : '?';
      return `${product.url}${separator}Language=English&Condition=${encodeURIComponent(tcgCondition)}`;
    }

    // Fallback to search URL
    const searchQuery = product?.cardNumber
      ? `${product.cleanName || product.name} ${product.setName || ''} ${product.cardNumber}`
      : `${product.cleanName || product.name} ${product.setName || ''}`;
    return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(searchQuery.trim())}&page=1`;
  };

  // Save for later handler
  const handleSaveForLater = async () => {
    if (pendingItems.length === 0) return;

    setSaving(true);
    try {
      const dealData = {
        items: pendingItems,
        totalQuantity,
        totalCost
      };

      const result = await saveDeal({
        deal_type: 'purchase',
        customer_name: saveCustomerName.trim() || null,
        customer_note: saveCustomerNote.trim() || null,
        deal_data: dealData,
        total_items: totalQuantity,
        total_value: totalCost,
        trade_out_inventory_ids: []
      });

      if (result.success) {
        // If we resumed from an existing deal, delete the old one
        if (resumedDealId) {
          await deleteDeal(resumedDealId);
        }

        clearPending();
        setShowSaveDialog(false);
        setSuccessMessage('Deal saved for later!');

        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1500);
      } else {
        alert('Failed to save deal: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to save deal:', err);
      alert('Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isGraded = formData.card_type !== 'raw';

  // Pill button style helpers
  const pillSelected = 'px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-600 border-green-600 text-white';
  const pillUnselected = 'px-2.5 py-0.5 rounded-full text-xs font-medium border bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700';

  // Shared staged item renderer (used in both desktop right col and mobile bottom)
  const renderStagedItems = () => {
    if (pendingItems.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No cards staged yet</p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {pendingItems.map((item) => {
          const purchasePrice = Number(item.purchase_price || 0);

          return (
            <div
              key={item.lineId}
              className={`rounded-lg p-3 ${editingLineId === item.lineId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
            >
              {editingLineId === item.lineId ? (
                <div className="space-y-2">
                  {/* Row 1: Image + Card Name + Set */}
                  <div className="flex items-start gap-2">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={editingData.card_name}
                        onChange={(e) => setEditingData(prev => ({ ...prev, card_name: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Card Name"
                      />
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={editingData.set_name}
                          onChange={(e) => setEditingData(prev => ({ ...prev, set_name: e.target.value }))}
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Set Name"
                        />
                        <input
                          type="text"
                          value={editingData.card_number}
                          onChange={(e) => setEditingData(prev => ({ ...prev, card_number: e.target.value }))}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="#"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Row 2: Game, Type, Condition/Grade */}
                  <div className="flex items-center gap-1">
                    <select
                      value={editingData.game || ''}
                      onChange={(e) => setEditingData(prev => ({ ...prev, game: e.target.value }))}
                      className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Game</option>
                      {GAMES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    <select
                      value={editingData.card_type || 'raw'}
                      onChange={(e) => setEditingData(prev => ({ ...prev, card_type: e.target.value, condition: e.target.value === 'raw' ? prev.condition : '', grade: e.target.value !== 'raw' ? prev.grade : '' }))}
                      className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      {CARD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    {editingData.card_type === 'raw' ? (
                      <select
                        value={editingData.condition || ''}
                        onChange={(e) => setEditingData(prev => ({ ...prev, condition: e.target.value }))}
                        className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Cond</option>
                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <select
                        value={editingData.grade || ''}
                        onChange={(e) => setEditingData(prev => ({ ...prev, grade: e.target.value }))}
                        className="px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Grade</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                  </div>
                  {/* Row 3: Price + Actions */}
                  <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                      <input
                        inputMode="decimal"
                        value={editingData.purchase_price}
                        onChange={(e) => setEditingData(prev => ({ ...prev, purchase_price: e.target.value }))}
                        className="w-full pl-5 pr-1 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Buy Price"
                        step="0.01"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveEdit(item.lineId)}
                      className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{item.card_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.card_type !== 'raw' ? `${item.card_type.toUpperCase()} ${item.grade || ''}` : item.condition || 'Raw'}
                      {item.set_name && ` • ${item.set_name}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm text-green-600">Buy @ ${purchasePrice.toFixed(2)}</p>
                    {item.market_price > 0 && (
                      <p className="text-[10px] text-gray-400">{Math.round(purchasePrice / item.market_price * 100)}% of ${item.market_price.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removePendingItem(item.lineId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-3xl sm:rounded-xl rounded-t-2xl shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Record Purchase</h2>
            <button
              onClick={() => startPurchaseTutorial(true)}
              className="p-1 hover:bg-green-100 rounded-full transition-colors"
              title="Show tutorial"
            >
              <HelpCircle className="w-4 h-4 text-green-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                <ShoppingBag className="w-3 h-3" />
                {totalQuantity} • ${totalCost.toFixed(2)}
              </span>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {/* Body: two-column on sm+ */}
        <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
          {/* Left column — form */}
          <div className={`sm:w-72 sm:flex-shrink-0 sm:border-r border-gray-100 overflow-y-auto p-4 space-y-3 ${pendingItems.length === 0 ? 'pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] sm:pb-4' : ''}`}>
            {/* Barcode Input */}
            <div data-tutorial="purchase-barcode-field">
              <div className="relative">
                <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={formData.barcode_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode_id: e.target.value }))}
                  placeholder="Scan or enter barcode / cert #"
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

            {/* Collapsible card details — always open for raw/sealed, togglable for graded */}
            {isGraded && (
              <button
                type="button"
                onClick={() => setShowGradedDetails(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGradedDetails ? 'rotate-180' : ''}`} />
                {showGradedDetails ? 'Hide card details' : 'Edit card details'}
              </button>
            )}

            {(!isGraded || showGradedDetails) && (
              <div className="space-y-3">
                {/* Card Name + Card Number */}
                <div data-tutorial="purchase-card-name-field" className="flex gap-2">
                  <input
                    type="text"
                    value={formData.card_name}
                    onChange={(e) => handleFieldChange('card_name', e.target.value)}
                    placeholder="Card name *"
                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={formData.card_number}
                    onChange={(e) => handleFieldChange('card_number', e.target.value)}
                    placeholder="#"
                    className="w-16 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Set Name */}
                <div data-tutorial="purchase-set-field">
                  <input
                    type="text"
                    value={formData.set_name}
                    onChange={(e) => handleFieldChange('set_name', e.target.value)}
                    placeholder="Set name"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

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

                {/* Condition pills — raw/sealed only */}
                {!isGraded && (
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
              </div>
            )}

            {/* Image lookup — always visible */}
            {tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                Looking up images…
              </div>
            )}

            {tcgProducts.length > 0 && !selectedTcgProduct && (
              <div data-tutorial="purchase-tcg-match">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">
                    Match image {tcgLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                  </label>
                  {tcgProducts.length > 3 && (
                    <button type="button" onClick={() => setShowAllTcgResults(!showAllTcgResults)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      {showAllTcgResults ? 'Show less' : `Show more (${tcgProducts.length})`}
                    </button>
                  )}
                </div>
                {showAllTcgResults && tcgProducts.length > 3 ? (
                  <div className="overflow-x-auto pb-2 -mx-1">
                    <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
                      {tcgProducts.map((product) => (
                        <button key={product.productId} type="button" onClick={() => handleSelectTcgProduct(product)}
                          className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left">
                          {product.imageUrl
                            ? <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                            : <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xs">No image</span></div>}
                          <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                            <p className="font-medium text-gray-900 truncate">{(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}</p>
                            <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {tcgProducts.slice(0, 3).map((product) => (
                      <button key={product.productId} type="button" onClick={() => handleSelectTcgProduct(product)}
                        className="w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left">
                        {product.imageUrl
                          ? <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                          : <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xs">No image</span></div>}
                        <div className="px-1.5 py-1 bg-gray-50 text-[10px] leading-tight">
                          <p className="font-medium text-gray-900 truncate">{(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}</p>
                          <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formData.card_name?.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
              <p className="text-xs text-gray-400">No matching card images found.</p>
            )}

            {selectedTcgProduct && tcgProducts.length === 0 && (
              <div data-tutorial="purchase-selected-card" className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                {selectedTcgProduct.imageUrl && (
                  <img src={selectedTcgProduct.imageUrl} alt={selectedTcgProduct.name} className="w-10 h-auto rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{selectedTcgProduct.cleanName || selectedTcgProduct.name}</p>
                  {selectedTcgProduct.setName && <p className="text-[10px] text-gray-500 truncate">{selectedTcgProduct.setName}</p>}
                  <a href={generateTCGPlayerUrl(selectedTcgProduct, formData.condition)} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline">TCGPlayer →</a>
                </div>
                <button type="button"
                  onClick={() => {
                    if (preSelectionFormData) {
                      setFormData(preSelectionFormData);
                      if (preSelectionFormData.card_name) handleTCGSearch(preSelectionFormData.card_name, preSelectionFormData.set_name, preSelectionFormData.card_number);
                    } else {
                      setFormData(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
                      if (formData.card_name) handleTCGSearch(formData.card_name, formData.set_name, formData.card_number);
                    }
                    setSelectedTcgProduct(null);
                    setPreSelectionFormData(null);
                  }}
                  className="p-1 hover:bg-green-100 rounded flex-shrink-0">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            )}

            {/* Price — market price, percentage slider, buy price */}
            <div data-tutorial="purchase-price-fields" className="space-y-2">
              {/* Market price */}
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  inputMode="decimal"
                  value={marketPrice}
                  onChange={(e) => {
                    const mp = e.target.value;
                    setMarketPrice(mp);
                    const mpNum = parseFloat(mp);
                    if (!isNaN(mpNum) && mpNum > 0) {
                      const raw = mpNum * pricePercentage / 100;
                      const dec = raw - Math.floor(raw);
                      setFormData(prev => ({ ...prev, purchase_price: dec < 0.5 ? Math.floor(raw) : Math.ceil(raw) }));
                    }
                  }}
                  placeholder="Market price"
                  min="0"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Percentage slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>% of market</span>
                  <span className="font-medium text-gray-700">{pricePercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={pricePercentage}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    setPricePercentage(pct);
                    const mpNum = parseFloat(marketPrice);
                    if (!isNaN(mpNum) && mpNum > 0) {
                      const raw = mpNum * pct / 100;
                      const dec = raw - Math.floor(raw);
                      setFormData(prev => ({ ...prev, purchase_price: dec < 0.5 ? Math.floor(raw) : Math.ceil(raw) }));
                    }
                  }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-green-600 bg-gray-200"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Buy price */}
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  inputMode="decimal"
                  value={formData.purchase_price}
                  onChange={(e) => {
                    const bp = e.target.value;
                    setFormData(prev => ({ ...prev, purchase_price: bp }));
                    const mpNum = parseFloat(marketPrice);
                    const bpNum = parseFloat(bp);
                    if (!isNaN(mpNum) && mpNum > 0 && !isNaN(bpNum)) {
                      setPricePercentage(Math.min(100, Math.max(0, Math.round(bpNum / mpNum * 100))));
                    }
                  }}
                  placeholder="Buy price"
                  min="0"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Add to Purchase button */}
            <button
              data-tutorial="purchase-add-button"
              onClick={handleAddToStaged}
              disabled={!formData.card_name?.trim() || (formData.barcode_id?.trim() && isDuplicateBarcode)}
              className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add to Purchase
            </button>

            {/* Market panel — mobile only (placed after Add button) */}
            {(psaData || psaLoading || psaError) && (
              <div data-tutorial="purchase-psa-panel" className="sm:hidden">
                <UnifiedMarketPanel
                  psaData={psaData}
                  psaLoading={psaLoading}
                  psaError={psaError}
                  onRetryPSA={() => formData.barcode_id && handlePSALookup(formData.barcode_id)}
                  clData={formData.card_type !== 'raw' ? clData : null}
                  clLoading={formData.card_type !== 'raw' && clLoading}
                  clError={formData.card_type !== 'raw' ? clError : null}
                  onRetryCL={() => {
                    clFetchedRef.current = null;
                    handleCardLadderLookup(formData.barcode_id.trim(), psaData?.psa?.specId, formData.card_name, formData.grade);
                  }}
                  certNumber={formData.barcode_id?.trim()}
                />
              </div>
            )}

            {/* Staged items — mobile only */}
            <div className="sm:hidden border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Staged ({totalQuantity})</p>
              <div className="overflow-y-auto max-h-52">
                {renderStagedItems()}
              </div>
            </div>
          </div>

          {/* Right column — market panel + staged items (desktop only) */}
          <div className="hidden sm:flex flex-col flex-1 overflow-hidden">
            {/* Market panel — desktop */}
            {(psaData || psaLoading || psaError) && (
              <div className="p-4 border-b border-gray-100 overflow-y-auto flex-shrink-0 max-h-[58%]">
                <UnifiedMarketPanel
                  psaData={psaData}
                  psaLoading={psaLoading}
                  psaError={psaError}
                  onRetryPSA={() => formData.barcode_id && handlePSALookup(formData.barcode_id)}
                  clData={formData.card_type !== 'raw' ? clData : null}
                  clLoading={formData.card_type !== 'raw' && clLoading}
                  clError={formData.card_type !== 'raw' ? clError : null}
                  onRetryCL={() => {
                    clFetchedRef.current = null;
                    handleCardLadderLookup(formData.barcode_id.trim(), psaData?.psa?.specId, formData.card_name, formData.grade);
                  }}
                  certNumber={formData.barcode_id?.trim()}
                />
              </div>
            )}

            {/* Staged items — desktop */}
            <div className="flex-1 overflow-y-auto p-4">
              {pendingItems.length === 0 && (
                <p className="text-xs font-medium text-gray-400 mb-2">Staged cards will appear here</p>
              )}
              {renderStagedItems()}
            </div>
          </div>
        </div>

        {/* Footer with Submit - safe area padding for bottom nav on mobile */}
        {pendingItems.length > 0 && (
          <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] sm:pb-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 space-y-2 flex-shrink-0">
            {/* Save Dialog */}
            {showSaveDialog ? (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Save this quote for later?</p>
                <input
                  type="text"
                  value={saveCustomerName}
                  onChange={(e) => setSaveCustomerName(e.target.value)}
                  placeholder="Customer name (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="text"
                  value={saveCustomerNote}
                  onChange={(e) => setSaveCustomerNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveForLater}
                    disabled={saving}
                    className="flex-1 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                    Save Deal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total ({totalQuantity} cards)</span>
                  <span className="font-bold text-lg">Pay customer: ${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearPending}
                    className="py-2.5 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="py-2.5 px-3 border border-amber-400 text-amber-600 font-medium rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1"
                  >
                    <Bookmark className="w-4 h-4" />
                    Save for Later
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
