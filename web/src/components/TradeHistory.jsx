import { useState, useEffect } from 'react';
import { ArrowLeftRight, Calendar, User, DollarSign, Trash2, Eye, ChevronDown, ChevronUp, Pencil, Check, X, Plus } from 'lucide-react';
import AlertModal from './AlertModal';
import AddTradeItemModal from './modals/AddTradeItemModal';

export default function TradeHistory({ trades = [], inventoryItems = [], onDelete, onRefresh, onUpdateTradeItem, onUpdateTrade, onAddTradeItem, onRemoveTradeItem, compact = false }) {
  const [expandedTrade, setExpandedTrade] = useState(null);
  const [stats, setStats] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // { tradeId, itemIdx, field }
  const [editValue, setEditValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // tradeId to delete

  // Trade-level metadata editing
  const [editingTradeMeta, setEditingTradeMeta] = useState(null); // tradeId
  const [tradeMetaForm, setTradeMetaForm] = useState({});
  const [savingTradeMeta, setSavingTradeMeta] = useState(false);

  // Adding a trade-out item retroactively (picker from existing inventory)
  const [addingItemFor, setAddingItemFor] = useState(null); // { tradeId, direction: 'out' }
  const [addItemForm, setAddItemForm] = useState({});
  const [savingAddItem, setSavingAddItem] = useState(false);
  const [removingItemId, setRemovingItemId] = useState(null);

  // Adding a trade-in item retroactively (full modal)
  const [addItemModalTrade, setAddItemModalTrade] = useState(null);

  // Calculate stats
  useEffect(() => {
    if (trades.length > 0) {
      const totalTrades = trades.length;
      const totalTradeInValue = trades.reduce((sum, t) => sum + parseFloat(t.trade_in_value || 0), 0);
      const totalTradeOutValue = trades.reduce((sum, t) => sum + parseFloat(t.trade_out_total || 0), 0);
      const totalCashIn = trades.reduce((sum, t) => sum + parseFloat(t.cash_from_customer || 0), 0);
      const totalCashOut = trades.reduce((sum, t) => sum + parseFloat(t.cash_to_customer || 0), 0);
      
      setStats({
        totalTrades,
        totalTradeInValue,
        totalTradeOutValue,
        totalCashIn,
        totalCashOut,
        netCash: totalCashIn - totalCashOut
      });
    }
  }, [trades]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toDateInputValue = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const handleDelete = (tradeId) => {
    setDeleteConfirm(tradeId);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const startEditTradeMeta = (trade) => {
    setTradeMetaForm({
      customer_name: trade.customer_name || '',
      trade_date: toDateInputValue(trade.trade_date),
      trade_percentage: trade.trade_percentage ?? 80,
      cash_to_customer: trade.cash_to_customer || 0,
      cash_from_customer: trade.cash_from_customer || 0,
      notes: trade.notes || '',
    });
    setEditingTradeMeta(trade.id);
    setExpandedTrade(trade.id);
  };

  const cancelEditTradeMeta = () => {
    setEditingTradeMeta(null);
    setTradeMetaForm({});
  };

  const saveTradeMeta = async (tradeId) => {
    setSavingTradeMeta(true);
    try {
      await onUpdateTrade?.(tradeId, {
        ...tradeMetaForm,
        trade_percentage: parseFloat(tradeMetaForm.trade_percentage) || 0,
        cash_to_customer: parseFloat(tradeMetaForm.cash_to_customer) || 0,
        cash_from_customer: parseFloat(tradeMetaForm.cash_from_customer) || 0,
      });
      setEditingTradeMeta(null);
      setTradeMetaForm({});
    } finally {
      setSavingTradeMeta(false);
    }
  };

  // Items already IN_STOCK can be added as trade-out; exclude items already used elsewhere isn't needed since status flips on use
  const availableForTradeOut = inventoryItems.filter(i => i.status === 'IN_STOCK');

  const startAddItem = (tradeId) => {
    setAddingItemFor({ tradeId, direction: 'out' });
    setAddItemForm({ inventory_id: '', card_value: '' });
  };

  const cancelAddItem = () => {
    setAddingItemFor(null);
    setAddItemForm({});
  };

  const submitAddItem = async () => {
    if (!addingItemFor) return;
    setSavingAddItem(true);
    try {
      await onAddTradeItem?.(addingItemFor.tradeId, {
        direction: 'out',
        inventory_id: addItemForm.inventory_id,
        card_value: parseFloat(addItemForm.card_value) || 0,
      });
      setAddingItemFor(null);
      setAddItemForm({});
    } finally {
      setSavingAddItem(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setRemovingItemId(itemId);
    try {
      await onRemoveTradeItem?.(itemId);
    } finally {
      setRemovingItemId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary - hide in compact mode */}
      {stats && !compact && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total Trades</div>
            <div className="text-xl font-bold text-purple-800 dark:text-purple-200">{stats.totalTrades}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">Trade-In Value</div>
            <div className="text-xl font-bold text-green-800 dark:text-green-200">${stats.totalTradeInValue.toFixed(2)}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Trade-Out Value</div>
            <div className="text-xl font-bold text-blue-800 dark:text-blue-200">${stats.totalTradeOutValue.toFixed(2)}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Cash Received</div>
            <div className="text-xl font-bold text-orange-800 dark:text-orange-200">${stats.totalCashIn.toFixed(2)}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Cash Paid Out</div>
            <div className="text-xl font-bold text-red-800 dark:text-red-200">${stats.totalCashOut.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Trades List */}
      <div className="space-y-3">
        {trades.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <ArrowLeftRight className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No trades recorded yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">Use the "Record Trade" button to add your first trade</p>
          </div>
        ) : (
          trades.map(trade => (
            <div key={trade.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {/* Trade Header */}
              <div 
                className="p-3 sm:p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
              >
                {/* Mobile-first layout */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {trade.customer_name || 'Anonymous'}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 sm:gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(trade.trade_date)}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400">@ {trade.trade_percentage}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditTradeMeta(trade); }}
                      className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(trade.id); }}
                      className="p-1.5 sm:p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedTrade === trade.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Values Row - responsive grid */}
                <div className="mt-2 sm:mt-3 grid grid-cols-3 gap-2 sm:gap-4 text-center sm:text-right">
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Trade-In</div>
                    <div className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">${parseFloat(trade.trade_in_value || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Trade-Out</div>
                    <div className="text-sm sm:text-base font-semibold text-blue-600 dark:text-blue-400">${parseFloat(trade.trade_out_total || 0).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Cash</div>
                    <div className="text-sm sm:text-base font-semibold">
                      {parseFloat(trade.cash_from_customer) > 0 ? (
                        <span className="text-green-600 dark:text-green-400">+${parseFloat(trade.cash_from_customer).toFixed(2)}</span>
                      ) : parseFloat(trade.cash_to_customer) > 0 ? (
                        <span className="text-red-600 dark:text-red-400">-${parseFloat(trade.cash_to_customer).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">$0</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTrade === trade.id && trade.items && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/50">
                  {editingTradeMeta === trade.id && (
                    <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Customer name
                          <input
                            type="text"
                            value={tradeMetaForm.customer_name}
                            onChange={(e) => setTradeMetaForm(prev => ({ ...prev, customer_name: e.target.value }))}
                            className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                          />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Trade date
                          <input
                            type="date"
                            value={tradeMetaForm.trade_date}
                            onChange={(e) => setTradeMetaForm(prev => ({ ...prev, trade_date: e.target.value }))}
                            className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                          />
                        </label>
                        <label className="text-xs text-slate-500 dark:text-slate-400">
                          Trade %
                          <input
                            inputMode="decimal"
                            value={tradeMetaForm.trade_percentage}
                            onChange={(e) => setTradeMetaForm(prev => ({ ...prev, trade_percentage: e.target.value }))}
                            className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs text-slate-500 dark:text-slate-400">
                            Cash from customer
                            <input
                              inputMode="decimal"
                              value={tradeMetaForm.cash_from_customer}
                              onChange={(e) => setTradeMetaForm(prev => ({ ...prev, cash_from_customer: e.target.value }))}
                              className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                            />
                          </label>
                          <label className="text-xs text-slate-500 dark:text-slate-400">
                            Cash to customer
                            <input
                              inputMode="decimal"
                              value={tradeMetaForm.cash_to_customer}
                              onChange={(e) => setTradeMetaForm(prev => ({ ...prev, cash_to_customer: e.target.value }))}
                              className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                            />
                          </label>
                        </div>
                      </div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block">
                        Notes
                        <textarea
                          value={tradeMetaForm.notes}
                          onChange={(e) => setTradeMetaForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          className="mt-0.5 w-full px-2 py-1 text-sm border rounded dark:bg-slate-700 dark:border-slate-600"
                        />
                      </label>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={cancelEditTradeMeta}
                          disabled={savingTradeMeta}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveTradeMeta(trade.id)}
                          disabled={savingTradeMeta}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {savingTradeMeta ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trade-In Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Cards Received (Trade-In)</h4>
                      <div className="space-y-1">
                        {trade.items.filter(i => i.direction === 'in').map((item, idx) => {
                          const isEditing = editingItem?.tradeId === trade.id && editingItem?.itemId === item.id;
                          return (
                            <div key={idx} className="flex flex-col gap-1 text-sm bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-900 dark:text-slate-100">{item.card_name} <span className="text-slate-400 dark:text-slate-500">({item.set_name})</span></span>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  disabled={removingItemId === item.id}
                                  className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 flex-shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400">Market:</span>
                                  {isEditing && editingItem?.field === 'card_value' ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">$</span>
                                      <input
                                        inputMode="decimal"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-20 px-1 py-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            onUpdateTradeItem?.(item.id, 'card_value', parseFloat(editValue) || 0);
                                            setEditingItem(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingItem(null);
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          onUpdateTradeItem?.(item.id, 'card_value', parseFloat(editValue) || 0);
                                          setEditingItem(null);
                                        }}
                                        className="p-0.5 text-green-600 hover:text-green-700"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItem(null)}
                                        className="p-0.5 text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                                      onClick={() => {
                                        setEditingItem({ tradeId: trade.id, itemId: item.id, field: 'card_value' });
                                        setEditValue(parseFloat(item.card_value || 0).toFixed(2));
                                      }}
                                    >
                                      ${parseFloat(item.card_value || 0).toFixed(2)}
                                      <Pencil className="w-3 h-3 opacity-50" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400">Credit:</span>
                                  {isEditing && editingItem?.field === 'trade_value' ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">$</span>
                                      <input
                                        inputMode="decimal"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-20 px-1 py-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            onUpdateTradeItem?.(item.id, 'trade_value', parseFloat(editValue) || 0);
                                            setEditingItem(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingItem(null);
                                          }
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          onUpdateTradeItem?.(item.id, 'trade_value', parseFloat(editValue) || 0);
                                          setEditingItem(null);
                                        }}
                                        className="p-0.5 text-green-600 hover:text-green-700"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItem(null)}
                                        className="p-0.5 text-red-600 hover:text-red-700"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className="font-medium text-green-600 dark:text-green-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                                      onClick={() => {
                                        setEditingItem({ tradeId: trade.id, itemId: item.id, field: 'trade_value' });
                                        setEditValue(parseFloat(item.trade_value || item.card_value || 0).toFixed(2));
                                      }}
                                    >
                                      ${parseFloat(item.trade_value || item.card_value || 0).toFixed(2)}
                                      <Pencil className="w-3 h-3 opacity-50" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {trade.items.filter(i => i.direction === 'in').length === 0 && (
                          <p className="text-slate-400 dark:text-slate-500 text-sm">No trade-in items</p>
                        )}

                        <button
                          onClick={() => setAddItemModalTrade(trade)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 border border-dashed border-green-300 dark:border-green-800 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add item
                        </button>
                      </div>
                    </div>

                    {/* Trade-Out Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Cards Given (Trade-Out)</h4>
                      <div className="space-y-1">
                        {trade.items.filter(i => i.direction === 'out').map((item, idx) => {
                          const isEditing = editingItem?.tradeId === trade.id && editingItem?.itemId === item.id && editingItem?.field === 'card_value';
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                              <span className="text-slate-900 dark:text-slate-100">{item.card_name} <span className="text-slate-400 dark:text-slate-500">({item.set_name})</span></span>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500">$</span>
                                  <input
                                    inputMode="decimal"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-20 px-1 py-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        onUpdateTradeItem?.(item.id, 'card_value', parseFloat(editValue) || 0);
                                        setEditingItem(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingItem(null);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      onUpdateTradeItem?.(item.id, 'card_value', parseFloat(editValue) || 0);
                                      setEditingItem(null);
                                    }}
                                    className="p-0.5 text-green-600 hover:text-green-700"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingItem(null)}
                                    className="p-0.5 text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                                  onClick={() => {
                                    setEditingItem({ tradeId: trade.id, itemId: item.id, field: 'card_value' });
                                    setEditValue(parseFloat(item.card_value || 0).toFixed(2));
                                  }}
                                >
                                  ${parseFloat(item.card_value || 0).toFixed(2)}
                                  <Pencil className="w-3 h-3 opacity-50" />
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={removingItemId === item.id}
                                className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {trade.items.filter(i => i.direction === 'out').length === 0 && (
                          <p className="text-slate-400 dark:text-slate-500 text-sm">No trade-out items</p>
                        )}

                        {addingItemFor?.tradeId === trade.id && addingItemFor?.direction === 'out' ? (
                          <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-200 dark:border-blue-800 space-y-1.5">
                            <select
                              value={addItemForm.inventory_id}
                              onChange={(e) => {
                                const invId = e.target.value;
                                const invItem = availableForTradeOut.find(i => String(i.id) === invId);
                                setAddItemForm(prev => ({
                                  ...prev,
                                  inventory_id: invId,
                                  card_value: invItem?.front_label_price ?? prev.card_value,
                                }));
                              }}
                              className="w-full px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                              autoFocus
                            >
                              <option value="">Select card from inventory…</option>
                              {availableForTradeOut.map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.card_name} ({i.set_name || 'no set'}) — ${parseFloat(i.front_label_price || 0).toFixed(2)}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Price $</span>
                              <input
                                inputMode="decimal"
                                value={addItemForm.card_value}
                                onChange={(e) => setAddItemForm(prev => ({ ...prev, card_value: e.target.value }))}
                                className="flex-1 px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={cancelAddItem} disabled={savingAddItem} className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50">Cancel</button>
                              <button
                                onClick={submitAddItem}
                                disabled={savingAddItem || !addItemForm.inventory_id}
                                className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingAddItem ? 'Adding…' : 'Add'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startAddItem(trade.id)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add item
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {trade.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Notes:</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{trade.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        type="delete"
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This will restore traded-out items to inventory and remove trade-in items."
      />

      {/* Add Trade-In Item Modal */}
      <AddTradeItemModal
        isOpen={addItemModalTrade !== null}
        trade={addItemModalTrade}
        onClose={() => setAddItemModalTrade(null)}
        onAdd={onAddTradeItem}
      />
    </div>
  );
}
