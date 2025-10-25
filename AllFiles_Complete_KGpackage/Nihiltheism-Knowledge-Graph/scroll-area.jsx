import React from 'react';

const ScrollArea = ({ children, className = '' }) => (
  <div className={`overflow-auto ${className}`} style={{ maxHeight: '400px' }}>
    {children}
  </div>
);

export { ScrollArea };

