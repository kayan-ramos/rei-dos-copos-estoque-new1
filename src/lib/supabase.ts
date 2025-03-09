// This file is kept for compatibility but no longer used
// All database operations now go through the DigitalOcean API

export const checkConnection = async () => {
  try {
    // Use a simple GET request to check connection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('http://24.144.105.125/api/health', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Connection check failed:', error);
    return false;
  }
};

export const ensureAuthenticated = async () => {
  // No authentication needed for the new API
  return Promise.resolve();
};

export const addConnectionStateListener = (listener: (state: boolean) => void) => {
  // Immediately notify the new listener of the current state
  checkConnection().then(isConnected => {
    listener(isConnected);
  });
  
  return () => {
    // No cleanup needed
  };
};

export const getConnectionState = async () => {
  return await checkConnection();
};

export const setConnectionState = () => {
  // This function is no longer needed
};

export const startConnectionMonitoring = () => {
  const interval = setInterval(async () => {
    const isConnected = await checkConnection();
    // Notify any listeners if needed
  }, 30000);
  
  return () => {
    clearInterval(interval);
  };
};

// Start connection monitoring
startConnectionMonitoring();