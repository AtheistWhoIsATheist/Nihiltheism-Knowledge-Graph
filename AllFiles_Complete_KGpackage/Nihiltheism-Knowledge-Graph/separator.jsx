import React from 'react';

const Separator = ({ className = '', orientation = 'horizontal' }) => (
  <div
    className={`shrink-0 bg-gray-300 ${
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px'
    } ${className}`}
  />
);

export { Separator };

