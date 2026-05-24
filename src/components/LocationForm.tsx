import { useState } from 'react';
import { useLocationData } from '@/hooks/useLocationData';
import { SearchableDropdown } from './SearchableDropdown';

interface FormData {
  country: string;
  state: string;
  city: string;
}

export const LocationForm = () => {
  const {
    countries,
    states,
    cities,
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    loading,
  } = useLocationData();

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCountry || !selectedState || !selectedCity) {
      alert('Please select Country, State, and City');
      return;
    }

    const formData: FormData = {
      country: selectedCountry,
      state: selectedState,
      city: selectedCity,
    };

    console.log('Form Submitted:', formData);
    setSubmitted(true);

    // Reset after 2 seconds
    setTimeout(() => {
      setSubmitted(false);
    }, 2000);
  };

  const countryOptions = countries.map(c => ({ name: c.name, code: c.code }));
  const stateOptions = states.map(s => ({ name: s.name, code: s.code }));
  const cityOptions = cities.map(c => ({ name: c }));

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Location Selector</h1>
        <p className="text-gray-600 mb-8">Select your Country, State, and City</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Country Dropdown */}
          <SearchableDropdown
            label="Country"
            value={selectedCountry}
            options={countryOptions}
            onChange={setSelectedCountry}
            placeholder="Select a country..."
            loading={loading.countries}
            required
          />

          {/* State Dropdown */}
          <SearchableDropdown
            label="State"
            value={selectedState}
            options={stateOptions}
            onChange={setSelectedState}
            placeholder={selectedCountry ? 'Select a state...' : 'Select country first'}
            disabled={!selectedCountry}
            loading={loading.states}
            required
          />

          {/* City Dropdown */}
          <SearchableDropdown
            label="City"
            value={selectedCity}
            options={cityOptions}
            onChange={setSelectedCity}
            placeholder={selectedState ? 'Select a city...' : 'Select state first'}
            disabled={!selectedState}
            loading={loading.cities}
            required
          />

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Submit
          </button>
        </form>

        {/* Success Message */}
        {submitted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✓ Form submitted successfully!</p>
            <div className="mt-2 text-sm text-green-700 space-y-1">
              <p><strong>Country:</strong> {selectedCountry}</p>
              <p><strong>State:</strong> {selectedState}</p>
              <p><strong>City:</strong> {selectedCity}</p>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Debug Info:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Countries loaded: {countries.length}</p>
            <p>States loaded: {states.length}</p>
            <p>Cities loaded: {cities.length}</p>
            <p>Selected: {selectedCountry} → {selectedState} → {selectedCity}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
