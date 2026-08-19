/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const LicenseContext = createContext({
  licenseState: null,
  refreshState: async () => {},
});

export function LicenseProvider({ children }) {
  const [licenseState, setLicenseState] = useState(null);

  const refreshState = useCallback(async () => {
    try {
      const { state } = await window.api.getLicenseState();
      setLicenseState(state);
    } catch (err) {
      console.error('[LicenseContext] Failed to get license state:', err);
      setLicenseState('trial');
    }
  }, []);

  useEffect(() => {
    refreshState();

    const unsubscribe = window.api.onLicenseTransactionUpdated((tx) => {
      if (tx.type === 'purchased' || tx.type === 'restored') {
        setLicenseState('permanent');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refreshState]);

  return (
    <LicenseContext.Provider value={{ licenseState, refreshState }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}

export default LicenseContext;
