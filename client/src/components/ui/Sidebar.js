import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      id: 'dine-in',
      label: 'Dine-in Orders',
      icon: '🍽️',
      description: 'Table Orders',
      badge: 'live'
    },
    {
      id: 'delivery',
      label: 'Delivery Orders',
      icon: '🚚',
      description: 'Delivery Management',
      badge: 'live'
    },
    {
      id: 'history',
      label: 'Order History',
      icon: '📜',
      description: 'Completed Orders'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      description: 'Customer Database'
    },
    {
      id: 'menu',
      label: 'Menu Management',
      icon: '📋',
      description: 'Items & Categories'
    },
    {
      id: 'tables',
      label: 'Tables & Reservations',
      icon: '🪑',
      description: 'Table Management'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: '👨‍🍳',
      description: 'Team & Roles'
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: '📈',
      description: 'Business Insights'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'System Configuration'
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
            🍽️
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Food Zone</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 group relative ${
              activeTab === item.id
                ? 'bg-orange-50 text-orange-700 border border-orange-200 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{item.label}</span>
                {item.badge === 'live' && (
                  <span className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>
            
            {/* Active indicator */}
            {activeTab === item.id && (
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* User Actions */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Audio Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sound Notifications</span>
          <button
            onClick={() => window.audioManager?.setEnabled(!window.audioManager?.isEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              window.audioManager?.isEnabled ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                window.audioManager?.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* PWA Install */}
        <button
          id="pwa-install-btn"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors hidden"
          onClick={() => window.deferredPrompt && window.deferredPrompt.prompt()}
        >
          <span>📱</span>
          Install App
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
