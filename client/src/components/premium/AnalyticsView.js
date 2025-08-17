import React, { useState, useEffect } from 'react';

const AnalyticsView = ({ orders }) => {
  const [timeRange, setTimeRange] = useState('today');
  const [analyticsData, setAnalyticsData] = useState({});

  const calculateAnalytics = () => {
    const now = new Date();
    let filteredOrders = orders;

    // Filter by time range
    if (timeRange === 'today') {
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === now.toDateString();
      });
    }
    // Add more filtering logic as needed
    
    setAnalyticsData({
      totalOrders: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      avgOrderValue: filteredOrders.length > 0 ? filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0) / filteredOrders.length : 0
    });
  };

  useEffect(() => {
    const now = new Date();
    let filteredOrders = orders;

    // Filter by time range
    if (timeRange === 'today') {
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === now.toDateString();
      });
    } else if (timeRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= weekAgo;
      });
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= monthAgo;
      });
    }

    // Calculate metrics
    const completedOrders = filteredOrders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Top items
    const itemCounts = {};
    completedOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
      }
    });
    const topItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Hourly distribution
    const hourlyData = Array(24).fill(0);
    completedOrders.forEach(order => {
      const hour = new Date(order.created_at).getHours();
      hourlyData[hour]++;
    });

    // Order type distribution
    const dineInCount = filteredOrders.filter(o => o.order_type === 'dine-in').length;
    const deliveryCount = filteredOrders.filter(o => o.order_type === 'delivery').length;

    setAnalyticsData({
      totalOrders: filteredOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      avgOrderValue,
      topItems,
      hourlyData,
      dineInCount,
      deliveryCount
    });
  }, [orders, timeRange]);

  const timeRanges = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Analytics & Reports</h2>
            <p className="text-slate-600 mt-1">Business insights and performance metrics</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Orders"
          value={analyticsData.totalOrders || 0}
          icon="📋"
          color="blue"
          change="+12%"
        />
        <MetricCard
          title="Revenue"
          value={`NPR ${(analyticsData.totalRevenue || 0).toLocaleString()}`}
          icon="💰"
          color="green"
          change="+8%"
        />
        <MetricCard
          title="Avg Order Value"
          value={`NPR ${Math.round(analyticsData.avgOrderValue || 0)}`}
          icon="📊"
          color="purple"
          change="+5%"
        />
        <MetricCard
          title="Completion Rate"
          value={`${analyticsData.totalOrders > 0 ? Math.round((analyticsData.completedOrders / analyticsData.totalOrders) * 100) : 0}%`}
          icon="✅"
          color="orange"
          change="+3%"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Order Type Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-slate-700">Dine-in Orders</span>
              </div>
              <span className="font-bold text-slate-900">{analyticsData.dineInCount || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${analyticsData.totalOrders > 0 ? (analyticsData.dineInCount / analyticsData.totalOrders) * 100 : 0}%`
                }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="font-medium text-slate-700">Delivery Orders</span>
              </div>
              <span className="font-bold text-slate-900">{analyticsData.deliveryCount || 0}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${analyticsData.totalOrders > 0 ? (analyticsData.deliveryCount / analyticsData.totalOrders) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Top Selling Items</h3>
          <div className="space-y-4">
            {analyticsData.topItems?.length > 0 ? (
              analyticsData.topItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' : 'bg-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} sold</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl mb-2 block opacity-50">📊</span>
                <p className="text-slate-500">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Orders Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Orders by Hour</h3>
        <div className="flex items-end justify-between h-64 gap-1">
          {analyticsData.hourlyData?.map((count, hour) => {
            const maxCount = Math.max(...(analyticsData.hourlyData || [1]));
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            return (
              <div key={hour} className="flex flex-col items-center flex-1">
                <div
                  className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-700 hover:to-blue-500 min-h-[4px] w-full"
                  style={{ height: `${height}%` }}
                  title={`${hour}:00 - ${count} orders`}
                ></div>
                <span className="text-xs text-slate-500 mt-2 transform -rotate-45 origin-center">
                  {hour}:00
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-4">
          <span className="text-sm text-slate-600">Peak hours: 12:00-14:00 & 19:00-21:00</span>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🎯 Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Order Success Rate</span>
              <span className="font-semibold text-green-600">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Avg Prep Time</span>
              <span className="font-semibold text-slate-900">18 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer Satisfaction</span>
              <span className="font-semibold text-yellow-600">4.8/5</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">📈 Growth</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Orders vs Last Period</span>
              <span className="font-semibold text-green-600">+12%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Revenue Growth</span>
              <span className="font-semibold text-green-600">+8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">New Customers</span>
              <span className="font-semibold text-blue-600">+15%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">⚡ Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <span className="text-blue-700 font-medium">📊 Export Report</span>
            </button>
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <span className="text-green-700 font-medium">📧 Email Summary</span>
            </button>
            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <span className="text-purple-700 font-medium">📱 Share Insights</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, color, change }) => {
  const colorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100'
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          <div className="flex items-center mt-2 text-sm text-green-600">
            <span>↗️</span>
            <span className="ml-1">{change} from last period</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
