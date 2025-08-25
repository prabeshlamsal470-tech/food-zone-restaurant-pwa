import React, { memo } from 'react';
import LazyImage from './LazyImage';

const MenuItemCard = memo(({ 
  item, 
  quantity, 
  onAddToCart, 
  onUpdateQuantity, 
  isTableCustomer, 
  currentTable 
}) => {
  return (
    <div className="bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden">
      {/* Food Image */}
      {item.image && (
        <div className="h-48 overflow-hidden">
          <LazyImage
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            placeholder="/images/placeholder-food.jpg"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.name}</h3>
            {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}
          </div>
          <div className="ml-3 flex-shrink-0">
            <div className="bg-blue-600 text-white px-3 py-1 rounded">
              <span className="text-sm font-medium">NPR {item.price}</span>
            </div>
          </div>
        </div>
        
        {quantity === 0 ? (
          <button
            onClick={() => {
              onAddToCart(item);
              // Don't redirect - just add to cart and stay on menu page
            }}
            className="w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            {isTableCustomer ? `🍽️ Add to Table ${currentTable}` : '🚚 Add for Delivery'}
          </button>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 rounded p-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                className="bg-white text-gray-700 w-8 h-8 rounded hover:bg-gray-100 transition-colors font-medium"
              >
                −
              </button>
              <span className="font-medium text-lg w-6 text-center text-gray-800">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                className="w-8 h-8 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
              >
                +
              </button>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-sm font-medium text-gray-800">NPR {(item.price * quantity)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
