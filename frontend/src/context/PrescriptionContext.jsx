import React, { createContext, useContext, useState } from 'react';

const PrescriptionContext = createContext(null);

export function PrescriptionProvider({ children }) {
  const [lastResult, setLastResult] = useState(null);
  const [processingHistory, setProcessingHistory] = useState([]);

  function saveResult(result) {
    setLastResult(result);
    setProcessingHistory(prev => [result, ...prev].slice(0, 20));
  }

  return (
    <PrescriptionContext.Provider value={{ lastResult, processingHistory, saveResult }}>
      {children}
    </PrescriptionContext.Provider>
  );
}

export function usePrescription() {
  return useContext(PrescriptionContext);
}
