import React from 'react';

const OrderCard = ({ 
  order, 
  type = 'dine-in', 
  onComplete, 
  onClear, 
  onDelete,
  onLocationClick 
}) => {
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getTotalOrderValue = (items, fallbackTotal) => {
    if (!items || items.length === 0) return fallbackTotal || 0;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const borderColor = type === 'delivery' ? 'border-l-green-500' : 'border-l-orange-500';
  const headerColor = type === 'delivery' ? 'text-green-700' : 'text-orange-700';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${borderColor} border-l-4 hover:shadow-md transition-all duration-200 overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`text-xl font-semibold ${headerColor} flex items-center gap-2`}>
                {type === 'delivery' ? (
                  <>
                    <span className="text-2xl">🚚</span>
                    Delivery Order
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🍽️</span>
                    Table {order.table_id}
                  </>
                )}
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                {order.status || 'Pending'}
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <span className="font-medium">{order.customer_name}</span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-base">📞</span>
                  {order.customer_phone}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-sm">🕒</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
            </div>

            {/* Delivery specific info */}
            {type === 'delivery' && (
              <div className="mt-3 space-y-2">
                {order.delivery_address && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-base mt-0.5">📍</span>
                    <div className="flex-1">
                      <p className="text-gray-700">{order.delivery_address}</p>
                      {(order.latitude && order.longitude) && (
                        <button
                          onClick={() => onLocationClick?.(order.latitude, order.longitude)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                        >
                          <span>🗺️</span>
                          View on Maps
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {order.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-base mt-0.5">📝</span>
                    <p className="text-gray-600 italic">{order.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order total and actions */}
          <div className="text-right ml-6">
            <div className={`text-3xl font-bold mb-3 ${type === 'delivery' ? 'text-green-600' : 'text-orange-600'}`}>
              NPR {getTotalOrderValue(order.items, order.total)}/-
            </div>
            
            <div className="space-y-2">
              {type === 'delivery' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => onComplete?.(order.id)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    ✅ Mark Complete
                  </button>
                  <button
                    onClick={() => onDelete?.(order.id, order.order_number || order.id)}
                    className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    🗑️ Delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onClear?.(order.table_id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  🧹 Clear Table
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            <span>📋</span>
            Order #{order.order_number || order.id}
          </span>
          
          {order.items && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
              <span>🛒</span>
              {order.items.length} Items
            </span>
          )}
          
          {order.delivery_fee && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              <span>🚚</span>
              Delivery: NPR {order.delivery_fee}/-
            </span>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>📦</span>
            Order Items
          </h4>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm font-medium text-gray-600 shadow-sm">
                    {item.quantity}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    {item.isCustom && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Custom
                      </span>
                    )}
                  </div>
                </div>
                
                {!item.isCustom && (
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      NPR {(item.price * item.quantity)}/-
                    </div>
                    <div className="text-xs text-gray-500">
                      NPR {item.price}/- each
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
