import React from 'react';
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';

export const SchoolBranding = () => {
  const { schoolInfo, loading, error } = useSchoolSubdomain();

  if (loading) {
    return (
      <div className="school-branding-loading">
        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
      </div>
    );
  }

  if (error) {
    console.error('School branding error:', error);
    return null;
  }

  if (!schoolInfo || !schoolInfo.isSubdomain) {
    return null;
  }

  return (
    <div className="school-branding">
      <div className="flex items-center space-x-2">
        <div className="school-badge">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {schoolInfo.subdomain.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="school-info">
          <p className="text-sm text-gray-600 font-medium">
            {schoolInfo.subdomain.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </p>
          <p className="text-xs text-gray-500">
            {schoolInfo.fullDomain}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchoolBranding;
