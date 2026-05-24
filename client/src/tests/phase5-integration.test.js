// Phase 5 Frontend Integration Tests
// Comprehensive testing of subdomain-aware frontend components and cross-domain authentication

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AuthContext from '../context/AuthContext';
import SubdomainRouter from '../components/SubdomainRouter';
import SchoolDashboard from '../components/SchoolDashboard';
import apiClient from '../services/subdomainApi';
import crossDomainAuth from '../services/crossDomainAuth';
import { extractCurrentSubdomain, getStoredSubdomainLoginData, storeSubdomainLoginData } from '../utils/subdomain';

// Mock the API client
jest.mock('../services/subdomainApi');

// Mock window.location
const mockLocation = {
  hostname: 'test-school.schoolshubs.com',
  href: 'https://test-school.schoolshubs.com/dashboard',
  pathname: '/dashboard',
  search: '',
  origin: 'https://test-school.schoolshubs.com'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

describe('Phase 5 Frontend Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock location
    window.location.hostname = 'test-school.schoolshubs.com';
    window.location.href = 'https://test-school.schoolshubs.com/dashboard';
    window.location.pathname = '/dashboard';
    window.location.search = '';
  });

  describe('Subdomain Detection', () => {
    test('should detect subdomain correctly', () => {
      window.location.hostname = 'test-school.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe('test-school');
      
      window.location.hostname = 'www.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe(null);
      
      window.location.hostname = 'api.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe(null);
    });

    test('should exclude common subdomains', () => {
      window.location.hostname = 'www.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe(null);
      
      window.location.hostname = 'api.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe(null);
      
      window.location.hostname = 'admin.schoolshubs.com';
      expect(extractCurrentSubdomain()).toBe(null);
    });
  });

  describe('Subdomain API Client', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should initialize with correct base URL', () => {
      window.location.hostname = 'test-school.schoolshubs.com';
      
      const { SubdomainApiClient } = jest.requireActual('../services/subdomainApi');
      const client = new SubdomainApiClient();
      expect(client.baseURL).toBe('https://test-school.schoolshubs.com/api');
      expect(client.isSubdomain).toBe(true);
      expect(client.subdomain).toBe('test-school');
    });

    test('should use main domain API URL when not on subdomain', () => {
      window.location.hostname = 'schoolshubs.com';
      
      const { SubdomainApiClient } = jest.requireActual('../services/subdomainApi');
      const client = new SubdomainApiClient();
      expect(client.baseURL).toBe('http://localhost:5000/api');
      expect(client.isSubdomain).toBe(false);
      expect(client.subdomain).toBe(null);
    });

    test('should add authentication headers', async () => {
      const { SubdomainApiClient } = jest.requireActual('../services/subdomainApi');
      const client = new SubdomainApiClient();
      
      // Mock token
      localStorageMock.getItem.mockReturnValue('mock-token');
      
      const config = {};
      await client.axios.interceptors.request.handlers[0].fulfilled(config);
      
      expect(config.headers.Authorization).toBe('Bearer mock-token');
    });

    test('should add school context headers', async () => {
      const { SubdomainApiClient } = jest.requireActual('../services/subdomainApi');
      const client = new SubdomainApiClient();
      
      // Mock school context
      client.schoolContext = {
        id: 'school-123',
        subdomain: 'test-school',
        domain: 'test-school.schoolshubs.com'
      };
      
      const config = {};
      await client.axios.interceptors.request.handlers[0].fulfilled(config);
      
      expect(config.headers['X-School-Context']).toBe(JSON.stringify({
        schoolId: 'school-123',
        subdomain: 'test-school',
        domain: 'test-school.schoolshubs.com'
      }));
    });

    test('should handle cross-school access errors', async () => {
      const { SubdomainApiClient } = jest.requireActual('../services/subdomainApi');
      const client = new SubdomainApiClient();
      
      const error = {
        response: {
          status: 403,
          data: {
            error: 'Cross-school access denied',
            message: 'You cannot access data from other schools',
            school: {
              name: 'Other School',
              domain: 'other-school.schoolshubs.com'
            }
          }
        }
      };
      
      await client.axios.interceptors.response.handlers[0].rejected(error);
      
      // Should not throw error, but handle it gracefully
      expect(true).toBe(true);
    });
  });

  describe('Subdomain Router', () => {
    test('should render loading state initially', () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <SubdomainRouter>
              <div>Test Content</div>
            </SubdomainRouter>
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByText('Loading school context...')).toBeInTheDocument();
    });

    test('should handle cross-school redirect', async () => {
      window.location.hostname = 'wrong-school.schoolshubs.com';
      
      render(
        <BrowserRouter>
          <AuthProvider>
            <SubdomainRouter>
              <div>Test Content</div>
            </SubdomainRouter>
          </AuthProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Redirecting to correct school/)).toBeInTheDocument();
      });
    });

    test('should handle main domain redirect for school-specific paths', async () => {
      window.location.hostname = 'schoolshubs.com';
      window.location.pathname = '/teacher/dashboard';
      
      render(
        <BrowserRouter>
          <AuthProvider>
            <SubdomainRouter>
              <div>Test Content</div>
            </SubdomainRouter>
          </AuthProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/School-specific pages require school subdomain access/)).toBeInTheDocument();
      });
    });
  });

  describe('School Dashboard', () => {
    const mockSchoolContext = {
      id: 'school-123',
      name: 'Test School',
      domain: 'test-school.schoolshubs.com',
      subdomain: 'test-school',
      city: 'Test City',
      type: 'secondary'
    };

    const mockUser = {
      id: 'user-123',
      email: 'teacher@test.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'teacher',
      school_id: 'school-123'
    };

    test('should render school header with branding', () => {
      render(
        <BrowserRouter>
          <AuthProvider value={{ user: mockUser, school: mockSchoolContext, isAuthenticated: true }}>
            <SchoolDashboard userRole="teacher" />
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByText('Test School')).toBeInTheDocument();
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
    });

    test('should render stat cards based on user role', () => {
      render(
        <BrowserRouter>
          <AuthProvider value={{ user: mockUser, school: mockSchoolContext, isAuthenticated: true }}>
            <SchoolDashboard userRole="teacher" />
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByText('Total Exams')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('To Grade')).toBeInTheDocument();
    });

    test('should render student-specific stats', () => {
      const studentUser = { ...mockUser, role: 'student' };
      
      render(
        <BrowserRouter>
          <AuthProvider value={{ user: studentUser, school: mockSchoolContext, isAuthenticated: true }}>
            <SchoolDashboard userRole="student" />
          </AuthProvider>
        </BrowserRouter>
      );
      
      expect(screen.getByText('Total Exams')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Average Score')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Cross-Domain Authentication', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should initiate transfer with correct data', () => {
      const loginData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        school: { id: 'school-123', name: 'Test School' },
        redirectTo: 'https://test-school.schoolshubs.com/dashboard'
      };

      const transferData = crossDomainAuth.initiateTransfer(loginData, 'test-school.schoolshubs.com');
      
      expect(transferData.sourceDomain).toBe('test-school.schoolshubs.com');
      expect(transferData.targetDomain).toBe('test-school.schoolshubs.com');
      expect(transferData.token).toBe('mock-token');
      expect(transferData.user).toEqual(loginData.user);
    });

    test('should store transfer data in sessionStorage', () => {
      const loginData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' }
      };

      crossDomainAuth.initiateTransfer(loginData, 'test-school.schoolshubs.com');
      
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'auth-transfer-data',
        expect.stringContaining('mock-token')
      );
    });

    test('should handle incoming transfer correctly', async () => {
      const transferData = {
        transferId: 'transfer_123456789',
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        school: { id: 'school-123', name: 'Test School' },
        targetDomain: 'test-school.schoolshubs.com',
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000)
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(transferData));
      
      window.location.search = '?transferId=transfer_123456789';
      window.location.hostname = 'test-school.schoolshubs.com';

      const result = await crossDomainAuth.handleIncomingTransfer('transfer_123456789');
      
      expect(result.token).toBe('mock-token');
      expect(result.user).toEqual(transferData.user);
      expect(result.school).toEqual(transferData.school);
    });

    test('should reject expired transfer', async () => {
      const expiredTransferData = {
        transferId: 'transfer_expired',
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        targetDomain: 'test-school.schoolshubs.com',
        timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
        expiresAt: Date.now() - (5 * 60 * 1000) // 5 minutes ago
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(expiredTransferData));
      window.location.search = '?transferId=transfer_expired';
      
      await expect(crossDomainAuth.handleIncomingTransfer('transfer_expired')).rejects.toThrow('Transfer has expired');
    });

    test('should reject invalid transfer ID', async () => {
      sessionStorageMock.getItem.mockReturnValue(JSON.stringify({
        transferId: 'different-id',
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' }
      }));
      
      window.location.search = '?transferId=wrong-id';
      
      await expect(crossDomainAuth.handleIncomingTransfer('wrong-id')).rejects.toThrow('Invalid transfer ID');
    });
  });

  describe('Cross-Domain Data Storage', () => {
    test('should store subdomain login data', () => {
      const loginData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        school: { id: 'school-123', name: 'Test School' },
        redirectTo: 'https://test-school.schoolshubs.com/dashboard'
      };

      storeSubdomainLoginData(loginData);
      
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'subdomainLoginData',
        expect.stringContaining('mock-token')
      );
    });

    test('should retrieve stored subdomain login data', () => {
      const loginData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        school: { id: 'school-123', name: 'Test School' }
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(loginData));
      
      const result = getStoredSubdomainLoginData();
      
      expect(result).toEqual(loginData);
    });

    test('should clear expired login data', () => {
      const expiredData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com' },
        expiresAt: Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));
      
      const result = getStoredSubdomainLoginData();
      
      expect(result).toBeNull();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('subdomainLoginData');
    });
  });

  describe('AuthContext Integration', () => {
    test('should initialize with subdomain context', async () => {
      window.location.hostname = 'test-school.schoolshubs.com';
      
      const loginData = {
        token: 'mock-token',
        user: { id: 'user-123', email: 'test@test.com', school_id: 'school-123' },
        school: { id: 'school-123', name: 'Test School' }
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(loginData));

      render(
        <BrowserRouter>
          <AuthProvider>
            <SubdomainRouter>
              <div>Test Content</div>
            </SubdomainRouter>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(document.querySelector('.subdomain-app')).toBeInTheDocument();
        expect(document.querySelector('[data-subdomain="test-school"]')).toBeInTheDocument();
      });
    });

    test('useSubdomainContext should return correct context', () => {
      window.location.hostname = 'test-school.schoolshubs.com';
      
      const TestComponent = () => {
        const { isOnSubdomain, currentSubdomain } = require('../components/SubdomainRouter').useSubdomainContext();
        return (
          <div>
            <span data-testid="subdomain-status">{isOnSubdomain ? 'on-subdomain' : 'not-on-subdomain'}</span>
            <span data-testid="current-subdomain">{currentSubdomain || 'no-subdomain'}</span>
          </div>
        );
      };

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('subdomain-status')).toHaveTextContent('on-subdomain');
      expect(screen.getByTestId('current-subdomain')).toHaveTextContent('test-school');
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      apiClient.get.mockRejectedValue(new Error('API Error'));
      
      const TestComponent = () => {
        const [error, setError] = React.useState(null);
        
        React.useEffect(() => {
          apiClient.get('/dashboard/stats').catch(err => setError(err.message));
        }, []);

        return (
          <div>
            {error && <div data-testid="error">{error}</div>}
            <div data-testid="content">Content</div>
          </div>
        );
      };

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('API Error');
      });
    });

    test('should handle network errors', async () => {
      apiClient.get.mockRejectedValue(new Error('Network Error'));
      
      const TestComponent = () => {
        const [error, setError] = React.useState(null);
        
        React.useEffect(() => {
          apiClient.get('/dashboard/stats').catch(err => setError(err.message));
        }, []);

        return (
          <div>
            {error && <div data-testid="error">{error}</div>}
            <div data-testid="content">Content</div>
          </div>
        );
      };

      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network Error');
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete login flow with subdomain redirect', async () => {
      // Mock login response with redirect
      const loginResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: 'teacher@test.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'teacher',
          school_id: 'school-123'
        },
        school: {
          id: 'school-123',
          name: 'Test School',
          domain: 'test-school.schoolshubs.com',
          subdomain: 'test-school'
        },
        redirectTo: 'https://test-school.schoolshubs.com/teacher/dashboard'
      };

      apiClient.login.mockResolvedValue(loginResponse);

      // Mock AuthContext login
      const mockLogin = jest.fn().mockResolvedValue(loginResponse);
      const { AuthProvider } = require('../context/AuthContext');
      const { useAuth } = require('../context/AuthContext');
      
      const LoginTest = () => {
        const { login } = useAuth();
        React.useEffect(() => {
          login('teacher@test.com', 'password123', true);
        }, [login]);
        return <div data-testid="auth-content">Auth Content</div>;
      };

      window.location.hostname = 'test-school.schoolshubs.com';
      render(
        <BrowserRouter>
          <AuthProvider>
            <LoginTest />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(loginResponse.user));
        expect(localStorageMock.setItem).toHaveBeenCalledWith('school', JSON.stringify(loginResponse.school));
      });
    });

    test('should handle cross-domain authentication transfer', async () => {
      // Mock stored login data from cross-domain transfer
      const storedData = {
        token: 'cross-domain-token',
        user: {
          id: 'user-123',
          email: 'teacher@test.com',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'teacher',
          school_id: 'school-123'
        },
        school: {
          id: 'school-123',
          name: 'Test School',
          domain: 'test-school.schoolshubs.com'
        }
      };

      sessionStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      window.location.hostname = 'test-school.schoolshubs.com';

      render(
        <BrowserRouter>
          <AuthProvider>
            <SubdomainRouter>
              <div data-testid="auth-content">Auth Content</div>
            </SubdomainRouter>
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(document.querySelector('.subdomain-app')).toBeInTheDocument();
        // The AuthContext should have loaded the stored data
      });
    });

    test('should render school-branded dashboard', async () => {
      const mockSchoolContext = {
        id: 'school-123',
        name: 'Test School',
        domain: 'test-school.schoolshubs.com',
        subdomain: 'test-school',
        city: 'Test City',
        type: 'secondary'
      };

      const mockUser = {
        id: 'user-123',
        email: 'teacher@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'teacher',
        school_id: 'school-123'
      };

      render(
        <BrowserRouter>
          <AuthProvider value={{ user: mockUser, school: mockSchoolContext, isAuthenticated: true }}>
            <SchoolDashboard userRole="teacher" />
          </AuthProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test School')).toBeInTheDocument();
        expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Welcome back, John!')).toBeInTheDocument();
        expect(screen.getByText('Here\'s what\'s happening at Test School')).toBeInTheDocument();
      });
    });
  });
});
