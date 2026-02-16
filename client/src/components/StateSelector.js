import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, AlertCircle } from 'lucide-react';
import { statesApi } from '../services/statesApi';

const StateSelector = ({ selectedState, onStateChange, error, disabled = false }) => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      console.log('Fetching states using statesApi...');
      
      const data = await statesApi.getAllStates();
      console.log('States data received:', data.length, 'states');
      setStates(data);
    } catch (err) {
      console.error('Error fetching states:', err);
      console.error('Error details:', err.message);
      setFetchError(err.message);
      // Set empty array to prevent infinite loading
      setStates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStateSelect = (state) => {
    onStateChange(state);
    setIsOpen(false);
  };

  const selectedStateName = selectedState ? selectedState.name : '';

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select State <span className="text-red-500">*</span>
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`
            w-full flex items-center justify-between px-4 py-3 text-left bg-white border
            rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            transition-colors duration-200
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          `}
        >
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-3" />
            <span className={selectedStateName ? 'text-gray-900' : 'text-gray-500'}>
              {loading ? 'Loading states...' : selectedStateName || 'Select your state'}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="py-1">
              {fetchError ? (
                <div className="px-4 py-3 text-red-600 text-center">
                  <AlertCircle className="h-4 w-4 mx-auto mb-2" />
                  <div className="text-sm">Error loading states</div>
                  <div className="text-xs mt-1">{fetchError}</div>
                  <button 
                    onClick={fetchStates}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : states.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-center">
                  {loading ? 'Loading states...' : 'No states available'}
                </div>
              ) : (
                states.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => handleStateSelect(state)}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-blue-50 focus:outline-none
                      transition-colors duration-150 flex items-center
                      ${selectedState?.id === state.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}
                    `}
                  >
                    <MapPin className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{state.name}</div>
                      <div className="text-xs text-gray-500">{state.code}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      {selectedState && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center text-blue-700">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">
              Selected: {selectedState.name}, {selectedState.code}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateSelector;
