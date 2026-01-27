import React from 'react';

interface BDTIconProps {
  className?: string;
}

const BDTIcon: React.FC<BDTIconProps> = ({ className = 'w-5 h-5' }) => {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold ${className}`}
    >
      ৳
    </span>
  );
};

export default BDTIcon;
