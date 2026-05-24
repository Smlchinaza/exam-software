import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { statesApi } from '../services/statesApi';

const StateSelector = ({ selectedState, onStateChange, error = '', disabled = false }) => {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStates = async () => {
      setLoading(true);
      try {
        const data = await statesApi.getAllStates();
        if (!isMounted) return;
        setStates(data.states || data || []);
      } catch (err) {
        console.error('Failed to load states:', err);
        if (isMounted) setStates([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const selectedId = event.target.value;
    const nextState = states.find((state) => {
      return state.id?.toString() === selectedId || state.abbreviation === selectedId || state.name === selectedId;
    });
    onStateChange(nextState || null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm sm:text-base font-medium text-gray-700">
        Select State <span className="text-red-500">*</span>
      </label>

      <div>
        <select
          value={selectedState?.id ?? ''}
          onChange={handleChange}
          disabled={disabled || loading}
          className={`w-full appearance-none rounded-lg border px-4 py-3 pr-10 text-sm sm:text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="" disabled>
            {loading ? 'Loading states...' : 'Select a state'}
          </option>
          {states.map((stateItem) => (
            <option key={stateItem.id || stateItem.abbreviation || stateItem.name} value={stateItem.id ?? stateItem.abbreviation ?? stateItem.name}>
              {stateItem.name} {stateItem.abbreviation ? `(${stateItem.abbreviation})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedState && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Selected state: {selectedState.name}
        </div>
      )}

      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default StateSelector;
