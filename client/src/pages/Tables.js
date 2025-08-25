import React from 'react';
import { Link } from 'react-router-dom';
import { encryptTableNumber } from '../utils/tableEncryption';

const Tables = () => {
  // Generate encrypted table links for tables 1-25
  const generateTableLink = (tableNumber) => {
    const encryptedCode = encryptTableNumber(tableNumber);
    return `/${encryptedCode}`;
  };

  const tables = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-700 mb-3">🪑 Table Selection</h1>
          <p className="text-gray-600">Choose your table to start ordering</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {tables.map(tableNumber => (
            <Link
              key={tableNumber}
              to={generateTableLink(tableNumber)}
              className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 p-4 text-center transition-colors duration-150"
            >
              <div className="text-3xl mb-2">🪑</div>
              <div className="text-lg font-semibold text-gray-700">Table {tableNumber}</div>
              <div className="text-sm text-gray-500 mt-1">Click to Order</div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-xl mx-auto">
            <h2 className="text-base font-medium text-gray-700 mb-2">🔒 Secure Table Access</h2>
            <p className="text-gray-600 text-sm">
              All table links are encrypted for your security. You can also scan the QR code at your table for direct access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tables;
