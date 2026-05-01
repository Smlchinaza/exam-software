// Frontend Subdomain Utilities
// Helper functions for subdomain detection and API configuration

/**
 * Extract subdomain from current window location
 * @returns {string|null} - Subdomain or null
 */
const extractCurrentSubdomain = () => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Split hostname into parts
  const parts = hostWithoutPort.split('.');
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) return null;
  
  // Extract subdomain (first part)
  const subdomain = parts[0];
  
  // Validate subdomain format
  if (!/^[a-z0-9-]+$/.test(subdomain)) return null;
  
  // Exclude common subdomains that aren't schools
  const excludedSubdomains = ['www', 'api', 'admin', 'mail', 'ftp', 'test', 'dev', 'staging'];
  if (excludedSubdomains.includes(subdomain)) return null;
  
  return subdomain.toLowerCase();
};

/**
 * Check if current page is on a school subdomain
 * @returns {boolean} - True if on school subdomain
 */
const isOnSchoolSubdomain = () => {
  const subdomain = extractCurrentSubdomain();
  return subdomain !== null;
};

/**
 * Get base API URL based on current subdomain
 * @returns {string} - API base URL
 */
const getApiBaseUrl = () => {
  const subdomain = extractCurrentSubdomain();
  
  if (subdomain) {
    // On school subdomain, use the same domain for API
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    let apiUrl = `${protocol}//${hostname}`;
    if (port && port !== '80' && port !== '443') {
      apiUrl += `:${port}`;
    }
    
    // Remove trailing slash and add /api
    return apiUrl.replace(/\/$/, '') + '/api';
  }
  
  // On main domain, use default API URL
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

/**
 * Get school context from subdomain
 * @returns {object|null} - School context or null
 */
const getSchoolContext = () => {
  const subdomain = extractCurrentSubdomain();
  
  if (!subdomain) return null;
  
  return {
    subdomain,
    domain: `${subdomain}.schoolshubs.com`,
    isSubdomain: true
  };
};

/**
 * Store login data for subdomain transfer
 * @param {object} loginData - Login response data
 */
const storeSubdomainLoginData = (loginData) => {
  if (typeof window === 'undefined') return;
  
  const data = {
    ...loginData,
    storedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString() // 24 hours
  };
  
  sessionStorage.setItem('subdomainLoginData', JSON.stringify(data));
};

/**
 * Retrieve stored login data for subdomain
 * @returns {object|null} - Login data or null
 */
const getStoredSubdomainLoginData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem('subdomainLoginData');
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if data has expired
    if (new Date() > new Date(data.expiresAt)) {
      sessionStorage.removeItem('subdomainLoginData');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error retrieving stored login data:', error);
    sessionStorage.removeItem('subdomainLoginData');
    return null;
  }
};

/**
 * Clear stored login data
 */
const clearStoredSubdomainLoginData = () => {
  if (typeof window === 'undefined') return;
  
  sessionStorage.removeItem('subdomainLoginData');
};

/**
 * Check if user should be redirected to subdomain
 * @param {object} user - User object
 * @returns {boolean} - True if should redirect
 */
const shouldRedirectToSubdomain = (user) => {
  // Don't redirect super admins
  if (user.role === 'super_admin') return false;
  
  // Don't redirect if already on subdomain
  if (isOnSchoolSubdomain()) return false;
  
  // Redirect if user has school and subdomain
  return !!(user.school_id && user.subdomain);
};

/**
 * Generate subdomain URL for user
 * @param {object} user - User object
 * @param {string} path - URL path (default: /dashboard)
 * @returns {string|null} - Subdomain URL or null
 */
const generateUserSubdomainUrl = (user, path = '/dashboard') => {
  if (!user.subdomain) return null;
  
  const protocol = 'https';
  const domain = `${user.subdomain}.schoolshubs.com`;
  
  return `${protocol}://${domain}${path}`;
};

/**
 * Handle subdomain redirection after login
 * @param {object} loginResponse - Login response from API
 */
const handleSubdomainRedirect = (loginResponse) => {
  if (!loginResponse.redirectTo || !loginResponse.school) {
    return false;
  }
  
  // Store login data for subdomain
  storeSubdomainLoginData({
    token: loginResponse.token,
    user: loginResponse.user,
    school: loginResponse.school,
    expiresIn: loginResponse.expiresIn
  });
  
  // Show success message
  showSubdomainRedirectMessage(loginResponse.school);
  
  // Redirect after delay
  setTimeout(() => {
    window.location.href = loginResponse.redirectTo;
  }, 2000);
  
  return true;
};

/**
 * Show redirect message to user
 * @param {object} school - School information
 */
const showSubdomainRedirectMessage = (school) => {
  if (typeof document === 'undefined') return;
  
  // Remove existing messages
  const existingMessage = document.getElementById('subdomain-redirect-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create success message
  const messageDiv = document.createElement('div');
  messageDiv.id = 'subdomain-redirect-message';
  messageDiv.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg z-50 max-w-sm';
  messageDiv.innerHTML = `
    <div class="flex">
      <div class="ml-3">
        <h3 class="text-sm font-medium text-green-800">Login Successful!</h3>
        <p class="text-sm text-green-700 mt-1">Redirecting to your school dashboard...</p>
        <p class="text-xs text-green-600 mt-1">${school.name}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(messageDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
};

/**
 * Check if user is coming from main domain login
 * @returns {boolean} - True if coming from main domain
 */
const isComingFromMainDomain = () => {
  if (typeof window === 'undefined') return false;
  
  const referrer = document.referrer;
  if (!referrer) return false;
  
  try {
    const referrerUrl = new URL(referrer);
    const referrerHostname = referrerUrl.hostname;
    
    // Check if referrer is main domain (no subdomain)
    const referrerParts = referrerHostname.split('.');
    return referrerParts.length <= 2; // main domain has 2 parts or less
  } catch (error) {
    return false;
  }
};

/**
 * Initialize subdomain context on page load
 * @returns {object|null} - Subdomain context
 */
const initializeSubdomainContext = () => {
  const subdomain = extractCurrentSubdomain();
  
  if (!subdomain) {
    return null;
  }
  
  // Check if we have stored login data
  const storedData = getStoredSubdomainLoginData();
  
  if (storedData) {
    // Validate stored data matches current subdomain
    if (storedData.school && storedData.school.subdomain === subdomain) {
      return {
        subdomain,
        school: storedData.school,
        user: storedData.user,
        token: storedData.token,
        hasStoredData: true
      };
    } else {
      // Clear mismatched data
      clearStoredSubdomainLoginData();
    }
  }
  
  return {
    subdomain,
    hasStoredData: false
  };
};

// ES6 exports for React components
export {
  extractCurrentSubdomain,
  isOnSchoolSubdomain,
  getApiBaseUrl,
  getSchoolContext,
  storeSubdomainLoginData,
  getStoredSubdomainLoginData,
  clearStoredSubdomainLoginData,
  shouldRedirectToSubdomain,
  generateUserSubdomainUrl,
  handleSubdomainRedirect,
  showSubdomainRedirectMessage,
  isComingFromMainDomain,
  initializeSubdomainContext
};

// Default export for convenience
const subdomainUtils = {
  extractCurrentSubdomain,
  isOnSchoolSubdomain,
  getApiBaseUrl,
  getSchoolContext,
  storeSubdomainLoginData,
  getStoredSubdomainLoginData,
  clearStoredSubdomainLoginData,
  shouldRedirectToSubdomain,
  generateUserSubdomainUrl,
  handleSubdomainRedirect,
  showSubdomainRedirectMessage,
  isComingFromMainDomain,
  initializeSubdomainContext
};

export default subdomainUtils;
