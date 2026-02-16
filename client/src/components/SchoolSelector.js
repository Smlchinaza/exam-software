import React, { useState, useEffect, useCallback } from 'react';
import { Search, Building, MapPin, AlertCircle, Plus, Loader } from 'lucide-react';
import { statesApi } from '../services/statesApi';

const SchoolSelector = ({ 
  selectedState, 
  selectedSchool, 
  onSchoolChange, 
  error, 
  disabled = false,
  onRequestNewSchool 
}) => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const fetchSchools = useCallback(async (query = '') => {
    if (!selectedState) return;
    
    try {
      setLoading(true);
      
      let data;
      if (query) {
        data = await statesApi.searchSchools(query, selectedState.id);
      } else {
        data = await statesApi.getSchoolsByState(selectedState.id);
      }
      
      setSchools(data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedState) {
      fetchSchools();
    } else {
      setSchools([]);
    }
  }, [selectedState, fetchSchools]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchSchools(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSchoolSelect = (school) => {
    onSchoolChange(school);
    setSearchQuery('');
  };

  const handleRequestNewSchool = () => {
    setShowRequestForm(true);
  };


  if (showRequestForm) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Plus className="h-5 w-5 text-yellow-600 mr-2" />
          <h3 className="text-lg font-medium text-yellow-800">Request New School Registration</h3>
        </div>
        <p className="text-yellow-700 mb-4">
          Don't see your school? Request to add it to our platform.
        </p>
        <button
          onClick={onRequestNewSchool}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Continue with Request
        </button>
        <button
          onClick={() => setShowRequestForm(false)}
          className="ml-2 px-4 py-2 text-yellow-700 hover:text-yellow-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select School <span className="text-red-500">*</span>
        </label>
        
        {!selectedState ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            Please select a state first
          </div>
        ) : (
          <>
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search schools..."
                value={searchQuery}
                onChange={handleSearch}
                disabled={disabled || loading}
                className={`
                  w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${error ? 'border-red-500' : 'border-gray-300'}
                  ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                `}
              />
              {loading && (
                <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Schools List */}
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto bg-white">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  Loading schools...
                </div>
              ) : schools.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <div className="mb-4">
                    {searchQuery ? 'No schools found matching your search.' : 'No schools found in this state.'}
                  </div>
                  <button
                    onClick={handleRequestNewSchool}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request New School
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => handleSchoolSelect(school)}
                      disabled={disabled}
                      className={`
                        w-full p-4 text-left hover:bg-gray-50 focus:bg-blue-50 focus:outline-none
                        transition-colors duration-150
                        ${selectedSchool?.id === school.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}
                        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                      `}
                    >
                      <div className="flex items-start">
                        <Building className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {school.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {school.city && <span className="mr-3">{school.city}</span>}
                            <span className="capitalize">{school.type}</span>
                            {school.is_public !== undefined && (
                              <span className="ml-2">
                                ({school.is_public ? 'Public' : 'Private'})
                              </span>
                            )}
                          </div>
                          {school.domain && (
                            <div className="text-xs text-blue-600 mt-1 truncate">
                              {school.domain}
                            </div>
                          )}
                        </div>
                        {selectedSchool?.id === school.id && (
                          <div className="ml-2">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Request New School Link */}
            {!loading && schools.length > 0 && (
              <div className="mt-3 text-center">
                <button
                  onClick={handleRequestNewSchool}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Don't see your school? Request to add it
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {selectedSchool && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-green-700">
            <Building className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">
              Selected: {selectedSchool.name}
            </span>
          </div>
          {selectedSchool.city && (
            <div className="text-xs text-green-600 mt-1 ml-6">
              {selectedSchool.city}, {selectedState?.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolSelector;
