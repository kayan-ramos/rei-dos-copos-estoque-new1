import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, Plus, Minus, X, Download, ChevronDown, ChevronUp, Calendar, Copy, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { db, CashCount } from '../lib/db';
import * as XLSX from 'xlsx';
import { RefreshButton } from './RefreshButton';

export function CashFlow() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cashCounts, setCashCounts] = useState<CashCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const counts = await db.getCashCounts();
      setCashCounts(counts);
    } catch (error) {
      console.error('Error loading cash counts:', error);
      setError('Não foi possível carregar os dados do fluxo de caixa. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-4 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-[#dfac32]" />
          <h2 className="text-xl font-semibold">Fluxo de Caixa</h2>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={loadData} loading={loading} />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t">
          {loading && (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Carregando dados do fluxo de caixa...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 my-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
              <button 
                onClick={loadData}
                className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && cashCounts.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">Nenhum registro de fluxo de caixa encontrado.</p>
            </div>
          )}

          {!loading && !error && cashCounts.length > 0 && (
            <div className="mt-4">
              {/* Your existing expanded content */}
              <p className="text-gray-600">Conteúdo do fluxo de caixa será exibido aqui.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}