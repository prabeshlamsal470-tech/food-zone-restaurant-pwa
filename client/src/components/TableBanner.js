import React from 'react';
import { Link } from 'react-router-dom';
import { useTable } from '../context/TableContext';

const TableBanner = () => {
  const { currentTable } = useTable();

  if (!currentTable) return null;

  return (
    <Link 
      to={`/${currentTable}`}
      className="bg-primary text-white py-2 px-4 text-center font-semibold sticky top-16 z-40 block hover:bg-orange-600 transition-colors cursor-pointer"
    >
      🪑 You are at Table Number {currentTable} - Click to Order
    </Link>
  );
};

export default TableBanner;
