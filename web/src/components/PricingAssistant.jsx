import { useState, useEffect } from 'react';
import { X, ExternalLink, TrendingUp, DollarSign, RefreshCw, Check } from 'lucide-react';

export default function PricingAssistant({ isOpen, onClose, card, onSave }) {
  const [pricingData, setPricingData] = useState({
    marketPrice: '',
    lowPrice: '',
    midPrice: '',
    highPrice: '',
    sellingPrice: ''
  });
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (card) {
      // Pre-fill with current prices if available
      setPricingData({
        marketPrice: card.tcgplayer_market_price || '',
        lowPrice: card.tcgplayer_low_price || '',
        midPrice: card.tcgplayer_mid_price || '',
        highPrice: card.tcgplayer_high_price || '',
        sellingPrice: card.front_label_price || ''
      });
    }
  }, [card]);

  const generateTCGPlayerUrl = () => {
    const searchQuery = card.card_number 
      ? `${card.card_name} ${card.set_name} ${card.card_number}`
      : `${card.card_name} ${card.set_name}`;
    
    return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(searchQuery)}&page=1`;
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pricing/suggest/${card.barcode_id}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave(card.barcode_id, pricingData);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving pricing:', error);
    }
  };

  const applySuggestion = (suggestion) => {
    setPricingData(prev => ({
      ...prev,
      marketPrice: suggestion.suggestedMarketPrice,
      sellingPrice: suggestion.suggestedSellingPrice
    }));
  };

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pricing Assistant</h2>
            <p className="text-sm text-gray-500 mt-1">
              {card.card_name} - {card.set_name} {card.card_number && `#${card.card_number}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* TCGPlayer Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">TCGPlayer Research</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Check current market prices on TCGPlayer
                </p>
              </div>
              <a
                href={generateTCGPlayerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open TCGPlayer
              </a>
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">AI Suggestions</h3>
              <button
                onClick={fetchSuggestions}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Get Suggestions'}
              </button>
            </div>
            
            {suggestions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Based on {suggestions.basedOnCards} similar cards</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    suggestions.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    suggestions.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {suggestions.confidence} confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Market Price:</span>
                    <span className="ml-2 font-medium">${suggestions.suggestedMarketPrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Selling Price:</span>
                    <span className="ml-2 font-medium">${suggestions.suggestedSellingPrice}</span>
                  </div>
                </div>
                <button
                  onClick={() => applySuggestion(suggestions)}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Apply Suggestions
                </button>
              </div>
            )}
          </div>

          {/* Pricing Input */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">TCGPlayer Pricing Data</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Market Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricingData.marketPrice}
                    onChange={(e) => setPricingData(prev => ({ ...prev, marketPrice: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricingData.lowPrice}
                    onChange={(e) => setPricingData(prev => ({ ...prev, lowPrice: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mid Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricingData.midPrice}
                    onChange={(e) => setPricingData(prev => ({ ...prev, midPrice: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  High Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={pricingData.highPrice}
                    onChange={(e) => setPricingData(prev => ({ ...prev, highPrice: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Selling Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={pricingData.sellingPrice}
                  onChange={(e) => setPricingData(prev => ({ ...prev, sellingPrice: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                saved 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 inline mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Save Pricing
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
