import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, ArrowRight, ArrowLeft, DollarSign, Percent, User, Calendar, Search, Loader2, Scan, Bookmark, AlertTriangle, Pencil, Check, HelpCircle } from 'lucide-react';
import { fetchPSAData, isPSACertNumber, searchTCGProducts } from '../../api';
import { useSavedDeals } from '../../context/SavedDealsContext';
import { useTradeTutorial } from '../../hooks/useTutorial';
import PSAMarketData from '../PSAMarketData';
import { CONDITIONS, GRADES, GAMES, CARD_TYPES } from '../../constants';

const DEFAULT_TRADE_PERCENTAGE = 80;

// Helper: title case
const toTitleCase = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

// Helper: clean card name for lookup (remove periods/spaces for One Piece style)
const cleanForCardLookup = (name) => {
  if (!name) return '';
  return name.replace(/[.\s']/g, '');
};

// Helper: strip trailing numbers and variant suffixes
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

// Helper: strip set code prefixes
const cleanSetName = (name) => {
  if (!name) return '';
  return name.replace(/^[A-Za-z]+\d*:\s*/i, '').trim();
};

// Helper: detect game from TCG categoryId
const detectGameFromProduct = (product) => {
  switch (product.categoryId) {
    case 3: return 'pokemon';
    case 68: return 'onepiece';
    case 1: return 'mtg';
    case 2: return 'yugioh';
    default: return 'pokemon';
  }
};

export default function TradeModal({ isOpen, onClose, onSubmit, inventoryItems = [], resumedDeal = null }) {
  const { saveDeal, deleteDeal } = useSavedDeals();
  const { startTutorial: startTradeTutorial } = useTradeTutorial();
  
  const [customerName, setCustomerName] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [tradeInItems, setTradeInItems] = useState([]);
  const [tradeOutItems, setTradeOutItems] = useState([]);
  const [cashToCustomer, setCashToCustomer] = useState(0);
  const [cashFromCustomer, setCashFromCustomer] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Save for later state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveCustomerNote, setSaveCustomerNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [resumedDealId, setResumedDealId] = useState(null);
  const [unavailableItems, setUnavailableItems] = useState([]);
  
  // Trade-out search state
  const [tradeOutSearch, setTradeOutSearch] = useState('');
  const [showTradeOutDropdown, setShowTradeOutDropdown] = useState(false);
  const tradeOutSearchRef = useRef(null);
  
  // Trade-in form state (integrated add card form)
  const [showAddTradeInForm, setShowAddTradeInForm] = useState(false);
  const [tradeInForm, setTradeInForm] = useState({
    barcode_id: '',
    card_name: '',
    set_name: '',
    card_number: '',
    game: 'pokemon',
    card_type: 'raw',
    condition: 'NM',
    grade: '',
    grade_qualifier: '',
    card_value: '',  // This is the market value (front_label_price)
    trade_percentage: DEFAULT_TRADE_PERCENTAGE,
    trade_value_override: null,  // This becomes purchase_price when added to inventory
    image_url: '',
    cert_number: '',
    tcg_product_id: null,
    notes: ''
  });
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
  
  // Editing staged trade-in items
  const [editingTradeInIndex, setEditingTradeInIndex] = useState(null);
  const [editingTradeInData, setEditingTradeInData] = useState({});

  // Available inventory items (IN_STOCK only, not already in trade-out)
  const availableItems = useMemo(() => {
    const tradeOutIds = new Set(tradeOutItems.map(item => item.inventory_id));
    return inventoryItems.filter(item => item.status === 'IN_STOCK' && !tradeOutIds.has(item.id));
  }, [inventoryItems, tradeOutItems]);

  // Filtered items for trade-out autocomplete
  const filteredTradeOutItems = useMemo(() => {
    if (!tradeOutSearch.trim()) return availableItems.slice(0, 10);
    const search = tradeOutSearch.toLowerCase();
    return availableItems.filter(item => 
      item.card_name?.toLowerCase().includes(search) ||
      item.set_name?.toLowerCase().includes(search) ||
      item.barcode_id?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [availableItems, tradeOutSearch]);

  // Auto-add item when barcode is scanned (exact barcode match)
  useEffect(() => {
    if (!tradeOutSearch.trim()) return;
    
    // Check for exact barcode match
    const exactMatch = availableItems.find(
      item => item.barcode_id && item.barcode_id.toLowerCase() === tradeOutSearch.toLowerCase()
    );
    
    if (exactMatch) {
      // Add item and clear search
      if (!tradeOutItems.find(item => item.inventory_id === exactMatch.id)) {
        setTradeOutItems(prev => [...prev, {
          inventory_id: exactMatch.id,
          card_name: exactMatch.card_name,
          set_name: exactMatch.set_name,
          card_value: parseFloat(exactMatch.front_label_price) || 0,
          image_url: exactMatch.image_url,
          condition: exactMatch.condition,
          card_type: exactMatch.card_type,
          grade: exactMatch.grade,
          barcode_id: exactMatch.barcode_id
        }]);
      }
      setTradeOutSearch('');
      setShowTradeOutDropdown(false);
    }
  }, [tradeOutSearch, availableItems, tradeOutItems]);

  // Calculate totals - use stored trade_value which may include overrides
  const tradeInTotal = tradeInItems.reduce((sum, item) => sum + (parseFloat(item.card_value) || 0), 0);
  const tradeInValue = tradeInItems.reduce((sum, item) => sum + (parseFloat(item.trade_value) || 0), 0);
  const tradeOutTotal = tradeOutItems.reduce((sum, item) => sum + (parseFloat(item.card_value) || 0), 0);
  const difference = tradeInValue - tradeOutTotal;

  // Calculate weighted average trade percentage for display
  const avgTradePercentage = tradeInTotal > 0 
    ? (tradeInValue / tradeInTotal * 100).toFixed(1)
    : DEFAULT_TRADE_PERCENTAGE;

  // Auto-calculate cash adjustment
  useEffect(() => {
    if (difference > 0) {
      setCashToCustomer(Math.abs(difference));
      setCashFromCustomer(0);
    } else if (difference < 0) {
      setCashFromCustomer(Math.abs(difference));
      setCashToCustomer(0);
    } else {
      setCashToCustomer(0);
      setCashFromCustomer(0);
    }
  }, [difference]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tradeOutSearchRef.current && !tradeOutSearchRef.current.contains(e.target)) {
        setShowTradeOutDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Start tutorial for first-time users
  useEffect(() => {
    if (isOpen) {
      startTradeTutorial();
    }
  }, [isOpen, startTradeTutorial]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTradeInForm({
        barcode_id: '', card_name: '', set_name: '', card_number: '', game: 'pokemon',
        card_type: 'raw', condition: 'NM', grade: '', grade_qualifier: '',
        card_value: '', trade_percentage: DEFAULT_TRADE_PERCENTAGE, trade_value_override: null, 
        image_url: '', cert_number: '', tcg_product_id: null, notes: ''
      });
      setShowAddTradeInForm(false);
      setTradeOutSearch('');
      setShowTradeOutDropdown(false);
      // Reset PSA state
      setPsaData(null);
      setPsaLoading(false);
      setPsaError(null);
      psaFetchedRef.current = null;
      if (psaDebounceRef.current) {
        clearTimeout(psaDebounceRef.current);
        psaDebounceRef.current = null;
      }
      // Reset TCG state
      setTcgProducts([]);
      setTcgLoading(false);
      setSelectedTcgProduct(null);
      setShowAllTcgResults(false);
      setPreSelectionFormData(null);
      if (tcgDebounceRef.current) {
        clearTimeout(tcgDebounceRef.current);
        tcgDebounceRef.current = null;
      }
      // Reset save for later state
      setShowSaveDialog(false);
      setSaveCustomerNote('');
      setResumedDealId(null);
      setUnavailableItems([]);
      // Reset editing state
      setEditingTradeInIndex(null);
      setEditingTradeInData({});
    }
  }, [isOpen]);

  // Hydrate from resumed deal
  useEffect(() => {
    if (isOpen && resumedDeal && resumedDeal.deal_data) {
      const dealData = typeof resumedDeal.deal_data === 'string' 
        ? JSON.parse(resumedDeal.deal_data) 
        : resumedDeal.deal_data;
      
      // Set customer info
      if (resumedDeal.customer_name) setCustomerName(resumedDeal.customer_name);
      if (resumedDeal.customer_note) setSaveCustomerNote(resumedDeal.customer_note);
      if (dealData.notes) setNotes(dealData.notes);
      
      // Set trade items
      if (dealData.tradeInItems) setTradeInItems(dealData.tradeInItems);
      if (dealData.tradeOutItems) {
        // Check which trade-out items are still available
        const unavailable = [];
        const validTradeOutItems = dealData.tradeOutItems.filter(item => {
          const inventoryItem = inventoryItems.find(i => i.id === item.inventory_id);
          if (!inventoryItem || inventoryItem.status !== 'IN_STOCK') {
            unavailable.push(item);
            return false;
          }
          return true;
        });
        setTradeOutItems(validTradeOutItems);
        setUnavailableItems(unavailable);
      }
      
      // Set cash values
      if (dealData.cashToCustomer !== undefined) setCashToCustomer(dealData.cashToCustomer);
      if (dealData.cashFromCustomer !== undefined) setCashFromCustomer(dealData.cashFromCustomer);
      
      // Track resumed deal ID
      setResumedDealId(resumedDeal.id);
    }
  }, [isOpen, resumedDeal, inventoryItems]);

  // Focus barcode input when Add Card form is opened
  useEffect(() => {
    if (showAddTradeInForm && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showAddTradeInForm]);

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
          if (!rawSet) return { game: null, series: '', setName: '', tcgSetName: '' };
          
          let setName = rawSet;
          let detectedGame = null;

          for (const { pattern, game } of GAME_PREFIXES) {
            if (pattern.test(setName)) {
              detectedGame = game;
              setName = setName.replace(pattern, '');
              break;
            }
          }

          // Handle One Piece set format
          const onePieceMatch = setName.match(/^(OP\d+[A-Z]?)-(.+)$/i);
          if (onePieceMatch || detectedGame === 'onepiece') {
            if (onePieceMatch) {
              const setCode = onePieceMatch[1].toUpperCase();
              const lexicalName = toTitleCase(onePieceMatch[2].trim());
              return { 
                game: 'onepiece', 
                setName: `${lexicalName} - ${setCode}`,
                tcgSetName: lexicalName
              };
            }
          }

          // Extract Pokemon series prefixes
          const POKEMON_SERIES_PREFIXES = [
            { pattern: /^(SWORD\s*&?\s*SHIELD)\s+/i, series: 'Sword & Shield' },
            { pattern: /^(SUN\s*&?\s*MOON)\s+/i, series: 'Sun & Moon' },
            { pattern: /^(SCARLET\s*&?\s*VIOLET)\s+/i, series: 'Scarlet & Violet' },
          ];

          if (detectedGame === 'pokemon') {
            for (const { pattern } of POKEMON_SERIES_PREFIXES) {
              if (pattern.test(setName)) {
                setName = setName.replace(pattern, '');
                break;
              }
            }
          }

          const finalSetName = toTitleCase(setName.trim());
          return { game: detectedGame, setName: finalSetName, tcgSetName: finalSetName };
        };

        const { game: detectedGame, setName: parsedSetName, tcgSetName } = parseSetName(result.psa.set);
        const cardName = toTitleCase(cleanPSACardName(result.psa.name));
        const cardNumber = result.psa.number;

        // Auto-fill form fields from PSA data
        setTradeInForm(prev => ({
          ...prev,
          card_type: 'psa',
          cert_number: certNumber,
          game: detectedGame || prev.game,
          card_name: cardName || prev.card_name,
          set_name: parsedSetName || prev.set_name,
          card_number: cardNumber || prev.card_number,
          grade: extractNumericGrade(result.psa.grade) || prev.grade,
        }));

        // Trigger TCG product search for image matching
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

  const handleBarcodeChange = (value) => {
    const certNumber = tradeInForm.card_type !== 'raw' ? value : '';
    setTradeInForm(prev => ({ ...prev, barcode_id: value, cert_number: certNumber }));
    
    // Debounce PSA lookup
    if (psaDebounceRef.current) {
      clearTimeout(psaDebounceRef.current);
    }
    setPsaError(null);
    
    if (isPSACertNumber(value)) {
      psaDebounceRef.current = setTimeout(() => {
        handlePSALookup(value);
      }, 1200);
    } else {
      setPsaData(null);
      psaFetchedRef.current = null;
    }
  };

  // TCG product search with 4-step fallback for different naming conventions
  const handleTCGSearch = async (cardName, setName, cardNumber) => {
    if (!cardName || cardName.trim().length < 2) {
      setTcgProducts([]);
      return;
    }
    
    setTcgLoading(true);
    try {
      // First try with original card name
      let result = await searchTCGProducts(cardName, setName, cardNumber, 9);
      
      // If no results and name contains periods or multiple words, try cleaned version (One Piece style)
      if ((!result.success || !result.products || result.products.length === 0) && 
          (cardName.includes('.') || cardName.includes(' '))) {
        const cleanedName = cleanForCardLookup(cardName);
        if (cleanedName !== cardName) {
          result = await searchTCGProducts(cleanedName, setName, cardNumber, 9);
        }
      }
      
      // If still no results and set name was provided, try without set name
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

  // Select a TCG product and auto-populate form fields
  const selectTCGProduct = (product) => {
    // Save current form state before making changes (for restore on deselect)
    setPreSelectionFormData({ ...tradeInForm });
    setSelectedTcgProduct(product);
    
    const formattedCardName = toTitleCase(cleanCardName(product.cleanName || product.name || ''));
    const formattedSetName = toTitleCase(cleanSetName(product.setName || ''));
    const detectedGame = detectGameFromProduct(product);
    
    setTradeInForm(prev => {
      const isGradedCard = prev.card_type !== 'raw';
      
      // For graded cards, only update image and game - preserve PSA data for other fields
      if (isGradedCard) {
        return {
          ...prev,
          image_url: product.imageUrl || prev.image_url,
          tcg_product_id: product.productId,
          game: detectedGame, // Always auto-select the detected game
        };
      }
      // For raw cards, populate all fields including game
      return {
        ...prev,
        image_url: product.imageUrl || prev.image_url,
        tcg_product_id: product.productId,
        card_name: formattedCardName,
        set_name: formattedSetName,
        card_number: product.cardNumber || prev.card_number,
        game: detectedGame, // Always auto-select the detected game
        condition: prev.condition || 'NM',
      };
    });
    setTcgProducts([]);
  };

  // Handle card name/set/number changes with TCG search
  const handleTradeInFieldChange = (field, value) => {
    setTradeInForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'card_name' || field === 'set_name' || field === 'card_number') {
      if (tcgDebounceRef.current) {
        clearTimeout(tcgDebounceRef.current);
      }
      
      const newCardName = field === 'card_name' ? value : tradeInForm.card_name;
      const newSetName = field === 'set_name' ? value : tradeInForm.set_name;
      const newCardNumber = field === 'card_number' ? value : tradeInForm.card_number;
      
      if (newCardName && newCardName.trim().length >= 2) {
        tcgDebounceRef.current = setTimeout(() => {
          handleTCGSearch(newCardName, newSetName, newCardNumber);
        }, 400);
      } else {
        setTcgProducts([]);
      }
    }
  };

  // Calculate live trade value for the form
  const formTradeValue = useMemo(() => {
    const value = parseFloat(tradeInForm.card_value) || 0;
    const pct = parseFloat(tradeInForm.trade_percentage) || DEFAULT_TRADE_PERCENTAGE;
    return (value * pct / 100).toFixed(2);
  }, [tradeInForm.card_value, tradeInForm.trade_percentage]);

  const addTradeInFromForm = () => {
    if (!tradeInForm.card_name || !tradeInForm.card_value) {
      alert('Please enter card name and value');
      return;
    }
    const cardValue = parseFloat(tradeInForm.card_value) || 0;
    const tradePct = parseFloat(tradeInForm.trade_percentage) || DEFAULT_TRADE_PERCENTAGE;
    // Use override if provided, otherwise calculate from percentage
    const tradeValue = tradeInForm.trade_value_override !== null && tradeInForm.trade_value_override !== ''
      ? parseFloat(tradeInForm.trade_value_override) || 0
      : cardValue * tradePct / 100;
    
    setTradeInItems([...tradeInItems, {
      id: Date.now(),
      ...tradeInForm,
      card_value: cardValue,
      trade_percentage: tradePct,
      trade_value: tradeValue,
      front_label_price: cardValue,  // Market value
      purchase_price: tradeValue,     // What we're "paying" (trade credit)
    }]);
    // Reset form but keep it open for adding more
    setTradeInForm({
      barcode_id: '', card_name: '', set_name: '', card_number: '', game: tradeInForm.game,
      card_type: 'raw', condition: 'NM', grade: '', grade_qualifier: '',
      card_value: '', trade_percentage: DEFAULT_TRADE_PERCENTAGE, trade_value_override: null, 
      image_url: '', cert_number: '', tcg_product_id: null, notes: ''
    });
    // Reset PSA state for next card
    setPsaData(null);
    setPsaError(null);
    psaFetchedRef.current = null;
    // Reset TCG state for next card
    setTcgProducts([]);
    setSelectedTcgProduct(null);
    setPreSelectionFormData(null);
    
    // Focus barcode input for next scan
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Start editing a staged trade-in item
  const startEditingTradeIn = (index) => {
    const item = tradeInItems[index];
    setEditingTradeInIndex(index);
    setEditingTradeInData({
      card_name: item.card_name || '',
      card_value: item.card_value || '',
      trade_value: item.trade_value || '',
      condition: item.condition || 'NM',
      grade: item.grade || '',
    });
  };

  // Save edited trade-in item
  const saveEditingTradeIn = () => {
    if (editingTradeInIndex === null) return;
    const updated = [...tradeInItems];
    updated[editingTradeInIndex] = {
      ...updated[editingTradeInIndex],
      card_name: editingTradeInData.card_name,
      card_value: parseFloat(editingTradeInData.card_value) || 0,
      trade_value: parseFloat(editingTradeInData.trade_value) || 0,
      front_label_price: parseFloat(editingTradeInData.card_value) || 0,
      purchase_price: parseFloat(editingTradeInData.trade_value) || 0,
      condition: editingTradeInData.condition,
      grade: editingTradeInData.grade,
    };
    setTradeInItems(updated);
    setEditingTradeInIndex(null);
    setEditingTradeInData({});
  };

  // Cancel editing trade-in item
  const cancelEditingTradeIn = () => {
    setEditingTradeInIndex(null);
    setEditingTradeInData({});
  };

  const updateTradeInItem = (index, field, value) => {
    const updated = [...tradeInItems];
    // For trade_value, parse as float; for others, use value directly
    if (field === 'trade_value') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setTradeInItems(updated);
  };

  const removeTradeInItem = (index) => {
    setTradeInItems(tradeInItems.filter((_, i) => i !== index));
  };

  const addTradeOutItem = (inventoryItem) => {
    if (!tradeOutItems.find(item => item.inventory_id === inventoryItem.id)) {
      setTradeOutItems([...tradeOutItems, {
        inventory_id: inventoryItem.id,
        card_name: inventoryItem.card_name,
        set_name: inventoryItem.set_name,
        card_value: parseFloat(inventoryItem.front_label_price) || 0,
        image_url: inventoryItem.image_url,
        condition: inventoryItem.condition,
        card_type: inventoryItem.card_type,
        grade: inventoryItem.grade,
        barcode_id: inventoryItem.barcode_id
      }]);
    }
    setTradeOutSearch('');
    setShowTradeOutDropdown(false);
  };

  const removeTradeOutItem = (index) => {
    setTradeOutItems(tradeOutItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (tradeInItems.length === 0 && tradeOutItems.length === 0) {
      alert('Please add at least one trade-in or trade-out item');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        customer_name: customerName,
        trade_percentage: avgTradePercentage, // Weighted average for record keeping
        trade_in_items: tradeInItems,
        trade_out_items: tradeOutItems,
        cash_to_customer: cashToCustomer,
        cash_from_customer: cashFromCustomer,
        notes,
        trade_date: tradeDate
      });
      
      // If this was a resumed deal, delete the saved deal
      if (resumedDealId) {
        await deleteDeal(resumedDealId);
      }
      
      // Reset form
      setCustomerName('');
      setTradeInItems([]);
      setTradeOutItems([]);
      setCashToCustomer(0);
      setCashFromCustomer(0);
      setNotes('');
      onClose();
    } catch (err) {
      alert('Failed to create trade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save for later handler
  const handleSaveForLater = async () => {
    if (tradeInItems.length === 0 && tradeOutItems.length === 0) {
      alert('Please add at least one trade-in or trade-out item');
      return;
    }
    
    setSaving(true);
    try {
      // Calculate totals for display
      const totalItems = tradeInItems.length + tradeOutItems.length;
      const totalValue = tradeInValue + tradeOutTotal;
      
      // Get inventory IDs of trade-out items for availability checking
      const tradeOutInventoryIds = tradeOutItems
        .filter(item => item.inventory_id)
        .map(item => item.inventory_id);
      
      const dealData = {
        tradeInItems,
        tradeOutItems,
        cashToCustomer,
        cashFromCustomer,
        notes,
        tradeDate,
        tradeInTotal,
        tradeInValue,
        tradeOutTotal,
        avgTradePercentage
      };
      
      const result = await saveDeal({
        deal_type: 'trade',
        customer_name: customerName.trim() || null,
        customer_note: saveCustomerNote.trim() || null,
        deal_data: dealData,
        total_items: totalItems,
        total_value: totalValue,
        trade_out_inventory_ids: tradeOutInventoryIds
      });
      
      if (result.success) {
        // If we resumed from an existing deal, delete the old one
        if (resumedDealId) {
          await deleteDeal(resumedDealId);
        }
        
        // Reset form
        setCustomerName('');
        setTradeInItems([]);
        setTradeOutItems([]);
        setCashToCustomer(0);
        setCashFromCustomer(0);
        setNotes('');
        setShowSaveDialog(false);
        onClose();
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

  const getConditionOrGrade = (item) => {
    if (item.card_type === 'raw') return item.condition || 'NM';
    return `${item.card_type?.toUpperCase()} ${item.grade || ''}${item.grade_qualifier || ''}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full sm:max-w-6xl sm:rounded-xl rounded-t-2xl shadow-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Record Trade
              <ArrowLeft className="w-5 h-5" />
            </h2>
            <button 
              onClick={() => startTradeTutorial(true)} 
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Show tutorial"
            >
              <HelpCircle className="w-4 h-4 text-white/80" />
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Trade Info Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                <Percent className="w-4 h-4 inline mr-1" />
                Avg Trade %
              </label>
              <input
                type="text"
                value={`${avgTradePercentage}%`}
                disabled
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-400"
                title="Calculated from individual card percentages"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Trade Date
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Trade-In Section (Customer's cards coming IN) */}
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800 dark:text-green-400 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Cards Coming IN (from customer)
                </h3>
                <button
                  onClick={() => setShowAddTradeInForm(!showAddTradeInForm)}
                  className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Card
                </button>
              </div>

              {/* Inline Add Card Form */}
              {showAddTradeInForm && (
                <div className="bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3 space-y-3">
                  {/* Barcode Input for PSA lookup */}
                  <div data-tutorial="trade-barcode-field" className="relative">
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={tradeInForm.barcode_id}
                      onChange={(e) => handleBarcodeChange(e.target.value)}
                      placeholder="Scan barcode or enter PSA cert #..."
                      className="w-full px-2 py-2 pr-8 border border-gray-300 dark:border-slate-600 rounded text-sm font-mono bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      autoComplete="off"
                    />
                    <Scan className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {/* PSA Market Data Panel */}
                  {(psaData || psaLoading || psaError) && (
                    <div data-tutorial="trade-psa-panel">
                    <PSAMarketData
                      data={psaData}
                      loading={psaLoading}
                      error={psaError}
                      onRetry={() => tradeInForm.barcode_id && handlePSALookup(tradeInForm.barcode_id)}
                    />
                    </div>
                  )}

                  <div data-tutorial="trade-card-name-field" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={tradeInForm.card_name}
                      onChange={(e) => handleTradeInFieldChange('card_name', e.target.value)}
                      placeholder="Card name *"
                      className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={tradeInForm.set_name}
                      onChange={(e) => handleTradeInFieldChange('set_name', e.target.value)}
                      placeholder="Set name"
                      className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                  </div>

                  {/* TCG Loading Spinner */}
                  {tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Looking up Image(s)...</span>
                    </div>
                  )}

                  {/* TCG Product Grid - shows 3 by default, carousel if more */}
                  {tcgProducts.length > 0 && !selectedTcgProduct && (
                    <div data-tutorial="trade-tcg-match">
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
                                onClick={() => selectTCGProduct(product)}
                                className="w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                              >
                                <div className="relative">
                                  {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                                  ) : (
                                    <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">No image</span>
                                    </div>
                                  )}
                                </div>
                                <div className="px-1 py-0.5 bg-gray-50 text-[10px] leading-tight">
                                  <p className="font-medium text-gray-900 truncate">{(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}</p>
                                  <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* Grid view - default 3 items */
                        <div className="flex gap-2">
                          {tcgProducts.slice(0, 3).map((product) => (
                            <button
                              key={product.productId}
                              type="button"
                              onClick={() => selectTCGProduct(product)}
                              className="w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-green-400 transition-all text-left"
                            >
                              <div className="relative">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full aspect-[2.5/3.5] object-cover" />
                                ) : (
                                  <div className="w-full aspect-[2.5/3.5] bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No image</span>
                                  </div>
                                )}
                              </div>
                              <div className="px-1 py-0.5 bg-gray-50 text-[10px] leading-tight">
                                <p className="font-medium text-gray-900 truncate">{(product.cleanName || product.name || '').replace(/\s+\d+\s+\d+$/, '')}</p>
                                <p className="text-gray-500 truncate">{product.setName} • #{product.cardNumber || '—'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No matches message */}
                  {tradeInForm.card_name && tradeInForm.card_name.length >= 2 && !tcgLoading && tcgProducts.length === 0 && !selectedTcgProduct && (
                    <p className="text-xs text-gray-500">No matching cards found. Try adjusting the card name.</p>
                  )}

                  <div data-tutorial="trade-value-fields" className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={tradeInForm.card_number}
                      onChange={(e) => handleTradeInFieldChange('card_number', e.target.value)}
                      placeholder="Card #"
                      className="px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    />
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-gray-500 dark:text-slate-400 text-sm">$</span>
                      <input
                        value={tradeInForm.card_value}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, card_value: e.target.value }))}
                        placeholder="Market Value *"
                        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-sm min-w-0 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        value={tradeInForm.trade_percentage}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, trade_percentage: e.target.value }))}
                        placeholder="%"
                        min="0"
                        max="100"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      />
                      <span className="text-gray-500 dark:text-slate-400 text-sm shrink-0">%</span>
                    </div>
                  </div>

                  {/* Selected card preview - moved below card number/price row */}
                  {selectedTcgProduct && tcgProducts.length === 0 && (
                    <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-200">
                      {selectedTcgProduct.imageUrl && (
                        <img src={selectedTcgProduct.imageUrl} alt={selectedTcgProduct.name} className="w-12 h-auto rounded" />
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
                            setTradeInForm(preSelectionFormData);
                            if (preSelectionFormData.card_name) {
                              handleTCGSearch(preSelectionFormData.card_name, preSelectionFormData.set_name, preSelectionFormData.card_number);
                            }
                          } else {
                            setTradeInForm(prev => ({ ...prev, tcg_product_id: null, image_url: '' }));
                            if (tradeInForm.card_name) handleTCGSearch(tradeInForm.card_name, tradeInForm.set_name, tradeInForm.card_number);
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
                  {selectedTcgProduct?.url && tradeInForm.card_type === 'raw' && (
                    <a
                      data-tutorial="trade-tcgplayer-link"
                      href={(() => {
                        const conditionMap = {
                          'NM': 'Near+Mint',
                          'LP': 'Lightly+Played',
                          'MP': 'Moderately+Played',
                          'HP': 'Heavily+Played',
                          'DMG': 'Damaged',
                        };
                        const baseUrl = selectedTcgProduct.url;
                        const condition = conditionMap[tradeInForm.condition] || 'Near+Mint';
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
                  {tradeInForm.card_type !== 'raw' && tradeInForm.barcode_id && (
                    <a
                      data-tutorial="trade-cardladder-link"
                      href="https://app.cardladder.com/sales-history"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        navigator.clipboard.writeText(tradeInForm.barcode_id);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Search on Card Ladder (cert # copied) →
                    </a>
                  )}

                  {/* Live Trade Value Calculation with Override */}
                  {tradeInForm.card_value && (
                    <div className="bg-green-100 border border-green-200 rounded-lg p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <span>Trade Value</span>
                        <span className="text-xs text-green-600">
                          ({tradeInForm.trade_value_override !== null && tradeInForm.trade_value_override !== '' && parseFloat(tradeInForm.card_value) > 0
                            ? ((parseFloat(tradeInForm.trade_value_override) / parseFloat(tradeInForm.card_value)) * 100).toFixed(0)
                            : tradeInForm.trade_percentage || DEFAULT_TRADE_PERCENTAGE}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-700">$</span>
                        <input
                          type="text"
                          value={tradeInForm.trade_value_override ?? formTradeValue}
                          onChange={(e) => setTradeInForm(prev => ({ ...prev, trade_value_override: e.target.value }))}
                          className="w-20 px-2 py-1 border border-green-300 rounded text-sm font-bold text-green-800 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Game Selection */}
                  <div className="flex gap-1 flex-wrap">
                    {GAMES.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setTradeInForm(prev => ({ ...prev, game: g.id }))}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors
                          ${tradeInForm.game === g.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  {/* Card Type */}
                  <div className="flex gap-1 flex-wrap">
                    {CARD_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTradeInForm(prev => ({ ...prev, card_type: t.id }))}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors
                          ${tradeInForm.card_type === t.id
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Condition or Grade */}
                  {tradeInForm.card_type === 'raw' ? (
                    <div className="flex gap-1 flex-wrap">
                      {CONDITIONS.map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setTradeInForm(prev => ({ ...prev, condition: cond }))}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors
                            ${tradeInForm.condition === cond
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }`}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={tradeInForm.grade}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, grade: e.target.value }))}
                        className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      >
                        <option value="">Grade</option>
                        {GRADES.map((grade) => (
                          <option key={grade} value={grade}>{grade}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setTradeInForm(prev => ({ 
                          ...prev, 
                          grade_qualifier: prev.grade_qualifier === '.5' ? '' : '.5'
                        }))}
                        className={`px-2 py-1 border rounded text-xs font-medium transition-colors
                          ${tradeInForm.grade_qualifier === '.5'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        .5
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addTradeInFromForm}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                    >
                      Add to Trade
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTradeInForm(false)}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-200 rounded text-sm font-medium hover:bg-gray-300 dark:hover:bg-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Trade-In Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tradeInItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`rounded-lg p-2 ${editingTradeInIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-slate-700 border border-green-200 dark:border-green-700'}`}
                  >
                    {editingTradeInIndex === index ? (
                      /* Editing Mode */
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                          )}
                          <input
                            type="text"
                            value={editingTradeInData.card_name}
                            onChange={(e) => setEditingTradeInData(prev => ({ ...prev, card_name: e.target.value }))}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Card Name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Market Value</label>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <input
                                inputMode="decimal"
                                step="0.01"
                                value={editingTradeInData.card_value}
                                onChange={(e) => setEditingTradeInData(prev => ({ ...prev, card_value: e.target.value }))}
                                className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Trade Value</label>
                            <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                              <input
                                inputMode="decimal"
                                step="0.01"
                                value={editingTradeInData.trade_value}
                                onChange={(e) => setEditingTradeInData(prev => ({ ...prev, trade_value: e.target.value }))}
                                className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEditingTradeIn}
                            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEditingTradeIn}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal View */
                      <>
                        <div className="flex gap-2 items-start">
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">{item.card_name}</div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {item.set_name} • {getConditionOrGrade(item)}
                            </div>
                          </div>
                          <button onClick={() => startEditingTradeIn(index)} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeTradeInItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Value and Trade Value display */}
                        <div className="mt-2 bg-green-100 border border-green-200 rounded-lg p-2 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-green-700">
                            <span>Value: ${parseFloat(item.card_value).toFixed(2)}</span>
                            <span className="text-xs text-green-600">
                              ({parseFloat(item.card_value) > 0 
                                ? ((parseFloat(item.trade_value) / parseFloat(item.card_value)) * 100).toFixed(0) 
                                : 0}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-green-700">Trade $</span>
                            <input
                              type="text"
                              value={item.trade_value}
                              onChange={(e) => updateTradeInItem(index, 'trade_value', e.target.value)}
                              className="w-16 px-1 py-0.5 border border-green-300 rounded text-sm font-bold text-green-800 bg-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {tradeInItems.length === 0 && !showAddTradeInForm && (
                  <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">No cards added yet</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 dark:text-green-400">Total Value:</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">${tradeInTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 dark:text-green-400">Trade Value (avg {avgTradePercentage}%):</span>
                  <span className="font-bold text-green-800 dark:text-green-300">${tradeInValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trade-Out Section (Your cards going OUT) */}
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-800 dark:text-blue-400 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Cards Going OUT (to customer)
                </h3>
              </div>

              {/* Autocomplete Search */}
              <div className="mb-3 relative" ref={tradeOutSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={tradeOutSearch}
                    onChange={(e) => {
                      setTradeOutSearch(e.target.value);
                      setShowTradeOutDropdown(true);
                    }}
                    onFocus={() => setShowTradeOutDropdown(true)}
                    placeholder="Search by name, set, or barcode..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Dropdown */}
                {showTradeOutDropdown && filteredTradeOutItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredTradeOutItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addTradeOutItem(item)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left border-b border-gray-100 dark:border-slate-700 last:border-0"
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">{item.card_name}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {item.set_name} • {getConditionOrGrade(item)}
                          </div>
                        </div>
                        <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                          ${parseFloat(item.front_label_price || 0).toFixed(2)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Trade-Out Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tradeOutItems.map((item, index) => (
                  <div key={item.inventory_id} className="flex gap-2 items-center bg-white dark:bg-slate-700 p-2 rounded-lg border border-blue-200 dark:border-blue-700">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-slate-100 truncate">{item.card_name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {item.set_name} • {getConditionOrGrade(item)}
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 dark:text-slate-100">${parseFloat(item.card_value).toFixed(2)}</span>
                    <button onClick={() => removeTradeOutItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tradeOutItems.length === 0 && (
                  <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">Search and select cards from your inventory</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-400">Total Value:</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300">${tradeOutTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Trade Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-slate-400">Customer Trade Value:</span>
                <div className="font-bold text-green-600 dark:text-green-400">${tradeInValue.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400">Your Cards Value:</span>
                <div className="font-bold text-blue-600 dark:text-blue-400">${tradeOutTotal.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400">Difference:</span>
                <div className={`font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-slate-400">Cash Settlement:</span>
                <div className="font-bold">
                  {difference > 0 ? (
                    <span className="text-orange-600 dark:text-orange-400">Pay customer ${cashToCustomer.toFixed(2)}</span>
                  ) : difference < 0 ? (
                    <span className="text-green-600 dark:text-green-400">Receive ${cashFromCustomer.toFixed(2)}</span>
                  ) : (
                    <span className="text-gray-600 dark:text-slate-400">Even trade</span>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Cash Override */}
            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-slate-600 grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-gray-600 dark:text-slate-400">Cash to Customer (override)</label>
                <input
                  inputMode="decimal"
                  value={cashToCustomer}
                  onChange={(e) => setCashToCustomer(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-slate-400">Cash from Customer (override)</label>
                <input
                  inputMode="decimal"
                  value={cashFromCustomer}
                  onChange={(e) => setCashFromCustomer(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unavailable Items Warning */}
        {unavailableItems.length > 0 && (
          <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Some items are no longer available</p>
                <p className="text-xs text-amber-600 mt-1">
                  {unavailableItems.map(item => item.card_name).join(', ')} - These items have been sold or traded since this deal was saved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer - with safe area padding for bottom nav on mobile */}
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom)+4rem)] sm:pb-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 space-y-2">
          {/* Save Dialog */}
          {showSaveDialog ? (
            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Save this trade quote for later?</p>
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={tradeInItems.length === 0 && tradeOutItems.length === 0}
                className="px-4 py-2 border border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Bookmark className="w-4 h-4" />
                Save for Later
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || (tradeInItems.length === 0 && tradeOutItems.length === 0)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Complete Trade'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
