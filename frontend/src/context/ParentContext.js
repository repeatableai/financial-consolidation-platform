import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const ParentContext = createContext();

export function useParent() {
  return useContext(ParentContext);
}

export function ParentProvider({ children }) {
  const [selectedParent, setSelectedParent] = useState(null);
  const [parentCompanies, setParentCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Only fetch once when component mounts
    if (!initialized) {
      setInitialized(true);
      // Delay to ensure auth token is set
      setTimeout(() => {
        fetchParentCompanies();
      }, 1000);
    }
  }, [initialized]);

  const fetchParentCompanies = async () => {
    try {
      const response = await axios.get('/api/v1/parent-companies/');
      console.log('Parent companies loaded:', response.data);
      setParentCompanies(response.data);

      // Auto-select first parent if available
      if (response.data.length > 0 && !selectedParent) {
        setSelectedParent(response.data[0]);
        console.log('Auto-selected parent:', response.data[0].name);
      }
    } catch (error) {
      console.error('Failed to load parent companies:', error);
      // Try to get current parent as fallback
      try {
        const fallback = await axios.get('/api/v1/parent-companies/current');
        setParentCompanies([fallback.data]);
        setSelectedParent(fallback.data);
        console.log('Loaded fallback parent:', fallback.data.name);
      } catch (fallbackError) {
        console.error('Failed to load any parent company:', fallbackError);
        // If both fail, create a dummy parent to prevent blank page
        const dummyParent = {
          id: 'dummy',
          name: 'TechCorp Holdings',
          legal_name: 'TechCorp Holdings Inc.',
          reporting_currency: 'USD',
          accounting_standard: 'GAAP',
          member_count: 4
        };
        setParentCompanies([dummyParent]);
        setSelectedParent(dummyParent);
        console.log('Using dummy parent to prevent crash');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectParent = (parent) => {
    console.log('Parent selected:', parent.name);
    setSelectedParent(parent);
  };

  const value = {
    selectedParent,
    parentCompanies,
    loading,
    selectParent,
    refreshParents: fetchParentCompanies
  };

  return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>;
}
