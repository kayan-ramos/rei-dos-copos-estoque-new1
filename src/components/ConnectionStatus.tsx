import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Database } from 'lucide-react';
import { db } from '../lib/db';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      const connected = await db.checkConnection();
      setIsConnected(connected);
      setOfflineMode(db.isOffline());
    } catch (error) {
      setIsConnected(false);
      setOfflineMode(db.isOffline());
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await checkConnectionStatus();
    setRetrying(false);
  };

  useEffect(() => {
    // Initial check
    checkConnectionStatus();
    
    // Set up interval for periodic checks
    const interval = setInterval(checkConnectionStatus, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isConnected && !offlineMode) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-center gap-3 z-50">
      {offlineMode ? (
        <Database className="w-5 h-5 text-yellow-500" />
      ) : (
        <WifiOff className="w-5 h-5 text-red-500" />
      )}
      <div>
        {offlineMode ? (
          <>
            <p className="text-yellow-700 font-medium">Modo Offline</p>
            <p className="text-sm text-yellow-600">Usando dados de demonstração</p>
          </>
        ) : (
          <>
            <p className="text-red-700 font-medium">Sem conexão com o servidor</p>
            <p className="text-sm text-red-600">Verifique sua conexão com a internet</p>
          </>
        )}
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        className={`ml-4 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-2 ${
          retrying ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
        Tentar novamente
      </button>
    </div>
  );
}