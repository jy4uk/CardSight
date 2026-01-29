import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, BarChart3, Calendar, Filter, Clock, MapPin, Plus, ArrowLeftRight } from 'lucide-react';
import { fetchInsights, addCardShow, deleteCardShow } from '../api';
import SalesDetailsModal from './modals/SalesDetailsModal';
import InventoryBreakdownModal from './modals/InventoryBreakdownModal';
import InventoryTypeModal from './modals/InventoryTypeModal';
import SalesHistoryModal from './modals/SalesHistoryModal';
import CardShowDetailsModal from './modals/CardShowDetailsModal';
import AddCardShowModal from './AddCardShowModal';
import InventoryValueModal from './modals/InventoryValueModal';

export default function Insights() {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalInventory: 0,
    totalValue: 0,
    itemsSold: 0,
    itemsTraded: 0,
    totalRevenue: 0,
    totalProfit: 0,
    profitMargin: 0,
    avgSalePrice: 0,
    avgTradePrice: 0,
    avgTimeInInventory: 0,
    gameDistribution: [],
    inventoryTypeBreakdown: [],
    recentTransactions: [],
    cardShows: []
  });
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const [showAddCardShowModal, setShowAddCardShowModal] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await fetchInsights(timeRange);
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
      // Fallback to mock data
      setMetrics({
        totalInventory: 0,
        totalValue: 0,
        itemsSold: 0,
        itemsTraded: 0,
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0,
        avgSalePrice: 0,
        avgTradePrice: 0,
        avgTimeInInventory: 0,
        gameDistribution: [],
        inventoryTypeBreakdown: [],
        recentTransactions: [],
        inventoryValueByDate: [],
        inventoryValueByCard: [],
        cardShows: []
      });
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, data) => {
    setModalState({ isOpen: true, type, data: data || null });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, data: null });
  };

  const handleAddCardShow = async (cardShowData) => {
    try {
      await addCardShow(cardShowData);
      // Reload insights to show the new card show
      loadInsights();
    } catch (error) {
      console.error('Error adding card show:', error);
      throw error;
    }
  };

  const handleDeleteCardShow = async (showId) => {
    try {
      await deleteCardShow(showId);
      // Reload insights to refresh the card shows list
      loadInsights();
    } catch (error) {
      console.error('Error deleting card show:', error);
      throw error;
    }
  };

  const MetricCard = ({ title, value, icon: Icon, trend, color = 'blue', modalType, modalData }) => {
    const colorClasses = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' }
    };
    const classes = colorClasses[color] || colorClasses.blue;

    return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${modalType ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={() => modalType && openModal(modalType, modalData)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 ${classes.bg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${classes.text}`} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
        {modalType && (
          <div className="text-xs text-gray-400">Click to view details</div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Business Insights</h1>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Inventory"
            value={metrics.totalInventory.toLocaleString()}
            icon={Package}
            trend={5.2}
            color="blue"
            modalType="inventoryDistribution"
            modalData={metrics.gameDistribution}
          />
          <MetricCard
            title="Total Inventory Value"
            value={`$${metrics.totalValue.toLocaleString()}`}
            icon={DollarSign}
            trend={12.3}
            color="green"
            modalType="inventoryValue"
            modalData={metrics}
          />
          <MetricCard
            title="Items Sold"
            value={metrics.itemsSold.toLocaleString()}
            icon={TrendingUp}
            trend={8.7}
            color="purple"
            modalType="itemsSold"
            modalData={metrics.recentTransactions}
          />
          <MetricCard
            title="Items Traded"
            value={metrics.itemsTraded.toLocaleString()}
            icon={ArrowLeftRight}
            trend={5.4}
            color="orange"
            modalType="itemsTraded"
            modalData={metrics.recentTransactions}
          />
          <MetricCard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={15.2}
            color="green"
          />
          <MetricCard
            title="Profit Margin"
            value={`${metrics.profitMargin}%`}
            icon={BarChart3}
            trend={2.1}
            color="blue"
          />
          <MetricCard
            title="Avg Sale Price"
            value={`$${metrics.avgSalePrice.toFixed(2)}`}
            icon={TrendingUp}
            trend={-3.4}
            color="orange"
            modalType="avgPriceBreakdown"
            modalData={{
              avgSalePrice: metrics.avgSalePrice,
              avgTradePrice: metrics.avgTradePrice,
              recentTransactions: metrics.recentTransactions
            }}
          />
          <MetricCard
            title="Avg Time in Inventory"
            value={`${Math.max(0, metrics.avgTimeInInventory).toFixed(1)} days`}
            icon={Clock}
            trend={2.8}
            color="purple"
          />
          <MetricCard
            title="Inventory Types"
            value={metrics.inventoryTypeBreakdown?.length || 0}
            icon={Package}
            trend={3.1}
            color="indigo"
            modalType="inventoryTypeBreakdown"
            modalData={metrics.inventoryTypeBreakdown}
          />
          <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => openModal('cardShows', metrics.cardShows)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-orange-100 rounded-lg">
          <MapPin className="w-5 h-5 text-orange-600" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAddCardShowModal(true);
          }}
          className="p-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          title="Add Card Show"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {metrics.cardShows?.length || 0}
      </div>
      <div className="text-sm text-gray-500">Card Shows</div>
      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
        <span>+1.2%</span>
      </div>
    </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Chart */}
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openModal('salesTrend', metrics.salesTrend)}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <BarChart3 className="w-12 h-12" />
              <p className="ml-2">Click to view details</p>
            </div>
          </div>

          {/* Inventory Distribution */}
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openModal('inventoryDistribution', metrics.gameDistribution)}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Game</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <Package className="w-12 h-12" />
              <p className="ml-2">Click to view details</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {metrics.recentTransactions?.length > 0 ? (
              metrics.recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{transaction.cardName}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        transaction.transactionType === 'sale' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {transaction.transactionType === 'sale' ? 'Sale' : 'Trade'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {transaction.setName} • {new Date(transaction.date).toLocaleDateString()}
                      {transaction.transactionType === 'trade' && transaction.customerName && ` • ${transaction.customerName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.transactionType === 'sale' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      ${transaction.value.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.transactionType === 'sale' ? 'Profit' : 'Value'}: ${Math.abs(transaction.profit).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalState.type === 'itemsSold' && (
        <SalesDetailsModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={(modalState.data || []).filter(t => t.transactionType === 'sale')}
          title="Items Sold Details"
          timeRange={timeRange}
        />
      )}
      {modalState.type === 'itemsTraded' && (
        <SalesDetailsModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={(modalState.data || []).filter(t => t.transactionType === 'trade')}
          title="Items Traded Details"
          timeRange={timeRange}
        />
      )}
      {modalState.type === 'inventoryDistribution' && (
        <InventoryBreakdownModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={modalState.data}
        />
      )}
      {modalState.type === 'inventoryTypeBreakdown' && (
        <InventoryTypeModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={modalState.data}
        />
      )}
      {modalState.type === 'salesTrend' && (
        <SalesHistoryModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={modalState.data}
        />
      )}
      {modalState.type === 'inventoryValue' && (
        <InventoryValueModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={modalState.data}
        />
      )}
      {modalState.type === 'avgPriceBreakdown' && (
        <SalesHistoryModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          data={modalState.data}
          title="Average Price Breakdown"
          showPriceComparison={true}
        />
      )}
      {modalState.type === 'cardShows' && (
        <CardShowDetailsModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ isOpen: false, type: null, data: null })}
          cardShows={modalState.data}
          recentSales={(metrics.recentTransactions || []).filter(t => t.transactionType === 'sale')}
          onDeleteShow={handleDeleteCardShow}
        />
      )}
      <AddCardShowModal
        isOpen={showAddCardShowModal}
        onClose={() => setShowAddCardShowModal(false)}
        onAdd={handleAddCardShow}
      />
    </div>
  );
}
