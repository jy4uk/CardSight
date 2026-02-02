import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Package, RefreshCw, BarChart3, CheckSquare, Square, X, LogOut, Lock, ArrowLeftRight, Scan, Menu, ArrowUpDown, FileText, ShoppingCart, Sun, Moon } from 'lucide-react';
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
import IntakePage from './components/IntakePage';
import PendingBarcodes from './components/PendingBarcodes';
import BarcodeGeneratorPage from './components/BarcodeGeneratorPage';
import CartDrawer from './components/CartDrawer';
import MobileBottomNav from './components/MobileBottomNav';
import { useAuth, FEATURES } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useTheme } from './context/ThemeContext';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { fetchInventory, addInventoryItem, sellDirectly, initiateStripeSale, listReaders, processPayment, updateItemImage, updateInventoryItem, deleteInventoryItem, fetchTrades, createTrade, deleteTrade, fetchInventoryByBarcode } from './api';

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

function AppContent({ logout, hasFeature, isAdmin, openLoginModal }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'error', message: '' });
  const [currentView, setCurrentView] = useState('inventory'); // 'inventory', 'insights', 'intake', or 'barcodes'
  const [filters, setFilters] = useState({ condition: null, minPrice: '', maxPrice: '', game: null, cardType: null });
  const [showFilters, setShowFilters] = useState(false);
  const [trades, setTrades] = useState([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [inventorySubView, setInventorySubView] = useState('grid'); // 'grid' or 'pending'
  const [inventorySort, setInventorySort] = useState('price_high'); // 'newest', 'oldest', 'price_high', 'price_low'

  // Cart system
  const { addToCart, setError: setCartError, cartCount, setIsCartOpen } = useCart();
  
  // Theme system
  const { theme, toggleTheme, isDark } = useTheme();

  // Handle barcode scan - fetch item and add to cart
  const handleBarcodeScan = useCallback(async (barcode) => {
    try {
      const response = await fetchInventoryByBarcode(barcode);
      if (response.success && response.item) {
        addToCart(response.item);
        // Play success sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleE8YUqTmxm0zHk2h4cdbNUQAAABhT05/lpuXe1pdcIynsqSOZj8nOmacyNW1fkINCFCn4ddzPB8jSp/hxG8rGDaCrbnB3sRMLA0Naq7Q5Ng=');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {}
      } else {
        setCartError(`Barcode not found: ${barcode}`);
      }
    } catch (err) {
      setCartError(`Barcode not found: ${barcode}`);
    }
  }, [addToCart, setCartError]);

  // Global barcode scanner listener
  useBarcodeScanner(handleBarcodeScan, { enabled: true });

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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

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

  const bulkAddToCart = () => {
    if (selectedItems.size === 0) return;
    // Add all selected items to cart
    const itemsToAdd = filteredInventory.filter(item => selectedItems.has(item.id));
    itemsToAdd.forEach(item => {
      addToCart(item);
    });
    setSelectedItems(new Set());
    setMultiSelectMode(false);
    showAlert('success', `Added ${itemsToAdd.length} items to cart`);
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
      // TEMPORARILY: Process credit card like cash (manual collection)
      // Treat as direct sale - trusting manual credit card collection
      await sellDirectly(item.barcode_id, salePrice, 'credit_card');
      
      /* STRIPE TERMINAL CODE - COMMENTED OUT FOR FUTURE USE
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
      */
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
    const filtered = inventory.filter((item) => {
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

    // Sort the filtered results
    return filtered.sort((a, b) => {
      switch (inventorySort) {
        case 'price_high':
          return (Number(b.front_label_price) || 0) - (Number(a.front_label_price) || 0);
        case 'price_low':
          return (Number(a.front_label_price) || 0) - (Number(b.front_label_price) || 0);
        case 'oldest':
          return new Date(a.purchase_date || 0) - new Date(b.purchase_date || 0);
        case 'newest':
        default:
          return new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0);
      }
    });
  }, [inventory, searchQuery, filters, inventorySort]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 pb-20 sm:pb-0 transition-colors duration-300">
      {/* Header - Premium Glassmorphism */}
      <header className="glass dark:border-slate-700/60 border-b border-slate-200/60 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Logo & Brand */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Card Pilot</h1>
                {isAdmin() && (
                  <span className="badge-premium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50">
                    Admin
                  </span>
                )}
                {!isAdmin() && (
                  <span className="badge-premium bg-slate-100 text-slate-600 border border-slate-200/50">
                    Guest
                  </span>
                )}
              </div>
              
              {/* Navigation Tabs - Pill Style */}
              <div className="hidden sm:flex gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => setCurrentView('inventory')}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                    currentView === 'inventory'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Package className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">Inventory</span>
                  <span className="sm:hidden">Inv</span>
                </button>
                {hasFeature(FEATURES.VIEW_INSIGHTS) && (
                  <>
                    <button
                      onClick={() => setCurrentView('intake')}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        currentView === 'intake'
                          ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Intake</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('insights')}
                      className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        currentView === 'insights'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Insights</span>
                    </button>
                  </>
                )}
                {/* Admin-only barcode generator */}
                {isAdmin() && (
                  <button
                    onClick={() => setCurrentView('barcodes')}
                    className={`px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                      currentView === 'barcodes'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Barcodes</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                ) : (
                  <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                )}
              </button>
            </div>

            {/* Desktop / Tablet Actions */}
            <div className="hidden sm:flex items-center gap-2">
              {currentView === 'inventory' && (
                <>
                  <button
                    onClick={loadInventory}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  {hasFeature(FEATURES.BULK_ACTIONS) && (
                    <button
                      onClick={toggleMultiSelectMode}
                      className={`flex items-center gap-1.5 px-4 py-2 font-semibold rounded-lg transition-colors ${
                        isMultiSelectMode 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    >
                      <CheckSquare className="w-5 h-5" />
                      <span className="hidden sm:inline">Multi-Select</span>
                    </button>
                  )}
                </>
              )}
              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
              {/* Admin Login / Logout Button */}
              {isAdmin() ? (
                <button
                  onClick={logout}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:text-rose-600"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Admin Login"
                >
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Overlay + Panel */}
          {mobileMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 top-16 bg-black/10 z-40 sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu overlay"
              />
              <div className="sm:hidden absolute left-0 right-0 top-16 bg-white border-b border-gray-200 shadow-lg z-50">
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setCurrentView('inventory');
                        setMobileMenuOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        currentView === 'inventory'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      Inventory
                    </button>
                    {hasFeature(FEATURES.VIEW_INSIGHTS) ? (
                      <>
                        <button
                          onClick={() => {
                            setCurrentView('intake');
                            setMobileMenuOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            currentView === 'intake'
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          Intake
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView('insights');
                            setMobileMenuOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            currentView === 'insights'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700'
                          }`}
                        >
                          Insights
                        </button>
                        {isAdmin() && (
                          <button
                            onClick={() => {
                              setCurrentView('barcodes');
                              setMobileMenuOpen(false);
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              currentView === 'barcodes'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            Barcodes
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2" />
                    )}
                  </div>

                  {currentView === 'inventory' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          loadInventory();
                          setMobileMenuOpen(false);
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      {hasFeature(FEATURES.BULK_ACTIONS) && (
                        <button
                          onClick={() => {
                            toggleMultiSelectMode();
                            setMobileMenuOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                            isMultiSelectMode
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <CheckSquare className="w-4 h-4" />
                          {isMultiSelectMode ? 'Exit Multi-Select' : 'Multi-Select'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3">
                    {isAdmin() ? (
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          openLoginModal();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Admin Login
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
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

              {/* Results Count & Sort */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {filteredInventory.length} {filteredInventory.length === 1 ? 'card' : 'cards'} available
                </span>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <select
                    value={inventorySort}
                    onChange={(e) => setInventorySort(e.target.value)}
                    className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="price_low">Price: Low to High</option>
                  </select>
                </div>
              </div>

        {/* Error State */}
              {error && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl mb-4">
                  {error}
                </div>
              )}

              {/* Loading State */}
              {loading && inventory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                  <p>Loading inventory...</p>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredInventory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                  <Package className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
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
                <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                        {selectedItems.size} selected
                      </span>
                      <button
                        onClick={selectAll}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                      >
                        {selectedItems.size === filteredInventory.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={bulkAddToCart}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={bulkDelete}
                        className="px-3 py-1.5 bg-rose-600 text-white text-sm font-medium rounded hover:bg-rose-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={toggleMultiSelectMode}
                        className="px-3 py-1.5 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700 transition-colors"
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
                    isAdmin={isAdmin()}
                  />
                ))}
              </div>
        </main>
      ) : currentView === 'intake' ? (
        <IntakePage
          trades={trades}
          inventoryItems={inventory}
          onOpenTradeModal={() => setShowTradeModal(true)}
          onDeleteTrade={handleDeleteTrade}
          onRefreshTrades={loadTrades}
          onPurchaseComplete={loadInventory}
        />
      ) : currentView === 'insights' ? (
        <Insights />
      ) : currentView === 'barcodes' && isAdmin() ? (
        <BarcodeGeneratorPage />
      ) : null}

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
        inventoryItems={inventory}
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

      {/* Shopping Cart Drawer */}
      <CartDrawer onCheckoutComplete={loadInventory} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={setCurrentView}
        hasInsightsFeature={hasFeature(FEATURES.VIEW_INSIGHTS)}
      />
    </div>
  );
}

export default App
