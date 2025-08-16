import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminSettings = () => {
  const [tableCount, setTableCount] = useState(25); // Default 25 tables
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [newTableCount, setNewTableCount] = useState(25);

  useEffect(() => {
    fetchTableSettings();
  }, []);

  const fetchTableSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/settings/tables');
      setTableCount(response.data.tableCount || 25);
      setNewTableCount(response.data.tableCount || 25);
    } catch (error) {
      console.error('Error fetching table settings:', error);
      // Use default if API fails
      setTableCount(25);
      setNewTableCount(25);
    }
  };

  const handleUpdateTables = async () => {
    if (newTableCount < 1 || newTableCount > 100) {
      setMessage('Table count must be between 1 and 100');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/settings/tables', {
        tableCount: newTableCount
      });
      
      setTableCount(newTableCount);
      setMessage(`✅ Successfully updated to ${newTableCount} tables`);
      setShowConfirm(false);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating table settings:', error);
      setMessage('❌ Failed to update table settings');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTableCount !== tableCount) {
      setShowConfirm(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">⚙️</span>
        <h2 className="text-xl font-semibold">Restaurant Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Table Configuration */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <span>🪑</span>
            Table Configuration
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Tables
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTableCount}
                  onChange={(e) => setNewTableCount(parseInt(e.target.value) || 1)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-24 text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-gray-600">
                  Currently: {tableCount} tables (Table 1 - Table {tableCount})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customers can access tables via /{'{'}tableNumber{'}'} (e.g., /1, /2, /3...)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || newTableCount === tableCount}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Tables'}
              </button>
              
              {newTableCount !== tableCount && (
                <button
                  type="button"
                  onClick={() => setNewTableCount(tableCount)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <span>📊</span>
            Current Status
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Active Tables:</span>
              <span className="ml-2 text-green-600">{tableCount} tables</span>
            </div>
            <div>
              <span className="font-medium">Table Range:</span>
              <span className="ml-2 text-blue-600">Table 1 - Table {tableCount}</span>
            </div>
            <div>
              <span className="font-medium">QR Code URLs:</span>
              <span className="ml-2 text-purple-600">/{'{'}1-{tableCount}{'}'}</span>
            </div>
            <div>
              <span className="font-medium">Access Method:</span>
              <span className="ml-2 text-gray-600">Direct URL or QR scan</span>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('✅') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Update Table Configuration?</h3>
              <p className="text-gray-600 mb-6">
                This will change the number of available tables from <strong>{tableCount}</strong> to <strong>{newTableCount}</strong>.
                {newTableCount < tableCount && (
                  <span className="block mt-2 text-red-600 text-sm">
                    ⚠️ Reducing tables may affect existing orders for tables {newTableCount + 1}-{tableCount}
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTables}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
