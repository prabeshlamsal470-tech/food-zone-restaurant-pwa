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
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
      {/* Food Image */}
      {item.image && (
        <div className="h-48 overflow-hidden">
          <LazyImage
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            placeholder="/images/placeholder-food.jpg"
          />
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{item.name}</h3>
            {item.description && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{item.description}</p>}
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full shadow-md">
              <span className="text-lg font-bold">NPR {item.price}</span>
            </div>
          </div>
        </div>
        
        {quantity === 0 ? (
          <button
            onClick={() => onAddToCart(item)}
            className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg ${
              isTableCustomer 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600' 
                : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600'
            }`}
          >
            {isTableCustomer ? `🍽️ Add to Table ${currentTable}` : '🚚 Add for Delivery'}
          </button>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                className="bg-white text-gray-700 w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
              >
                −
              </button>
              <span className="font-bold text-xl w-8 text-center text-gray-800">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                className={`w-10 h-10 rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg ${
                  isTableCustomer 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                +
              </button>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 font-medium">Total</div>
              <div className="text-lg font-bold text-gray-800">NPR {(item.price * quantity)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
