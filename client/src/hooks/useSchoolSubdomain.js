import { useState, useEffect } from 'react';

export const useSchoolSubdomain = () => {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const host = window.location.host;
      const parts = host.split('.');
      let subdomain = null;

      // Extract subdomain with better logic
      if (parts.length >= 3) {
        subdomain = parts[0];
        
        // Skip system subdomains and non-schoolshubs domains
        const systemSubdomains = ['www', 'api', 'admin', 'localhost'];
        const isSystemSubdomain = systemSubdomains.includes(subdomain);
        const isSchoolshubsDomain = parts[parts.length - 2] === 'schoolshubs' && 
                                   (parts[parts.length - 1] === 'com' || parts[parts.length - 1].includes('localhost'));
        
        if (isSystemSubdomain || !isSchoolshubsDomain) {
          subdomain = null;
        }
      }

      if (subdomain) {
        // Store subdomain in state
        setSchoolInfo({
          subdomain: subdomain,
          domain: host,
          isSubdomain: true,
          fullDomain: `${subdomain}.schoolshubs.com`
        });
      } else {
        setSchoolInfo({
          subdomain: null,
          domain: host,
          isSubdomain: false,
          fullDomain: null
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error detecting school subdomain:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { schoolInfo, loading, error };
};
