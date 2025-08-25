import React, { useState, useEffect } from 'react';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load real data from API
  useEffect(() => {
    // TODO: Replace with actual API calls to fetch categories and menu items
    // For now, initialize with empty arrays - data should come from backend
    setCategories([]);
    setMenuItems([]);
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAvailability = (itemId) => {
    setMenuItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, available: !item.available } : item
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Menu Management</h2>
            <p className="text-slate-600 mt-1">{filteredItems.length} items found</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-3 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              ➕ Add Item
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-6">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {category.name}
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                activeCategory === category.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {category.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onToggleAvailability={toggleAvailability}
            onEdit={setEditingItem}
          />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <span className="text-6xl mb-4 block opacity-50">🍽️</span>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No menu items found</h3>
          <p className="text-slate-600 mb-6">Try adjusting your search or category filter</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            ➕ Add First Item
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Items</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{menuItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Available</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {menuItems.filter(item => item.available).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {menuItems.filter(item => !item.available).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Avg Price</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                NPR {Math.round(menuItems.reduce((sum, item) => sum + item.price, 0) / menuItems.length)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Menu Item Card Component
const MenuItemCard = ({ item, onToggleAvailability, onEdit }) => {
  const getCategoryIcon = (category) => {
    const icons = {
      appetizers: '🥟',
      mains: '🍽️',
      beverages: '🥤',
      desserts: '🍰'
    };
    return icons[category] || '🍴';
  };

  const getPopularityColor = (popularity) => {
    if (popularity >= 90) return 'text-green-600 bg-green-100';
    if (popularity >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl opacity-50">{getCategoryIcon(item.category)}</span>
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            item.available
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {item.available ? '✅ Available' : '❌ Out of Stock'}
          </span>
        </div>

        {/* Popularity Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPopularityColor(item.popularity)}`}>
            🔥 {item.popularity}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.name}</h3>
            <p className="text-slate-600 text-sm line-clamp-2">{item.description}</p>
          </div>
          <div className="text-right ml-4">
            <p className="text-2xl font-bold text-slate-900">NPR {item.price}</p>
            <p className="text-xs text-slate-500">⏱️ {item.preparationTime} min</p>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-700 mb-2">🥘 Ingredients:</p>
          <div className="flex flex-wrap gap-1">
            {item.ingredients.slice(0, 3).map((ingredient, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md"
              >
                {ingredient}
              </span>
            ))}
            {item.ingredients.length > 3 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                +{item.ingredients.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Allergens */}
        {item.allergens.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-red-700 mb-2">⚠️ Allergens:</p>
            <div className="flex flex-wrap gap-1">
              {item.allergens.map((allergen, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md border border-red-200"
                >
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onToggleAvailability(item.id)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              item.available
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {item.available ? '❌ Mark Unavailable' : '✅ Mark Available'}
          </button>
          
          <button
            onClick={() => onEdit(item)}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors"
          >
            ✏️
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
