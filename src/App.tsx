import React, { useState, useEffect } from 'react';
import { Operacional } from './pages/Operacional.tsx';
import { Completo } from './pages/Completo.tsx';
import { CashFlow } from './components/CashFlow.tsx';
import { Package, Wallet, Settings } from 'lucide-react';
import { ConnectionStatus } from './components/ConnectionStatus';

const ADMIN_PASSWORD = 'Dws#142893';
const ADMIN_ACCESS_KEY = 'admin_last_access';

export default function App() {
  const [currentView, setCurrentView] = useState<'operacional' | 'caixa' | 'completo'>('operacional');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin access is still valid
    const lastAccess = localStorage.getItem(ADMIN_ACCESS_KEY);
    if (lastAccess) {
      const lastAccessDate = new Date(lastAccess);
      const now = new Date();
      const hoursSinceLastAccess = (now.getTime() - lastAccessDate.getTime()) / (1000 * 60 * 60);
      
      // If less than 24 hours have passed, auto-grant admin access
      if (hoursSinceLastAccess < 24 && currentView === 'completo') {
        setCurrentView('completo');
      }
    }
  }, [currentView]);

  const handleAdminAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      // Store the current timestamp
      localStorage.setItem(ADMIN_ACCESS_KEY, new Date().toISOString());
      setCurrentView('completo');
      setShowPasswordModal(false);
      setPassword('');
      setError('');
    } else {
      setError('Senha incorreta');
    }
  };

  const handleAdminClick = () => {
    const lastAccess = localStorage.getItem(ADMIN_ACCESS_KEY);
    if (lastAccess) {
      const lastAccessDate = new Date(lastAccess);
      const now = new Date();
      const hoursSinceLastAccess = (now.getTime() - lastAccessDate.getTime()) / (1000 * 60 * 60);
      
      // If less than 24 hours have passed, grant access without password
      if (hoursSinceLastAccess < 24) {
        setCurrentView('completo');
        return;
      }
    }
    
    // Otherwise, show password modal
    setShowPasswordModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#dfac32] shadow">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <img 
              src="https://i.ibb.co/1G5gWTys/logo-fundo-vazado.png" 
              alt="Rei dos Copos" 
              className="h-32 w-auto object-contain"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            onClick={() => setCurrentView('operacional')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'operacional'
                ? 'bg-[#dfac32] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            Estoque e Pedidos
          </button>
          <button
            onClick={() => setCurrentView('caixa')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'caixa'
                ? 'bg-[#dfac32] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Wallet className="w-5 h-5" />
            Fluxo de Caixa
          </button>
          <button
            onClick={handleAdminClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentView === 'completo'
                ? 'bg-[#dfac32] text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title="Administração"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentView === 'operacional' && <Operacional />}
        {currentView === 'caixa' && <CashFlow />}
        {currentView === 'completo' && <Completo />}
      </main>

      <ConnectionStatus />

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Acesso Administrativo</h2>
            <form onSubmit={handleAdminAccess}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#dfac32]"
                  autoFocus
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d]"
                >
                  Acessar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}