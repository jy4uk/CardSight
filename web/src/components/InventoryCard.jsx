import { useState, useRef, useEffect } from 'react';
import { Tag, Package, MoreVertical, DollarSign, Edit, Trash2, ImageIcon, CheckSquare, Square } from 'lucide-react';
import AlertModal from './AlertModal';
import CardDetailsModal from './CardDetailsModal';

const conditionColors = {
  'NM': 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  'LP': 'bg-sky-50 text-sky-700 border-sky-200/60',
  'MP': 'bg-amber-50 text-amber-700 border-amber-200/60',
  'HP': 'bg-orange-50 text-orange-700 border-orange-200/60',
  'DMG': 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const gradeColors = {
  'psa': 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
  'bgs': 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-sm shadow-slate-800/30',
  'cgc': 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-sm shadow-amber-400/30',
};

const gameLabels = {
  'pokemon': 'PKM',
  'onepiece': 'OP',
  'mtg': 'MTG',
  'yugioh': 'YGO',
};

export default function InventoryCard({ item, onSelect, onSell, onEdit, onFetchImage, onDelete, isMultiSelectMode, isSelected, onToggleSelect, isAuthenticated = false }) {
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
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden 
                   hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-pointer
                   active:scale-[0.98] touch-manipulation relative
                   ${isMultiSelectMode && isSelected ? 'ring-2 ring-indigo-500' : ''}`}
      >
      {/* Card Image */}
      <div className="aspect-[2.5/3.5] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.card_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-400 dark:text-slate-600" />
          </div>
        )}
        
        {/* Top Left Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Grading Badge (for slabs) */}
          {item.card_type && item.card_type !== 'raw' && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[item.card_type] || 'bg-slate-600 text-white'}`}>
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
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 shadow-sm">
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
              className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-md transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {isSelected ? (
                <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              )}
            </button>
          </div>
        )}

        {/* Ellipse Menu - Only show for authenticated users */}
        {isAuthenticated && (
        <div ref={menuRef} className="absolute top-1 right-1">
          <button
            onClick={handleMenuClick}
            className="p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 rounded-full shadow-sm transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 min-w-[140px] z-50">
              {onSell && (
                <button
                  onClick={handleSell}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-medium min-h-[44px]"
                >
                  <DollarSign className="w-5 h-5" />
                  Sell
                </button>
              )}
              {onEdit && (
                <button
                  onClick={handleEdit}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-300 min-h-[44px]"
                >
                  <Edit className="w-5 h-5" />
                  Edit
                </button>
              )}
              {onFetchImage && !item.image_url && (
                <button
                  onClick={handleFetchImage}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-indigo-600 dark:text-indigo-400 min-h-[44px]"
                >
                  <ImageIcon className="w-5 h-5" />
                  Fetch Image
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-rose-600 dark:text-rose-400 min-h-[44px]"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
            {item.card_name}
          </h3>
          {item.card_number && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              #{item.card_number}
            </p>
          )}
          {item.card_type && item.card_type !== 'raw' && item.cert_number && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {item.card_type.toUpperCase()} {item.cert_number}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          {item.set_name || 'Unknown Set'}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            ${Number(item.front_label_price || 0).toFixed(2)}
          </span>
          <span className="flex items-center text-xs text-slate-400 dark:text-slate-500">
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
    />
    </>
  );
}
