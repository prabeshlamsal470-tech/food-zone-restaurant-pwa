import React, { useState, useEffect } from 'react';
import StatsCard from '../ui/StatsCard';

const DashboardOverview = ({ orders, customers, dbSummary }) => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedToday: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
    deliveryOrders: 0,
    dineInOrders: 0
  });

  useEffect(() => {
    calculateStats();
  }, [orders, customers, dbSummary]);

  const calculateStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeOrders = orders.filter(order => 
      order.status !== 'completed' && order.status !== 'cancelled'
    );

    const completedToday = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today && order.status === 'completed';
    });

    const totalRevenue = orders.reduce((sum, order) => {
      if (order.status === 'completed') {
        return sum + (order.total || getTotalOrderValue(order.items));
      }
      return sum;
    }, 0);

    const deliveryOrders = orders.filter(order => order.order_type === 'delivery');
    const dineInOrders = orders.filter(order => order.order_type === 'dine-in');

    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    setStats({
      totalOrders: dbSummary?.totalOrders || orders.length,
      activeOrders: activeOrders.length,
      completedToday: completedToday.length,
      totalRevenue,
      avgOrderValue,
      totalCustomers: customers.length,
      deliveryOrders: deliveryOrders.length,
      dineInOrders: dineInOrders.length
    });
  };

  const getTotalOrderValue = (items) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const formatCurrency = (amount) => {
    return `NPR ${amount.toLocaleString()}/-`;
  };

  const getRecentActivity = () => {
    const recentOrders = orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return recentOrders.map(order => ({
      id: order.id,
      type: order.order_type,
      customer: order.customer_name,
      amount: getTotalOrderValue(order.items) || order.total,
      time: new Date(order.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: order.status
    }));
  };

  const recentActivity = getRecentActivity();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Orders"
          value={stats.activeOrders}
          icon="🔥"
          color="orange"
          change={stats.activeOrders > 0 ? `${stats.activeOrders} pending` : 'All clear'}
          changeType={stats.activeOrders > 5 ? 'negative' : 'positive'}
        />
        
        <StatsCard
          title="Today's Orders"
          value={stats.completedToday}
          icon="📈"
          color="green"
          change="+12% vs yesterday"
          changeType="positive"
        />
        
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="💰"
          color="blue"
          change="+8.2% this month"
          changeType="positive"
        />
        
        <StatsCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon="👥"
          color="purple"
          change="+5 new this week"
          changeType="positive"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Avg Order Value"
          value={formatCurrency(stats.avgOrderValue)}
          icon="📊"
          color="yellow"
        />
        
        <StatsCard
          title="Delivery Orders"
          value={stats.deliveryOrders}
          icon="🚚"
          color="green"
        />
        
        <StatsCard
          title="Dine-in Orders"
          value={stats.dineInOrders}
          icon="🍽️"
          color="orange"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>⚡</span>
              Recent Activity
            </h3>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        activity.type === 'delivery' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {activity.type === 'delivery' ? '🚚' : '🍽️'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.customer}</p>
                        <p className="text-sm text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(activity.amount)}</p>
                      <p className={`text-xs px-2 py-1 rounded-full ${
                        activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {activity.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span>⚡</span>
              Quick Actions
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                  🍽️
                </div>
                <span className="text-sm font-medium text-gray-700">View Tables</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                  🚚
                </div>
                <span className="text-sm font-medium text-gray-700">Deliveries</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                  👥
                </div>
                <span className="text-sm font-medium text-gray-700">Customers</span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                  📈
                </div>
                <span className="text-sm font-medium text-gray-700">Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>📊</span>
            Performance Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
              <div className="text-sm text-gray-600">Order Accuracy</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">12m</div>
              <div className="text-sm text-gray-600">Avg Prep Time</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">4.8</div>
              <div className="text-sm text-gray-600">Customer Rating</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '96%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
