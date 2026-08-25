import React, { useState } from 'react';
import { User } from 'lucide-react';

export const Avatar = ({
  src,
  name = '',
  size = 'md',
  className = '',
  onClick,
  showStatusDot = false,
  status = 'online',
}) => {
  const [imgError, setImgError] = useState(false);

  // Size mapping
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const currentSizeClass = sizeMap[size] || sizeMap.md;

  // Extract initials
  const getInitials = (str) => {
    if (!str || typeof str !== 'string') return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <div className={`relative inline-block shrink-0 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      {src && !imgError ? (
        <img
          src={src}
          alt={name || 'User Profile'}
          onError={() => setImgError(true)}
          className={`${currentSizeClass} rounded-full object-cover border-2 border-white/90 shadow-sm ${className}`}
        />
      ) : (
        <div
          className={`${currentSizeClass} rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white font-extrabold flex items-center justify-center border-2 border-white/90 shadow-sm select-none ${className}`}
          title={name || 'User Profile'}
        >
          {initials ? (
            <span>{initials}</span>
          ) : (
            <User className="w-1/2 h-1/2 text-slate-300" />
          )}
        </div>
      )}

      {showStatusDot && (
        <span
          className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full ring-2 ring-white ${
            status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;
