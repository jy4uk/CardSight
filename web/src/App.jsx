import { useState, useEffect, useMemo } from 'react';
import { Plus, Package, RefreshCw, BarChart3, CheckSquare, Square, X, LogOut, Lock, ArrowLeftRight, Scan } from 'lucide-react';
import InventoryCard from './components/InventoryCard';
import AddItemModal from './components/AddItemModal';
import SellModal from './components/SellModal';
import SearchFilter from './components/SearchFilter';
import AlertModal from './components/AlertModal';
import Insights from './components/Insights';
import LoginPage from './components/LoginPage';
import LoginModal from './components/LoginModal';
import TradeModal from './components/modals/TradeModal';
import TradeHistory from './components/TradeHistory';
import PendingBarcodes from './components/PendingBarcodes';
import { useAuth, FEATURES } from './context/AuthContext';
import { fetchInventory, addInventoryItem, sellDirectly, initiateStripeSale, listReaders, processPayment, updateItemImage, updateInventoryItem, deleteInventoryItem, fetchTrades, createTrade, deleteTrade } from './api';

function App() {
  const { user, loading: authLoading, logout, hasFeature, isAdmin, showLoginModal, openLoginModal, closeLoginModal, login } = useAuth();

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render main app content (always show inventory, login is via modal)
  return (
    <>
      <AppContent 
        logout={logout} 
        hasFeature={hasFeature} 
        isAdmin={isAdmin} 
        user={user} 
        openLoginModal={openLoginModal}
      />
      {showLoginModal && (
        <LoginModal onClose={closeLoginModal} onLogin={login} />
      )}
    </>
  );
}

function AppContent({ logout, hasFeature, isAdmin, user, openLoginModal }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });
  const [currentView, setCurrentView] = useState('inventory'); // 'inventory', 'insights', or 'trades'
  const [filters, setFilters] = useState({ condition: null, minPrice: '', maxPrice: '', game: null, cardType: null });
  const [showFilters, setShowFilters] = useState(false);
  const [trades, setTrades] = useState([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradesSubView, setTradesSubView] = useState('history'); // 'history' or 'pending'

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInventory();
      setInventory(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async () => {
    try {
      const data = await fetchTrades();
      setTrades(data.trades || []);
    } catch (err) {
      console.error('Failed to load trades:', err);
    }
  };

  const handleCreateTrade = async (tradeData) => {
    try {
      await createTrade(tradeData);
      await loadTrades();
      await loadInventory(); // Refresh inventory to show new trade-in items and remove traded-out items
      showAlert('success', 'Trade completed successfully!');
    } catch (err) {
      showAlert('error', 'Failed to create trade: ' + err.message);
      throw err;
    }
  };

  const handleDeleteTrade = async (tradeId) => {
    try {
      await deleteTrade(tradeId);
      await loadTrades();
      await loadInventory(); // Refresh inventory to restore traded-out items
      showAlert('success', 'Trade deleted and inventory restored');
    } catch (err) {
      showAlert('error', 'Failed to delete trade: ' + err.message);
    }
  };

  useEffect(() => {
    loadInventory();
    loadTrades();
  }, []);

  const showAlert = (type, message) => {
    setAlertModal({ isOpen: true, type, message });
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map(item => item.id)));
    }
  };

  const bulkSell = () => {
    if (selectedItems.size === 0) return;
    // For now, just open sell modal with first selected item
    // TODO: Implement bulk sell modal
    const firstItem = filteredInventory.find(item => selectedItems.has(item.id));
    if (firstItem) {
      openSellModal(firstItem);
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
      try {
        for (const itemId of selectedItems) {
          await deleteInventoryItem(itemId);
        }
        setSelectedItems(new Set());
        loadInventory();
        showAlert('success', `Successfully deleted ${selectedItems.size} items`);
      } catch (err) {
        showAlert('error', 'Failed to delete items: ' + err.message);
      }
    }
  };

  const handleAddItem = async (item) => {
    try {
      await addInventoryItem(item);
      setShowAddModal(false);
      loadInventory();
    } catch (err) {
      showAlert('error', 'Failed to add item: ' + err.message);
    }
  };

  const openSellModal = (item) => {
    setSelectedItem(item);
    setShowSellModal(true);
  };

  const closeSellModal = () => {
    setShowSellModal(false);
    setSelectedItem(null);
    loadInventory();
  };

  const handleSell = async ({ item, salePrice, paymentMethod }) => {
    if (paymentMethod === 'stripe') {
      // Stripe Terminal flow
      const { paymentIntentId } = await initiateStripeSale(item.barcode_id, salePrice);
      
      // Get available readers
      const { readers } = await listReaders();
      if (!readers || readers.length === 0) {
        throw new Error('No card readers available. Please connect a reader in Stripe Dashboard.');
      }
      
      // Use the first available reader (in production, you might want to let user select)
      const reader = readers[0];
      
      // Process payment on the reader
      await processPayment(reader.id, paymentIntentId);
      
      // The webhook will handle marking the item as sold
      // Return to let the UI show "awaiting tap" state
      return;
    } else {
      // Direct sale (cash, venmo, zelle, cashapp)
      await sellDirectly(item.barcode_id, salePrice, paymentMethod);
    }
  };

  const handleFetchImage = async (item) => {
    try {
      const result = await updateItemImage(item.barcode_id);
      if (result.success) {
        loadInventory(); // Refresh to show the new image
      } else {
        showAlert('error', 'Could not find image for this card. Try checking the card name matches exactly.');
      }
    } catch (err) {
      showAlert('error', 'Failed to fetch image: ' + err.message);
    }
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setShowAddModal(true);
  };

  const handleEditItem = async (data) => {
    try {
      const { id, ...updateData } = data;
      await updateInventoryItem(id, updateData);
      setShowAddModal(false);
      setEditItem(null);
      loadInventory();
    } catch (err) {
      showAlert('error', 'Failed to update item: ' + err.message);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditItem(null);
  };

  const handleDeleteItem = async (item) => {
    try {
      await deleteInventoryItem(item.id);
      loadInventory();
    } catch (err) {
      showAlert('error', 'Failed to delete item: ' + err.message);
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Only show available items
      if (item.status === 'SOLD') return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.card_name?.toLowerCase().includes(query);
        const matchesSet = item.set_name?.toLowerCase().includes(query);
        const matchesBarcode = item.barcode_id?.toLowerCase().includes(query);
        if (!matchesName && !matchesSet && !matchesBarcode) return false;
      }

      // Condition filter
      if (filters.condition && item.condition?.toUpperCase() !== filters.condition) {
        return false;
      }

      // Game filter
      if (filters.game && item.game !== filters.game) {
        return false;
      }

      // Card type filter
      if (filters.cardType && item.card_type !== filters.cardType) {
        return false;
      }

      // Price filters
      const price = Number(item.front_label_price) || 0;
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;

      return true;
    });
  }, [inventory, searchQuery, filters]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-7 h-7 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Card Pilot</h1>
                {isAdmin() && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Admin
                  </span>
                )}
                {!isAdmin() && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Guest
                  </span>
                )}
              </div>
              
              {/* Navigation Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setCurrentView('inventory')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'inventory'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Inventory
                </button>
                {hasFeature(FEATURES.VIEW_INSIGHTS) && (
                  <>
                    <button
                      onClick={() => setCurrentView('trades')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        currentView === 'trades'
                          ? 'bg-white text-purple-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Trades
                    </button>
                    <button
                      onClick={() => setCurrentView('insights')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        currentView === 'insights'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Insights
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {currentView === 'inventory' && (
                <>
                  <button
                    onClick={loadInventory}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  {hasFeature(FEATURES.ADD_ITEM) && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white 
                                 font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Add Item</span>
                    </button>
                  )}
                  {hasFeature(FEATURES.BULK_ACTIONS) && (
                    <button
                      onClick={toggleMultiSelectMode}
                      className={`flex items-center gap-1.5 px-4 py-2 font-semibold rounded-lg transition-colors ${
                        isMultiSelectMode 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <CheckSquare className="w-5 h-5" />
                      <span className="hidden sm:inline">Multi-Select</span>
                    </button>
                  )}
                </>
              )}
              {/* Admin Login / Logout Button */}
              {isAdmin() ? (
                <button
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  title="Admin Login"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'inventory' ? (
        <main className="max-w-7xl mx-auto px-4 py-4">
          {/* Search & Filters */}
          <div className="mb-4">
            <SearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filters={filters}
              onFilterChange={setFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
        </div>

        {/* Results Count */}
        <div className="mb-3 text-sm text-gray-500">
          {filteredInventory.length} {filteredInventory.length === 1 ? 'card' : 'cards'} available
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && inventory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mb-3" />
            <p>Loading inventory...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredInventory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Package className="w-12 h-12 mb-3 text-gray-300" />
            <p className="font-medium">No cards found</p>
            <p className="text-sm">
              {inventory.length === 0 
                ? 'Add your first card to get started' 
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        )}

        {/* Multi-select Toolbar */}
        {isMultiSelectMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedItems.size} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {selectedItems.size === filteredInventory.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={bulkSell}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                >
                  Sell Selected
                </button>
                <button
                  onClick={bulkDelete}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={toggleMultiSelectMode}
                  className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredInventory.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onSelect={(item) => console.log('Selected:', item)}
              onSell={hasFeature(FEATURES.SELL_ITEM) ? openSellModal : null}
              onEdit={hasFeature(FEATURES.EDIT_ITEM) ? openEditModal : null}
              onFetchImage={hasFeature(FEATURES.EDIT_ITEM) ? handleFetchImage : null}
              onDelete={hasFeature(FEATURES.DELETE_ITEM) ? handleDeleteItem : null}
              isMultiSelectMode={isMultiSelectMode}
              isSelected={selectedItems.has(item.id)}
              onToggleSelect={toggleItemSelection}
            />
          ))}
        </div>
      </main>
      ) : currentView === 'trades' ? (
        <main className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Trades</h2>
              {/* Sub-tabs for trades */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setTradesSubView('history')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tradesSubView === 'history'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setTradesSubView('pending')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                    tradesSubView === 'pending'
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Scan className="w-4 h-4" />
                  Scan Pending
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowTradeModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeftRight className="w-5 h-5" />
              Record Trade
            </button>
          </div>
          
          {tradesSubView === 'history' ? (
            <TradeHistory 
              trades={trades} 
              onDelete={handleDeleteTrade}
              onRefresh={loadTrades}
            />
          ) : (
            <PendingBarcodes onComplete={loadInventory} />
          )}
        </main>
      ) : (
        <Insights />
      )}

      {/* Trade Modal */}
      <TradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        onSubmit={handleCreateTrade}
        inventoryItems={inventory}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        onAdd={handleAddItem}
        editItem={editItem}
        onEdit={handleEditItem}
      />

      {/* Sell Modal */}
      <SellModal
        isOpen={showSellModal}
        item={selectedItem}
        onClose={closeSellModal}
        onSell={handleSell}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, type: 'error', message: '' })}
        type={alertModal.type}
        message={alertModal.message}
        showCancel={false}
      />
    </div>
  );
}

export default App
