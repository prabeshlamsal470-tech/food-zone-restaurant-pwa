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
          <h1 className="text-3xl font-bold text-gray-800 mb-4">🪑 Table Selection</h1>
          <p className="text-lg text-gray-600">Choose your table to start ordering</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
          {tables.map(tableNumber => (
            <Link
              key={tableNumber}
              to={generateTableLink(tableNumber)}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 text-center border-2 border-transparent hover:border-orange-500"
            >
              <div className="text-4xl mb-2">🪑</div>
              <div className="text-xl font-bold text-gray-800">Table {tableNumber}</div>
              <div className="text-sm text-gray-500 mt-2">Click to Order</div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">🔒 Secure Table Access</h2>
            <p className="text-blue-700 text-sm">
              All table links are encrypted for your security. You can also scan the QR code at your table for direct access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tables;
