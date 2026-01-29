import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, ArrowRight, ArrowLeft, DollarSign, Percent, User, Calendar, Search, Loader2 } from 'lucide-react';
import { searchCardImages } from '../../api';

const CONDITIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];
const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const GAMES = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'onepiece', label: 'One Piece' },
  { id: 'mtg', label: 'MTG' },
  { id: 'yugioh', label: 'Yu-Gi-Oh!' },
];
const CARD_TYPES = [
  { id: 'raw', label: 'Raw' },
  { id: 'psa', label: 'PSA' },
  { id: 'bgs', label: 'BGS' },
  { id: 'cgc', label: 'CGC' },
];

const DEFAULT_TRADE_PERCENTAGE = 80;

export default function TradeModal({ isOpen, onClose, onSubmit, inventoryItems = [] }) {
  const [customerName, setCustomerName] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [tradeInItems, setTradeInItems] = useState([]);
  const [tradeOutItems, setTradeOutItems] = useState([]);
  const [cashToCustomer, setCashToCustomer] = useState(0);
  const [cashFromCustomer, setCashFromCustomer] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Trade-out search state
  const [tradeOutSearch, setTradeOutSearch] = useState('');
  const [showTradeOutDropdown, setShowTradeOutDropdown] = useState(false);
  const tradeOutSearchRef = useRef(null);
  
  // Trade-in form state (integrated add card form)
  const [showAddTradeInForm, setShowAddTradeInForm] = useState(false);
  const [tradeInForm, setTradeInForm] = useState({
    card_name: '',
    set_name: '',
    card_number: '',
    game: 'pokemon',
    card_type: 'raw',
    condition: 'NM',
    grade: '',
    grade_qualifier: '',
    card_value: '',
    trade_percentage: DEFAULT_TRADE_PERCENTAGE,
    trade_value_override: null,
    image_url: '',
    cert_number: '',
    notes: ''
  });
  const [imageOptions, setImageOptions] = useState([]);
  const [searchingImages, setSearchingImages] = useState(false);

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
      item.set_name?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [availableItems, tradeOutSearch]);

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTradeInForm({
        card_name: '', set_name: '', card_number: '', game: 'pokemon',
        card_type: 'raw', condition: 'NM', grade: '', grade_qualifier: '',
        card_value: '', trade_percentage: DEFAULT_TRADE_PERCENTAGE, trade_value_override: null, image_url: '', cert_number: '', notes: ''
      });
      setImageOptions([]);
      setShowAddTradeInForm(false);
      setTradeOutSearch('');
      setShowTradeOutDropdown(false);
    }
  }, [isOpen]);

  const handleSearchImages = async () => {
    if (!tradeInForm.card_name) return;
    setSearchingImages(true);
    try {
      const result = await searchCardImages(
        tradeInForm.card_name,
        tradeInForm.set_name,
        tradeInForm.game,
        tradeInForm.card_number,
        6
      );
      if (result.success && result.cards) {
        setImageOptions(result.cards);
      }
    } catch (err) {
      console.error('Failed to search images:', err);
    } finally {
      setSearchingImages(false);
    }
  };

  const selectImage = (card) => {
    setTradeInForm(prev => ({ 
      ...prev, 
      image_url: card.imageUrl,
      card_number: card.number || prev.card_number,
    }));
    setImageOptions([]);
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
      front_label_price: cardValue
    }]);
    // Reset form but keep it open for adding more
    setTradeInForm({
      card_name: '', set_name: '', card_number: '', game: tradeInForm.game,
      card_type: 'raw', condition: 'NM', grade: '', grade_qualifier: '',
      card_value: '', trade_percentage: DEFAULT_TRADE_PERCENTAGE, trade_value_override: null, image_url: '', cert_number: '', notes: ''
    });
    setImageOptions([]);
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

  const getConditionOrGrade = (item) => {
    if (item.card_type === 'raw') return item.condition || 'NM';
    return `${item.card_type?.toUpperCase()} ${item.grade || ''}${item.grade_qualifier || ''}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ArrowRight className="w-5 h-5" />
            Record Trade
            <ArrowLeft className="w-5 h-5" />
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Trade Info Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Percent className="w-4 h-4 inline mr-1" />
                Avg Trade %
              </label>
              <input
                type="text"
                value={`${avgTradePercentage}%`}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                title="Calculated from individual card percentages"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Trade Date
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trade-In Section (Customer's cards coming IN) */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
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
                <div className="bg-white border border-green-300 rounded-lg p-3 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={tradeInForm.card_name}
                      onChange={(e) => setTradeInForm(prev => ({ ...prev, card_name: e.target.value }))}
                      placeholder="Card name *"
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="text"
                      value={tradeInForm.set_name}
                      onChange={(e) => setTradeInForm(prev => ({ ...prev, set_name: e.target.value }))}
                      placeholder="Set name"
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={tradeInForm.card_number}
                      onChange={(e) => setTradeInForm(prev => ({ ...prev, card_number: e.target.value }))}
                      placeholder="Card #"
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={tradeInForm.card_value}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, card_value: e.target.value }))}
                        placeholder="Value *"
                        step="0.01"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tradeInForm.trade_percentage}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, trade_percentage: e.target.value }))}
                        placeholder="%"
                        min="0"
                        max="100"
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>

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
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
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
                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                      >
                        .5
                      </button>
                      <input
                        type="text"
                        value={tradeInForm.cert_number}
                        onChange={(e) => setTradeInForm(prev => ({ ...prev, cert_number: e.target.value }))}
                        placeholder="Cert #"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  )}

                  {/* Image Search (Pokemon only) */}
                  {tradeInForm.game === 'pokemon' && tradeInForm.card_type === 'raw' && (
                    <div>
                      <button
                        type="button"
                        onClick={handleSearchImages}
                        disabled={!tradeInForm.card_name || searchingImages}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium
                                   hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                                   flex items-center gap-1"
                      >
                        {searchingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        Find Image
                      </button>
                      
                      {imageOptions.length > 0 && (
                        <div className="mt-2 grid grid-cols-4 gap-1">
                          {imageOptions.map((card, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => selectImage(card)}
                              className={`relative rounded overflow-hidden border-2 transition-all
                                ${tradeInForm.image_url === card.imageUrl 
                                  ? 'border-green-500 ring-1 ring-green-200' 
                                  : 'border-gray-200 hover:border-green-300'}`}
                            >
                              <img 
                                src={card.smallImageUrl || card.imageUrl} 
                                alt={card.name}
                                className="w-full aspect-[2.5/3.5] object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {tradeInForm.image_url && imageOptions.length === 0 && (
                        <img 
                          src={tradeInForm.image_url} 
                          alt="Selected"
                          className="mt-2 w-12 h-auto rounded border border-gray-200"
                        />
                      )}
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
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Trade-In Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tradeInItems.map((item, index) => (
                  <div key={item.id} className="bg-white p-2 rounded-lg border border-green-200">
                    <div className="flex gap-2 items-start">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.card_name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.set_name} • {getConditionOrGrade(item)}
                        </div>
                      </div>
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
                  </div>
                ))}
                {tradeInItems.length === 0 && !showAddTradeInForm && (
                  <p className="text-gray-500 text-sm text-center py-4">No cards added yet</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Total Value:</span>
                  <span className="font-semibold">${tradeInTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-700">Trade Value (avg {avgTradePercentage}%):</span>
                  <span className="font-bold text-green-800">${tradeInValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trade-Out Section (Your cards going OUT) */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
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
                    placeholder="Search your inventory..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Dropdown */}
                {showTradeOutDropdown && filteredTradeOutItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredTradeOutItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => addTradeOutItem(item)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0"
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.card_name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {item.set_name} • {getConditionOrGrade(item)}
                          </div>
                        </div>
                        <div className="font-semibold text-sm text-blue-600">
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
                  <div key={item.inventory_id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-blue-200">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.card_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.set_name} • {getConditionOrGrade(item)}
                      </div>
                    </div>
                    <span className="font-semibold text-sm">${parseFloat(item.card_value).toFixed(2)}</span>
                    <button onClick={() => removeTradeOutItem(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {tradeOutItems.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">Search and select cards from your inventory</p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Total Value:</span>
                  <span className="font-bold text-blue-800">${tradeOutTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Trade Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Customer Trade Value:</span>
                <div className="font-bold text-green-600">${tradeInValue.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Your Cards Value:</span>
                <div className="font-bold text-blue-600">${tradeOutTotal.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Difference:</span>
                <div className={`font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {difference >= 0 ? '+' : ''}{difference.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Cash Settlement:</span>
                <div className="font-bold">
                  {difference > 0 ? (
                    <span className="text-orange-600">Pay customer ${cashToCustomer.toFixed(2)}</span>
                  ) : difference < 0 ? (
                    <span className="text-green-600">Receive ${cashFromCustomer.toFixed(2)}</span>
                  ) : (
                    <span className="text-gray-600">Even trade</span>
                  )}
                </div>
              </div>
            </div>

            {/* Manual Cash Override */}
            <div className="mt-3 pt-3 border-t border-gray-300 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Cash to Customer (override)</label>
                <input
                  type="number"
                  value={cashToCustomer}
                  onChange={(e) => setCashToCustomer(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Cash from Customer (override)</label>
                <input
                  type="number"
                  value={cashFromCustomer}
                  onChange={(e) => setCashFromCustomer(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (tradeInItems.length === 0 && tradeOutItems.length === 0)}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Processing...' : 'Complete Trade'}
          </button>
        </div>
      </div>
    </div>
  );
}
