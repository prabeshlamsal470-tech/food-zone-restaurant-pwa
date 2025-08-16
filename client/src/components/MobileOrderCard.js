import React from 'react';

const MobileOrderCard = ({ order, onClearTable, onCompleteOrder, formatDate, getTotalOrderValue }) => {
  const isDelivery = order.order_type === 'delivery';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-200 hover:shadow-md active:scale-98">
      {/* Order Header with Gradient */}
      <div className={`bg-gradient-to-r p-4 border-b border-gray-100 ${
        isDelivery 
          ? 'from-emerald-50 via-green-50 to-teal-50' 
          : 'from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
              isDelivery 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {isDelivery ? (
                <span className="text-white text-sm font-bold">🚚</span>
              ) : (
                <span className="text-white text-sm font-bold">{order.table_id}</span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">
                {isDelivery ? 'Delivery Order' : `Table ${order.table_id}`}
              </h3>
              <p className="text-xs text-gray-600 font-medium">{order.customer_name}</p>
              <p className="text-xs text-gray-500">📞 {order.customer_phone}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${
              isDelivery ? 'text-green-600' : 'text-orange-600'
            }`}>
              NPR {getTotalOrderValue(order.items, order.total)}/-
            </div>
            <p className="text-xs text-gray-500 font-medium">{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Delivery Address */}
        {isDelivery && order.delivery_address && (
          <div className="mb-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
            <p className="text-xs text-gray-600 mb-1 font-medium">📍 Delivery Address:</p>
            <p className="text-sm text-gray-800 leading-relaxed">{order.delivery_address}</p>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <span className="bg-white/80 backdrop-blur-sm text-blue-800 text-xs px-3 py-1.5 rounded-full font-semibold border border-blue-100">
              #{order.order_number || order.id}
            </span>
            <span className={`bg-white/80 backdrop-blur-sm text-xs px-3 py-1.5 rounded-full font-semibold border ${
              order.status === 'pending' 
                ? 'text-orange-800 border-orange-100' 
                : 'text-green-800 border-green-100'
            }`}>
              {order.status || 'pending'}
            </span>
            {order.items && (
              <span className="bg-white/80 backdrop-blur-sm text-purple-800 text-xs px-3 py-1.5 rounded-full font-semibold border border-purple-100">
                {order.items.length} items
              </span>
            )}
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => isDelivery ? onCompleteOrder?.(order.id) : onClearTable?.(order.table_id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all duration-200 transform active:scale-95 ${
              isDelivery 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' 
                : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700'
            }`}
          >
            {isDelivery ? '✅ Complete' : '🧹 Clear Table'}
          </button>
        </div>
      </div>

      {/* Order Items */}
      <div className="p-4">
        <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center">
          <span className="mr-2">🛒</span>
          Order Items
        </h4>
        <div className="space-y-3">
          {order.items?.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
                  {item.isCustom && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                      Custom
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600 font-medium">Qty: {item.quantity}</div>
                {!item.isCustom && (
                  <div className="text-sm font-bold text-gray-800">
                    NPR {(item.price * item.quantity)}/-
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileOrderCard;
