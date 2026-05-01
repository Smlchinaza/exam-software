// Cross-Domain Authentication Service
// Handles authentication transfer between main domain and school subdomains

import { extractCurrentSubdomain, getStoredSubdomainLoginData, storeSubdomainLoginData } from '../utils/subdomain';

class CrossDomainAuth {
  constructor() {
    this.mainDomain = 'schoolshubs.com';
    this.transferKey = 'subdomain-auth-transfer';
    this.storageKey = 'auth-transfer-data';
  }

  /**
   * Initiate cross-domain authentication transfer
   * Used when user logs in on main domain and needs to be redirected to school subdomain
   */
  initiateTransfer(loginData, targetDomain) {
    try {
      // Create transfer data
      const transferData = {
        ...loginData,
        sourceDomain: window.location.hostname,
        targetDomain,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        transferId: this.generateTransferId()
      };

      // Store transfer data in sessionStorage
      sessionStorage.setItem(this.storageKey, JSON.stringify(transferData));

      // Create transfer notification
      this.showTransferNotification('Preparing to transfer your session...', 'info');

      // Redirect to target domain
      setTimeout(() => {
        window.location.href = `https://${targetDomain}/auth/transfer?transferId=${transferData.transferId}`;
      }, 1000);

      return transferData;
    } catch (error) {
      console.error('Error initiating cross-domain transfer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming cross-domain authentication transfer
   * Used when user is redirected to school subdomain with transfer data
   */
  async handleIncomingTransfer(transferId) {
    try {
      // Get transfer data from sessionStorage
      const storedData = sessionStorage.getItem(this.storageKey);
      
      if (!storedData) {
        throw new Error('No transfer data found');
      }

      const transferData = JSON.parse(storedData);
      
      // Verify transfer ID
      if (transferData.transferId !== transferId) {
        throw new Error('Invalid transfer ID');
      }

      // Check if transfer has expired
      if (Date.now() > transferData.expiresAt) {
        throw new Error('Transfer has expired');
      }

      // Verify target domain matches current domain
      const currentDomain = window.location.hostname;
      if (!currentDomain.includes(transferData.targetDomain)) {
        throw new Error('Domain mismatch in transfer');
      }

      // Show transfer notification
      this.showTransferNotification('Transferring your authentication...', 'info');

      // Store login data for subdomain
      storeSubdomainLoginData({
        token: transferData.token,
        user: transferData.user,
        school: transferData.school,
        redirectTo: transferData.redirectTo,
        loginTime: transferData.timestamp,
        expiresIn: transferData.expiresIn
      });

      // Clear transfer data
      sessionStorage.removeItem(this.storageKey);

      // Show success notification
      this.showTransferNotification('Authentication transferred successfully!', 'success');

      return transferData;
    } catch (error) {
      console.error('Error handling incoming transfer:', error);
      this.showTransferNotification('Authentication transfer failed', 'error');
      throw error;
    }
  }

  /**
   * Check if there's pending cross-domain authentication
   */
  hasPendingTransfer() {
    try {
      const storedData = sessionStorage.getItem(this.storageKey);
      if (!storedData) return false;

      const transferData = JSON.parse(storedData);
      
      // Check if transfer is still valid
      return Date.now() <= transferData.expiresAt;
    } catch (error) {
      console.error('Error checking pending transfer:', error);
      return false;
    }
  }

  /**
   * Get pending transfer data
   */
  getPendingTransfer() {
    try {
      const storedData = sessionStorage.getItem(this.storageKey);
      if (!storedData) return null;

      const transferData = JSON.parse(storedData);
      
      // Check if transfer is still valid
      if (Date.now() > transferData.expiresAt) {
        sessionStorage.removeItem(this.storageKey);
        return null;
      }

      return transferData;
    } catch (error) {
      console.error('Error getting pending transfer:', error);
      return null;
    }
  }

  /**
   * Clear transfer data
   */
  clearTransfer() {
    sessionStorage.removeItem(this.storageKey);
  }

  /**
   * Generate unique transfer ID
   */
  generateTransferId() {
    return `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show transfer notification
   */
  showTransferNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.cross-domain-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `cross-domain-notification fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-sm ${
      type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
      type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
      'bg-blue-50 border-blue-200 text-blue-800'
    }`;
    
    notification.innerHTML = `
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm font-medium">${message}</p>
          ${type === 'info' ? '<p class="text-xs mt-1">Please wait while we transfer your session...</p>' : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Check if current domain is main domain
   */
  isMainDomain() {
    return window.location.hostname === this.mainDomain || 
           window.location.hostname === `www.${this.mainDomain}`;
  }

  /**
   * Check if current domain is a school subdomain
   */
  isSchoolSubdomain() {
    return extractCurrentSubdomain() !== null;
  }

  /**
   * Get school subdomain from hostname
   */
  getSchoolSubdomain() {
    return extractCurrentSubdomain();
  }

  /**
   * Validate cross-domain request
   */
  validateCrossDomainRequest(requestData) {
    const { sourceDomain, targetDomain, timestamp, expiresAt } = requestData;

    // Check if request is recent
    if (Date.now() - timestamp > 60000) { // 1 minute
      throw new Error('Request is too old');
    }

    // Check if request has expired
    if (Date.now() > expiresAt) {
      throw new Error('Request has expired');
    }

    // Check domains
    if (sourceDomain !== window.location.hostname) {
      throw new Error('Source domain mismatch');
    }

    return true;
  }

  /**
   * Create cross-domain message listener
   */
  createMessageListener() {
    return (event) => {
      // Only accept messages from same origin or allowed domains
      if (event.origin !== window.location.origin && 
          !event.origin.includes(this.mainDomain) &&
          !event.origin.includes('.schoolshubs.com')) {
        return;
      }

      const { type, data } = event.data;

      switch (type) {
        case 'CROSS_DOMAIN_AUTH_REQUEST':
          this.handleAuthRequest(data);
          break;
        case 'CROSS_DOMAIN_AUTH_RESPONSE':
          this.handleAuthResponse(data);
          break;
        default:
          console.warn('Unknown cross-domain message type:', type);
      }
    };
  }

  /**
   * Handle authentication request from parent window
   */
  handleAuthRequest(requestData) {
    try {
      this.validateCrossDomainRequest(requestData);
      
      // Send response to parent window
      if (window.parent) {
        window.parent.postMessage({
          type: 'CROSS_DOMAIN_AUTH_RESPONSE',
          data: {
            success: true,
            message: 'Cross-domain authentication request received'
          }
        }, '*');
      }
    } catch (error) {
      console.error('Error handling auth request:', error);
      
      // Send error response
      if (window.parent) {
        window.parent.postMessage({
          type: 'CROSS_DOMAIN_AUTH_RESPONSE',
          data: {
            success: false,
            error: error.message
          }
        }, '*');
      }
    }
  }

  /**
   * Handle authentication response from child window
   */
  handleAuthResponse(responseData) {
    try {
      if (responseData.success) {
        console.log('Cross-domain authentication successful');
        // Handle successful response
      } else {
        console.error('Cross-domain authentication failed:', responseData.error);
        // Handle error
      }
    } catch (error) {
      console.error('Error handling auth response:', error);
    }
  }

  /**
   * Setup cross-domain message listener
   */
  setupMessageListener() {
    const listener = this.createMessageListener();
    window.addEventListener('message', listener);
    
    return () => {
      window.removeEventListener('message', listener);
    };
  }

  /**
   * Send cross-domain message
   */
  sendMessage(targetWindow, type, data) {
    try {
      targetWindow.postMessage({
        type,
        data
      }, '*');
    } catch (error) {
      console.error('Error sending cross-domain message:', error);
    }
  }

  /**
   * Create iframe for cross-domain communication
   */
  createAuthIframe(targetDomain) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `https://${targetDomain}/auth/iframe`;
      
      iframe.onload = () => {
        resolve(iframe.contentWindow);
      };
      
      iframe.onerror = () => {
        reject(new Error('Failed to load auth iframe'));
      };
      
      document.body.appendChild(iframe);
    });
  }

  /**
   * Handle postMessage authentication
   */
  async handlePostMessageAuth(targetDomain, authData) {
    try {
      const authWindow = await this.createAuthIframe(targetDomain);
      
      // Send authentication data
      this.sendMessage(authWindow, 'AUTH_REQUEST', authData);
      
      // Wait for response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 10000);
        
        const listener = (event) => {
          if (event.data.type === 'AUTH_RESPONSE') {
            clearTimeout(timeout);
            window.removeEventListener('message', listener);
            
            if (event.data.success) {
              resolve(event.data.data);
            } else {
              reject(new Error(event.data.error));
            }
          }
        };
        
        window.addEventListener('message', listener);
      });
    } catch (error) {
      console.error('Error in postMessage auth:', error);
      throw error;
    }
  }

  /**
   * Get authentication URL for cross-domain transfer
   */
  getAuthUrl(targetDomain, transferId) {
    return `https://${targetDomain}/auth/transfer?transferId=${transferId}`;
  }

  /**
   * Parse URL parameters for transfer ID
   */
  parseTransferId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('transferId');
  }

  /**
   * Check if current page is a transfer page
   */
  isTransferPage() {
    return window.location.pathname === '/auth/transfer';
  }

  /**
   * Handle redirect after successful transfer
   */
  handleRedirectAfterTransfer(redirectTo) {
    if (redirectTo) {
      // Show success message
      this.showTransferNotification('Transfer complete! Redirecting...', 'success');
      
      // Redirect after delay
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 2000);
    } else {
      // No redirect specified, go to dashboard
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const role = user.role || 'student';
      
      let dashboardPath = '/dashboard';
      if (role === 'teacher') dashboardPath = '/teacher/dashboard';
      if (role === 'admin') dashboardPath = '/admin/dashboard';
      
      window.location.href = dashboardPath;
    }
  }
}

// Create singleton instance
const crossDomainAuth = new CrossDomainAuth();

export default crossDomainAuth;

// Export class for testing or custom instances
export { CrossDomainAuth };
