import React from 'react';
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';

export const SchoolHeader = ({ showLogo = true, showName = true, showDomain = false, variant = 'default' }) => {
  const { schoolInfo, loading, error } = useSchoolSubdomain();

  if (loading) {
    return (
      <div className="school-header-loading">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            {showDomain && <div className="h-3 bg-gray-200 rounded w-24"></div>}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('School header error:', error);
    return null;
  }

  if (!schoolInfo || !schoolInfo.isSubdomain) {
    return null;
  }

  const formatSchoolName = (subdomain) => {
    return subdomain.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const variants = {
    default: 'bg-white border border-gray-200 rounded-lg shadow-sm p-4',
    compact: 'bg-transparent border-b border-gray-200 pb-2',
    minimal: 'bg-transparent',
    card: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100'
  };

  const schoolName = formatSchoolName(schoolInfo.subdomain);

  return (
    <div className={`school-header ${variants[variant]}`}>
      <div className="flex items-center space-x-3">
        {showLogo && (
          <div className="school-logo">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">
                {schoolInfo.subdomain.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        <div className="school-details flex-1">
          {showName && (
            <h2 className="text-lg font-semibold text-gray-800">
              {schoolName}
            </h2>
          )}
          
          {showDomain && (
            <p className="text-sm text-gray-500">
              {schoolInfo.fullDomain}
            </p>
          )}
        </div>

        {variant === 'card' && (
          <div className="school-badge">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Schools Hubs
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolHeader;
