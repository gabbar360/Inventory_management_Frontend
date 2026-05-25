import { useState, useEffect } from 'react';

export interface Country {
  name: string;
  code: string;
}

export interface State {
  name: string;
  code?: string;
}

export interface UseLocationDataReturn {
  countries: Country[];
  states: State[];
  cities: string[];
  selectedCountry: string;
  selectedState: string;
  selectedCity: string;
  setSelectedCountry: (country: string) => void;
  setSelectedState: (state: string) => void;
  setSelectedCity: (city: string) => void;
  loading: {
    countries: boolean;
    states: boolean;
    cities: boolean;
  };
}

const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,cca2';
const STATES_API = 'https://countriesnow.space/api/v0.1/countries/states';
const CITIES_API = 'https://countriesnow.space/api/v0.1/countries/state/cities';

let countriesCache: Country[] = [];
let statesCache: Record<string, State[]> = {};
let citiesCache: Record<string, string[]> = {};

export const useLocationData = (): UseLocationDataReturn => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState({
    countries: false,
    states: false,
    cities: false,
  });

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    if (selectedCountry) {
      fetchStates(selectedCountry);
      setSelectedState('');
      setSelectedCity('');
      setCities([]);
    }
  }, [selectedCountry]);

  // Fetch cities when state changes
  useEffect(() => {
    if (selectedCountry && selectedState) {
      fetchCities(selectedCountry, selectedState);
      setSelectedCity('');
    }
  }, [selectedCountry, selectedState]);

  const fetchCountries = async () => {
    if (countriesCache.length > 0) {
      setCountries(countriesCache);
      return;
    }

    setLoading(prev => ({ ...prev, countries: true }));
    try {
      const response = await fetch(COUNTRIES_API);
      const data = await response.json();
      const formattedCountries: Country[] = data
        .map((country: any) => ({
          name: country.name.common,
          code: country.cca2,
        }))
        .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
      
      countriesCache = formattedCountries;
      setCountries(formattedCountries);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const fetchStates = async (countryName: string) => {
    if (statesCache[countryName]) {
      setStates(statesCache[countryName]);
      return;
    }

    setLoading(prev => ({ ...prev, states: true }));
    try {
      const response = await fetch(STATES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName }),
      });
      const data = await response.json();
      
      if (data.data && data.data.states) {
        const formattedStates: State[] = data.data.states
          .map((state: any) => ({
            name: state.name,
            code: state.state_code,
          }))
          .sort((a: State, b: State) => a.name.localeCompare(b.name));
        
        statesCache[countryName] = formattedStates;
        setStates(formattedStates);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  const fetchCities = async (countryName: string, stateName: string) => {
    const cacheKey = `${countryName}-${stateName}`;
    if (citiesCache[cacheKey]) {
      setCities(citiesCache[cacheKey]);
      return;
    }

    setLoading(prev => ({ ...prev, cities: true }));
    try {
      const response = await fetch(CITIES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName }),
      });
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const sortedCities = data.data.sort((a: string, b: string) => a.localeCompare(b));
        citiesCache[cacheKey] = sortedCities;
        setCities(sortedCities);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  return {
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
  };
};
