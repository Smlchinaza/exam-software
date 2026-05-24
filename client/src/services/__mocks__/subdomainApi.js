// Manual mock for subdomainApi used by tests
class SubdomainApiClient {
  constructor() {
    this.baseURL = 'http://localhost:5000/api';
    this.isSubdomain = false;
    this.subdomain = null;
    this.schoolContext = null;
    this.axios = {
      mockClear: jest.fn(),
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          handlers: [],
          use: (fulfilled, rejected) => {
            this.axios.interceptors.request.handlers.push({ fulfilled, rejected });
          }
        },
        response: {
          handlers: [],
          use: (fulfilled, rejected) => {
            this.axios.interceptors.response.handlers.push({ fulfilled, rejected });
          }
        }
      }
    };
    this.login = jest.fn();
    this.logout = jest.fn();
    this.getSchoolInfo = jest.fn();
    this.updateSchoolContext = jest.fn();
    this.markNotificationAsRead = jest.fn();
  }
}

const apiClient = new SubdomainApiClient();
apiClient.get = apiClient.axios.get;
apiClient.post = apiClient.axios.post;
apiClient.put = apiClient.axios.put;
apiClient.patch = apiClient.axios.patch;
apiClient.delete = apiClient.axios.delete;
apiClient.mockClear = jest.fn(() => {
  apiClient.axios.mockClear();
  apiClient.get.mockClear();
  apiClient.post.mockClear();
  apiClient.put.mockClear();
  apiClient.patch.mockClear();
  apiClient.delete.mockClear();
});

module.exports = apiClient;
module.exports.SubdomainApiClient = SubdomainApiClient;
module.exports.default = apiClient;
module.exports.__esModule = true;
