import React from 'react';

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  change, 
  changeType = 'neutral',
  color = 'blue',
  loading = false 
}) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600',
    green: 'from-green-500 to-green-600 text-green-600',
    orange: 'from-orange-500 to-orange-600 text-orange-600',
    purple: 'from-purple-500 to-purple-600 text-purple-600',
    red: 'from-red-500 to-red-600 text-red-600',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600'
  };

  const changeClasses = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-50'
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            <div className="w-12 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:transform hover:-translate-y-1 relative overflow-hidden group">
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses[color]}`}></div>
      
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white text-xl shadow-lg`}>
          {icon}
        </div>
        
        {change && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${changeClasses[changeType]}`}>
            {changeType === 'positive' && '↗️'}
            {changeType === 'negative' && '↘️'}
            {change}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className={`text-3xl font-bold ${colorClasses[color].split(' ')[2]}`}>
          {value}
        </div>
        <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
          {title}
        </div>
      </div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
    </div>
  );
};

export default StatsCard;
