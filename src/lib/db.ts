import type { Database } from './database.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type InventoryCount = Database['public']['Tables']['inventory_counts']['Row'];
export type CashCount = Database['public']['Tables']['cash_counts']['Row'];
export type CashCountLog = Database['public']['Tables']['cash_count_logs']['Row'];

// Use HTTPS for production, HTTP for development
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://24.144.105.125/api' 
  : 'https://24.144.105.125/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const INITIAL_BACKOFF = 1000; // Start with 1 second backoff

// Mock data for offline mode
const MOCK_PRODUCTS: Product[] = [
  {
    ean_code: 'OFFLINE001',
    name: 'Copo Descartável 200ml (Modo Demonstração)',
    category: 'Copos',
    initial_quantity: 100,
    image_url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?q=80&w=2340&auto=format&fit=crop',
    package_quantity: 100,
    package_type: 'Pacote',
    purchase_price: 5.00,
    sale_price: 10.00,
    supplier: 'Fornecedor Demo',
    active: true,
    created_at: new Date().toISOString(),
    deleted_at: null,
    last_price_change: null,
    last_supplier_change: null,
    last_purchase_price_change: null,
    previous_sale_price: null,
    previous_supplier: null,
    previous_purchase_price: null,
    organization_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    ean_code: 'OFFLINE002',
    name: 'Copo Térmico 300ml (Modo Demonstração)',
    category: 'Copos',
    initial_quantity: 50,
    image_url: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?q=80&w=2187&auto=format&fit=crop',
    package_quantity: 10,
    package_type: 'Caixa',
    purchase_price: 15.00,
    sale_price: 30.00,
    supplier: 'Fornecedor Demo',
    active: true,
    created_at: new Date().toISOString(),
    deleted_at: null,
    last_price_change: null,
    last_supplier_change: null,
    last_purchase_price_change: null,
    previous_sale_price: null,
    previous_supplier: null,
    previous_purchase_price: null,
    organization_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    ean_code: 'OFFLINE003',
    name: 'Guardanapo (Modo Demonstração)',
    category: 'Descartáveis',
    initial_quantity: 200,
    image_url: 'https://images.unsplash.com/photo-1563891217861-7924b471afb3?q=80&w=2187&auto=format&fit=crop',
    package_quantity: 50,
    package_type: 'Pacote',
    purchase_price: 2.50,
    sale_price: 5.00,
    supplier: 'Fornecedor Demo',
    active: true,
    created_at: new Date().toISOString(),
    deleted_at: null,
    last_price_change: null,
    last_supplier_change: null,
    last_purchase_price_change: null,
    previous_sale_price: null,
    previous_supplier: null,
    previous_purchase_price: null,
    organization_id: '00000000-0000-0000-0000-000000000000'
  }
];

const MOCK_INVENTORY_COUNTS: InventoryCount[] = [
  {
    id: 'mock-id-1',
    ean_code: 'OFFLINE001',
    quantity: 100,
    counted_at: new Date().toISOString(),
    organization_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    id: 'mock-id-2',
    ean_code: 'OFFLINE002',
    quantity: 50,
    counted_at: new Date().toISOString(),
    organization_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    id: 'mock-id-3',
    ean_code: 'OFFLINE003',
    quantity: 200,
    counted_at: new Date().toISOString(),
    organization_id: '00000000-0000-0000-0000-000000000000'
  }
];

// Mock cash counts with realistic data
const MOCK_CASH_COUNTS: CashCount[] = [
  {
    id: 'mock-cash-1',
    date: new Date().toISOString(),
    notes: {
      "2": 5,
      "5": 10,
      "10": 5,
      "20": 3,
      "50": 1,
      "100": 0
    },
    coins: {
      "0.05": 10,
      "0.10": 20,
      "0.25": 15,
      "0.50": 10,
      "1.00": 5
    },
    total: 250.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    comments: "Contagem de demonstração",
    organization_id: '00000000-0000-0000-0000-000000000000'
  }
];

class InventoryDB {
  private retryCount = 0;
  private offlineMode = true; // Start in offline mode by default

  constructor() {
    // Check if we're in offline mode from the start
    this.checkOfflineMode();
  }

  private async checkOfflineMode() {
    try {
      const isConnected = await this.checkConnection();
      this.offlineMode = !isConnected;
      console.log(`Initial connection check: ${isConnected ? 'online' : 'offline'} mode`);
    } catch (error) {
      this.offlineMode = true;
      console.log('Error in initial connection check, defaulting to offline mode');
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Use a simple GET request to check connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Connection check failed:', error);
      return false;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, offlineFallback?: () => T): Promise<T> {
    // If we're in offline mode and have a fallback, use it immediately
    if (this.offlineMode && offlineFallback) {
      console.log('Using offline fallback data (already in offline mode)');
      return offlineFallback();
    }
    
    this.retryCount = 0; // Reset retry count at the beginning of each operation
    
    while (this.retryCount < MAX_RETRIES) {
      try {
        // Check connection before each operation
        const isConnected = await this.checkConnection();
        if (!isConnected) {
          console.warn('No connection to server, operation will fail');
          this.offlineMode = true;
          throw new Error('Sem conexão com o servidor');
        }

        this.offlineMode = false;

        // Execute the operation
        const result = await operation();
        
        // Reset retry count on success
        this.retryCount = 0;
        return result;

      } catch (error: any) {
        this.retryCount++;
        console.error(`Operation attempt ${this.retryCount} failed:`, error);

        if (this.retryCount >= MAX_RETRIES) {
          this.retryCount = 0;
          
          // If we have an offline fallback and we're in offline mode, use it
          if (offlineFallback) {
            console.log('Using offline fallback data after retries');
            this.offlineMode = true;
            return offlineFallback();
          }
          
          throw new Error('Não foi possível completar a operação. Por favor, verifique sua conexão e tente novamente.');
        }

        // Wait before retrying with exponential backoff
        const backoffTime = INITIAL_BACKOFF * Math.pow(2, this.retryCount - 1);
        await this.delay(backoffTime);
      }
    }

    throw new Error('Erro inesperado');
  }

  async getProducts() {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
    }, () => MOCK_PRODUCTS);
  }

  async addProduct(product: Omit<Product, 'created_at'>) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(product)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error adding product:', error);
        throw error;
      }
    });
  }

  async updateProduct(eanCode: string, updates: Partial<Product>) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/products/${eanCode}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error updating product:', error);
        throw error;
      }
    });
  }

  async deleteProduct(eanCode: string) {
    return this.executeWithRetry(async () => {
      try {
        const updates = {
          active: false,
          deleted_at: new Date().toISOString()
        };
        
        const response = await fetch(`${API_URL}/products/${eanCode}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        throw error;
      }
    });
  }

  async addInventoryCount(eanCode: string, quantity: number) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/inventory-counts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ean_code: eanCode,
            quantity: quantity
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error adding inventory count:', error);
        throw error;
      }
    });
  }

  async getInventoryCounts() {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/inventory-counts`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching inventory counts:', error);
        throw error;
      }
    }, () => MOCK_INVENTORY_COUNTS);
  }

  async getLatestCount(eanCode: string) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/inventory-counts/latest/${eanCode}`);
        if (!response.ok && response.status !== 404) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (response.status === 404) {
          return null;
        }
        
        const data = await response.json();
        return data ? data.quantity : null;
      } catch (error) {
        console.error('Error fetching latest count:', error);
        throw error;
      }
    }, () => {
      const mockProduct = MOCK_PRODUCTS.find(p => p.ean_code === eanCode);
      return mockProduct?.initial_quantity || 0;
    });
  }

  async addCashCount(count: Omit<CashCount, 'id' | 'created_at' | 'updated_at'>) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/cash-counts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(count)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error adding cash count:', error);
        throw error;
      }
    });
  }

  async getCashCountByDate(date: Date) {
    return this.executeWithRetry(async () => {
      try {
        const formattedDate = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        const response = await fetch(`${API_URL}/cash-counts/date/${formattedDate}`);
        
        if (!response.ok && response.status !== 404) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (response.status === 404) {
          return null;
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching cash count by date:', error);
        throw error;
      }
    }, () => {
      // Return the mock cash count with the date adjusted to match the requested date
      const mockCount = {...MOCK_CASH_COUNTS[0]};
      mockCount.date = new Date(date).toISOString();
      return mockCount;
    });
  }

  async getCashCountHistory(startDate: Date, endDate: Date) {
    return this.executeWithRetry(async () => {
      try {
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];
        
        const response = await fetch(`${API_URL}/cash-counts/history?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching cash count history:', error);
        throw error;
      }
    }, () => MOCK_CASH_COUNTS);
  }

  async getCashCounts() {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/cash-counts`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching cash counts:', error);
        throw error;
      }
    }, () => MOCK_CASH_COUNTS);
  }

  async updateCashCount(id: string, updates: Partial<CashCount>) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/cash-counts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error updating cash count:', error);
        throw error;
      }
    });
  }

  async addCashCountLog(log: Omit<CashCountLog, 'id'>) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/cash-count-logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(log)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error adding cash count log:', error);
        throw error;
      }
    });
  }

  async getCashCountLogs(cashCountId: string) {
    return this.executeWithRetry(async () => {
      try {
        const response = await fetch(`${API_URL}/cash-count-logs/${cashCountId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching cash count logs:', error);
        throw error;
      }
    }, () => []);
  }

  // Check if we're in offline mode
  isOffline() {
    return this.offlineMode;
  }

  // Force offline mode (useful for testing)
  setOfflineMode(offline: boolean) {
    this.offlineMode = offline;
  }
}

export const db = new InventoryDB();