import React from 'react';

// Confirmation Modal for Table Clearing
export const ConfirmModal = ({ 
  showConfirmModal, 
  tableToDelete, 
  confirmClearTable, 
  cancelClearTable 
}) => {
  if (!showConfirmModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900">Clear Table {tableToDelete}?</h3>
          <p className="text-gray-600 mb-6">
            This will move all orders for Table {tableToDelete} to order history. 
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={cancelClearTable}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmClearTable}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Clear Table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirmation Dialog for Order Actions
export const ConfirmDialog = ({ 
  confirmDialog, 
  setConfirmDialog, 
  confirmCompleteOrder 
}) => {
  if (!confirmDialog.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Confirm Action</h3>
          <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setConfirmDialog({ show: false, orderId: null, message: '' })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmCompleteOrder}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Order Dialog
export const DeleteDialog = ({ 
  deleteDialog, 
  setDeleteDialog, 
  confirmDeleteOrder 
}) => {
  if (!deleteDialog.show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🗑️</span>
          </div>
          <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Order</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete Order #{deleteDialog.orderNumber}?
          </p>
          <p className="text-sm text-red-500 mb-4">
            ⚠️ This action cannot be undone and will permanently remove the order from the database.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter deletion password to confirm:
            </label>
            <input
              type="password"
              value={deleteDialog.password}
              onChange={(e) => setDeleteDialog(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter @Sujan123#"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDeleteDialog({ show: false, orderId: null, orderNumber: '', password: '' })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteOrder}
              disabled={deleteDialog.password !== '@Sujan123#'}
              className={`px-4 py-2 rounded-lg transition-colors ${
                deleteDialog.password === '@Sujan123#'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              🗑️ Delete Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
