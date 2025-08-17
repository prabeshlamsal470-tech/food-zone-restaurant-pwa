import React from 'react';
import StatsCard from './ui/StatsCard';
import OrderCard from './ui/OrderCard';

// Login Form Component
export const LoginForm = ({ 
  password, 
  setPassword, 
  showPassword, 
  setShowPassword, 
  handleLogin, 
  loading, 
  error 
}) => (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900 to-red-900 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-4">
          🍽️
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Food Zone Admin</h1>
        <p className="text-gray-600">Enter password to access the admin panel</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-colors"
              placeholder="Enter admin password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">❌ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? '🔄 Authenticating...' : '🚀 Access Admin Panel'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🍽️ Food Zone Restaurant Management System
        </p>
      </div>
    </div>
  </div>
);

// Dine-in Orders View
export const DineInOrdersView = ({ orders, handleClearTable, openInGoogleMaps }) => {
  const dineInOrders = orders.filter(order => 
    order.order_type === 'dine-in' && 
    order.status !== 'completed' && 
    order.status !== 'cancelled'
  );

  if (dineInOrders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-6">🪑</div>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">No Active Dine-in Orders</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Table orders will appear here in real-time. When customers place orders from their tables, 
          you'll see them instantly with all the details you need.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Active Tables"
          value={dineInOrders.length}
          icon="🍽️"
          color="orange"
        />
        <StatsCard
          title="Total Items"
          value={dineInOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}
          icon="🛒"
          color="blue"
        />
        <StatsCard
          title="Order Value"
          value={`NPR ${dineInOrders.reduce((sum, order) => sum + (order.total || 0), 0)}/-`}
          icon="💰"
          color="green"
        />
      </div>

      {/* Orders */}
      <div className="space-y-6">
        {dineInOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            type="dine-in"
            onClear={handleClearTable}
            onLocationClick={openInGoogleMaps}
          />
        ))}
      </div>
    </div>
  );
};

// Delivery Orders View
export const DeliveryOrdersView = ({ orders, handleCompleteDeliveryOrder, handleDeleteOrder, openInGoogleMaps }) => {
  const deliveryOrders = orders.filter(order => 
    order.order_type === 'delivery' && 
    order.status !== 'completed' && 
    order.status !== 'cancelled'
  );

  if (deliveryOrders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-6">🚚</div>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">No Active Delivery Orders</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Delivery orders will appear here in real-time. You'll see customer details, 
          delivery addresses, and GPS locations for easy navigation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Active Deliveries"
          value={deliveryOrders.length}
          icon="🚚"
          color="green"
        />
        <StatsCard
          title="Total Items"
          value={deliveryOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}
          icon="📦"
          color="blue"
        />
        <StatsCard
          title="Order Value"
          value={`NPR ${deliveryOrders.reduce((sum, order) => sum + (order.total || 0), 0)}/-`}
          icon="💰"
          color="orange"
        />
      </div>

      {/* Orders */}
      <div className="space-y-6">
        {deliveryOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            type="delivery"
            onComplete={handleCompleteDeliveryOrder}
            onDelete={handleDeleteOrder}
            onLocationClick={openInGoogleMaps}
          />
        ))}
      </div>
    </div>
  );
};

// Order History View
export const OrderHistoryView = ({ orderHistory, isLoadingHistory, handleDeleteOrder, formatDate }) => {
  if (isLoadingHistory) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4 animate-spin">⏳</div>
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">Loading Order History...</h2>
        <p className="text-gray-500">Please wait while we fetch completed orders</p>
      </div>
    );
  }

  if (orderHistory.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-6">📜</div>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">No Order History</h2>
        <p className="text-gray-500">Completed orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Orders"
          value={orderHistory.length}
          icon="📋"
          color="blue"
        />
        <StatsCard
          title="Total Revenue"
          value={`NPR ${orderHistory.reduce((sum, order) => sum + (order.total || 0), 0)}/-`}
          icon="💰"
          color="green"
        />
        <StatsCard
          title="Avg Order Value"
          value={`NPR ${Math.round(orderHistory.reduce((sum, order) => sum + (order.total || 0), 0) / orderHistory.length)}/-`}
          icon="📊"
          color="orange"
        />
        <StatsCard
          title="Delivery Orders"
          value={orderHistory.filter(o => o.order_type === 'delivery').length}
          icon="🚚"
          color="purple"
        />
      </div>

      {/* Orders */}
      <div className="space-y-6">
        {orderHistory.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-green-700 flex items-center gap-2">
                    {order.order_type === 'delivery' ? (
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
                  <div className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                    Completed
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
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="text-sm">🕒</span>
                      Ordered: {formatDate(order.created_at)}
                    </span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <span className="text-sm">✅</span>
                      Completed: {formatDate(order.completed_at)}
                    </span>
                  </div>
                </div>

                {order.order_type === 'delivery' && order.delivery_address && (
                  <div className="mt-3 flex items-start gap-2 text-sm">
                    <span className="text-base mt-0.5">📍</span>
                    <p className="text-gray-700">{order.delivery_address}</p>
                  </div>
                )}
              </div>

              <div className="text-right ml-6">
                <div className="text-3xl font-bold text-green-600 mb-3">
                  NPR {order.total || 0}/-
                </div>
                <button
                  onClick={() => handleDeleteOrder(order.id, order.order_number)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>

            {/* Order Items */}
            {order.items && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📦</span>
                  Order Items ({order.items.length})
                </h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm font-medium text-gray-600 shadow-sm">
                          {item.quantity}
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="font-semibold text-gray-900">
                        NPR {(item.price * item.quantity)}/-
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Customers View
export const CustomersView = ({ customers }) => {
  if (customers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-6">👥</div>
        <h2 className="text-2xl font-semibold text-gray-600 mb-4">No Customers Yet</h2>
        <p className="text-gray-500">Customer data will appear here as orders are placed</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Customers"
          value={customers.length}
          icon="👥"
          color="purple"
        />
        <StatsCard
          title="Total Orders"
          value={customers.reduce((sum, customer) => sum + (customer.actual_order_count || customer.total_orders || 0), 0)}
          icon="📋"
          color="blue"
        />
        <StatsCard
          title="Total Revenue"
          value={`NPR ${customers.reduce((sum, customer) => sum + parseFloat(customer.total_spent || 0), 0).toFixed(0)}/-`}
          icon="💰"
          color="green"
        />
        <StatsCard
          title="Avg Customer Value"
          value={`NPR ${Math.round(customers.reduce((sum, customer) => sum + parseFloat(customer.total_spent || 0), 0) / customers.length)}/-`}
          icon="📊"
          color="orange"
        />
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Last Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.email && (
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{customer.phone}</td>
                  <td>
                    <span className="badge badge-primary">
                      {customer.actual_order_count || customer.total_orders}
                    </span>
                  </td>
                  <td className="font-semibold">
                    NPR {parseFloat(customer.total_spent).toFixed(2)}/-
                  </td>
                  <td className="text-sm text-gray-500">
                    {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${
                      parseFloat(customer.total_spent) > 1000 ? 'badge-success' :
                      parseFloat(customer.total_spent) > 500 ? 'badge-warning' :
                      'badge-gray'
                    }`}>
                      {parseFloat(customer.total_spent) > 1000 ? 'VIP' :
                       parseFloat(customer.total_spent) > 500 ? 'Regular' :
                       'New'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Coming Soon View
export const ComingSoonView = ({ feature }) => (
  <div className="text-center py-16">
    <div className="text-8xl mb-6">🚧</div>
    <h2 className="text-2xl font-semibold text-gray-600 mb-4">Coming Soon</h2>
    <p className="text-gray-500 max-w-md mx-auto">
      {feature} is currently under development. This feature will be available in the next update.
    </p>
  </div>
);
