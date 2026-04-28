import React from 'react';
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';
import SchoolBranding from './SchoolBranding';
import SchoolHeader from './SchoolHeader';

export const SubdomainTest = () => {
  const { schoolInfo, loading, error } = useSchoolSubdomain();

  return (
    <div className="subdomain-test p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Subdomain Detection Test</h1>
      
      {/* Test Results */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Detection Results</h2>
        
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Detecting subdomain...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">Error: {error.message}</p>
          </div>
        )}
        
        {schoolInfo && !loading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Subdomain:</span>
                <p className="text-sm text-gray-600">{schoolInfo.subdomain || 'None'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Domain:</span>
                <p className="text-sm text-gray-600">{schoolInfo.domain}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Is Subdomain:</span>
                <p className="text-sm text-gray-600">{schoolInfo.isSubdomain ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Full Domain:</span>
                <p className="text-sm text-gray-600">{schoolInfo.fullDomain || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Component Tests */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Component Tests</h2>
        
        {/* SchoolBranding Component */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-md font-medium mb-4">SchoolBranding Component</h3>
          <SchoolBranding />
        </div>
        
        {/* SchoolHeader Variants */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-md font-medium mb-4">SchoolHeader Variants</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Default Variant</h4>
              <SchoolHeader variant="default" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Compact Variant</h4>
              <SchoolHeader variant="compact" />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Minimal Variant</h4>
              <SchoolHeader variant="minimal" showDomain={true} />
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Card Variant</h4>
              <SchoolHeader variant="card" showDomain={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Manual Testing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Manual Testing Instructions</h2>
        <div className="space-y-2 text-sm text-gray-700">
          <p>1. <strong>Local Testing:</strong> Add to your hosts file:</p>
          <code className="block bg-gray-100 p-2 rounded text-xs">
            127.0.0.1 test-school.localhost<br/>
            127.0.0.1 spectra-group.localhost
          </code>
          
          <p className="mt-3">2. <strong>Access via subdomain:</strong></p>
          <code className="block bg-gray-100 p-2 rounded text-xs">
            http://test-school.localhost:3000<br/>
            http://spectra-group.localhost:3000
          </code>
          
          <p className="mt-3">3. <strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Subdomain should be detected and displayed above</li>
            <li>School branding components should show the school name</li>
            <li>API requests will include subdomain context automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SubdomainTest;
