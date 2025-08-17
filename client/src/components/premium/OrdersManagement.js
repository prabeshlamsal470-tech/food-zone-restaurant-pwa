import React, { useState } from 'react';

const OrdersManagement = ({ orders, onClearTable, onCompleteOrder, onDeleteOrder }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filterOrders = (orders) => {
    let filtered = orders;

    // Filter by status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (activeFilter === 'active') {
          return order.status !== 'completed' && order.status !== 'cancelled';
        }
        return order.status === activeFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.includes(searchTerm) ||
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredOrders = filterOrders(orders);
  const dineInOrders = filteredOrders.filter(o => o.order_type === 'dine-in');
  const deliveryOrders = filteredOrders.filter(o => o.order_type === 'delivery');

  const filters = [
    { id: 'all', label: 'All Orders', count: filteredOrders.length },
    { id: 'active', label: 'Active', count: filteredOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length },
    { id: 'pending', label: 'Pending', count: filteredOrders.filter(o => o.status === 'pending').length },
    { id: 'preparing', label: 'Preparing', count: filteredOrders.filter(o => o.status === 'preparing').length },
    { id: 'completed', label: 'Completed', count: filteredOrders.filter(o => o.status === 'completed').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Order Management</h2>
            <p className="text-slate-600 mt-1">{filteredOrders.length} orders found</p>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mt-6">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter.label}
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                activeFilter === filter.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Dine-in Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">🍽️ Dine-in Orders</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {dineInOrders.length}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {dineInOrders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block opacity-50">🪑</span>
                <p className="text-slate-500 text-lg">No dine-in orders found</p>
              </div>
            ) : (
              dineInOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="dine-in"
                  onClearTable={onClearTable}
                  onCompleteOrder={onCompleteOrder}
                  onDeleteOrder={onDeleteOrder}
                />
              ))
            )}
          </div>
        </div>

        {/* Delivery Orders */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">🚚 Delivery Orders</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {deliveryOrders.length}
              </span>
            </div>
          </div>
          
          <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
            {deliveryOrders.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block opacity-50">🚚</span>
                <p className="text-slate-500 text-lg">No delivery orders found</p>
              </div>
            ) : (
              deliveryOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  type="delivery"
                  onClearTable={onClearTable}
                  onCompleteOrder={onCompleteOrder}
                  onDeleteOrder={onDeleteOrder}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Premium Order Card Component
const OrderCard = ({ order, type, onClearTable, onCompleteOrder, onDeleteOrder }) => {
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-700 border-blue-200',
      ready: 'bg-green-100 text-green-700 border-green-200',
      completed: 'bg-gray-100 text-gray-700 border-gray-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || colors.pending;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalAmount = (order) => {
    if (order.total_amount) return order.total_amount;
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    return 0;
  };

  return (
    <div className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-slate-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">
              {type === 'dine-in' ? '🍽️' : '🚚'}
            </span>
            <div>
              <h4 className="font-bold text-slate-900">
                {type === 'dine-in' ? `Table ${order.table_id}` : order.customer_name}
              </h4>
              <p className="text-sm text-slate-600">
                {type === 'dine-in' ? order.customer_name : order.phone}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>📅 {formatDate(order.created_at)}</span>
            <span>🕒 {formatTime(order.created_at)}</span>
            <span>📋 {order.order_number}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-slate-900">
            NPR {getTotalAmount(order).toLocaleString()}
          </p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
            {order.status?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-sm font-medium text-slate-700 mb-2">
            📦 Order Items ({order.items?.length || 0})
          </p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {order.items?.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-slate-600">{item.name} × {item.quantity}</span>
                <span className="font-medium text-slate-900">NPR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            {order.items?.length > 3 && (
              <p className="text-xs text-slate-500 italic">
                +{order.items.length - 3} more items...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <>
            {type === 'dine-in' ? (
              <button
                onClick={() => onClearTable(order.table_id)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
              >
                ✅ Clear Table
              </button>
            ) : (
              <button
                onClick={() => onCompleteOrder(order.id)}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-4 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
              >
                ✅ Complete Order
              </button>
            )}
          </>
        )}
        
        <button
          onClick={() => onDeleteOrder(order.id, order.order_number)}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors"
        >
          🗑️
        </button>
        
        {type === 'delivery' && order.address && (
          <button
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(order.address)}`, '_blank')}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors"
          >
            📍
          </button>
        )}
      </div>
    </div>
  );
};

export default OrdersManagement;
