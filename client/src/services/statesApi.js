// services/statesApi.js
// API service for states management

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:5000';

export const statesApi = {
  // Get all active states
  getAllStates: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/states`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON but received ${contentType}`);
      }

      return await response.json();
    } catch (error) {
      console.error('States API Error:', error);
      throw error;
    }
  },

  // Get schools by state
  getSchoolsByState: async (stateId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schools/by-state/${stateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch schools: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Schools by State API Error:', error);
      throw error;
    }
  },

  // Search schools
  searchSchools: async (query, stateId = null) => {
    try {
      const params = new URLSearchParams({
        q: query,
        ...(stateId && { stateId })
      });

      const response = await fetch(`${API_BASE_URL}/api/schools/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search schools: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Schools Search API Error:', error);
      throw error;
    }
  }
};
