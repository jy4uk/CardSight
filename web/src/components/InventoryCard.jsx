import { useState, useRef, useEffect } from 'react';
import { Tag, Package, MoreVertical, DollarSign, Edit, Trash2, ImageIcon, CheckSquare, Square } from 'lucide-react';
import AlertModal from './AlertModal';
import CardDetailsModal from './CardDetailsModal';

const conditionColors = {
  'NM': 'bg-green-100 text-green-800',
  'LP': 'bg-blue-100 text-blue-800',
  'MP': 'bg-yellow-100 text-yellow-800',
  'HP': 'bg-orange-100 text-orange-800',
  'DMG': 'bg-red-100 text-red-800',
};

const gradeColors = {
  'psa': 'bg-red-600 text-white',
  'bgs': 'bg-black text-white',
  'cgc': 'bg-yellow-500 text-black',
};

const gameLabels = {
  'pokemon': 'PKM',
  'onepiece': 'OP',
  'mtg': 'MTG',
  'yugioh': 'YGO',
};

export default function InventoryCard({ item, onSelect, onSell, onEdit, onFetchImage, onDelete, isMultiSelectMode, isSelected, onToggleSelect, isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const menuRef = useRef(null);
  const condition = item.condition?.toUpperCase() || 'NM';
  const colorClass = conditionColors[condition] || 'bg-gray-100 text-gray-800';

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const handleCardClick = (e) => {
    if (isMultiSelectMode) {
      e.stopPropagation();
      onToggleSelect?.(item.id);
    } else {
      setShowCardModal(true);
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleSell = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onSell?.(item);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    onEdit?.(item);
  };

  const handleFetchImage = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setFetchingImage(true);
    try {
      await onFetchImage?.(item);
    } finally {
      setFetchingImage(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.(item);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden 
                   hover:shadow-md hover:border-blue-300 transition-all cursor-pointer
                   active:scale-[0.98] touch-manipulation relative
                   ${isMultiSelectMode && isSelected ? 'ring-2 ring-blue-500' : ''}`}
      >
      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-100 to-gray-200 relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.card_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Grading Badge (for slabs) */}
          {item.card_type && item.card_type !== 'raw' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[item.card_type] || 'bg-gray-600 text-white'}`}>
              {item.card_type.toUpperCase()} {item.grade ? item.grade + (item.grade_qualifier || '') : ''}
            </span>
          )}
                    {/* Condition Badge (for raw cards only) */}
          {(!item.card_type || item.card_type === 'raw') && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
              {condition}
            </span>
          )}
                    {/* Game Badge */}
          {item.game && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700 shadow-sm">
              {gameLabels[item.game] || item.game.toUpperCase()}
            </span>
          )}
        </div>

        {/* Multi-select Checkbox */}
        {isMultiSelectMode && (
          <div className="absolute top-2 left-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.(item.id);
              }}
              className="p-1 bg-white/90 hover:bg-white rounded-full shadow-md transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        )}

        {/* Ellipse Menu */}
        <div ref={menuRef} className="absolute top-1 right-1">
          <button
            onClick={handleMenuClick}
            className="p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-50">
              {onSell && (
                <button
                  onClick={handleSell}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600 font-medium"
                >
                  <DollarSign className="w-4 h-4" />
                  Sell
                </button>
              )}
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              )}
              {onFetchImage && !item.image_url && (
                <button
                  onClick={handleFetchImage}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                >
                  <ImageIcon className="w-4 h-4" />
                  Fetch Image
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
            {item.card_name}
          </h3>
          {item.card_number && (
            <p className="text-xs text-gray-500 mt-1">
              #{item.card_number}
            </p>
          )}
          {item.card_type && item.card_type !== 'raw' && item.cert_number && (
            <p className="text-xs text-gray-500 mt-1">
              {item.card_type.toUpperCase()} {item.cert_number}
            </p>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {item.set_name || 'Unknown Set'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-green-600">
            ${Number(item.front_label_price || 0).toFixed(2)}
          </span>
          <span className="flex items-center text-xs text-gray-400">
            <Tag className="w-3 h-3 mr-1" />
            {item.barcode_id?.slice(-6) || '------'}
          </span>
        </div>
      </div>
    </div>
    
    {/* Delete Modal - rendered as sibling */}
    {showDeleteModal && (
      <AlertModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        type="delete"
        message="Are you sure you want to delete this card from your inventory?"
        itemName={item.card_name}
      />
    )}
    
    {/* Card Details Modal */}
    <CardDetailsModal
      isOpen={showCardModal}
      onClose={() => setShowCardModal(false)}
      item={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onFetchImage={onFetchImage}
      onSell={onSell}
      isAdmin={isAdmin}
    />
    </>
  );
}
