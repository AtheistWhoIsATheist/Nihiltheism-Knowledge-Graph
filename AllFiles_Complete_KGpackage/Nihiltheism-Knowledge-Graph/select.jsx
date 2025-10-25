import React from 'react';

const Select = ({ children, onValueChange, defaultValue, value }) => {
  return (
    <div className="relative">
      {children}
    </div>
  );
};

const SelectTrigger = ({ children, className = '' }) => (
  <button className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
    {children}
  </button>
);

const SelectValue = ({ placeholder }) => (
  <span className="text-gray-500">{placeholder}</span>
);

const SelectContent = ({ children }) => (
  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
    {children}
  </div>
);

const SelectItem = ({ children, value, onSelect }) => (
  <div 
    className="px-3 py-2 text-sm text-gray-900 hover:bg-gray-100 cursor-pointer"
    onClick={() => onSelect && onSelect(value)}
  >
    {children}
  </div>
);

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };

