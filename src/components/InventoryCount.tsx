import React, { useState, useEffect } from 'react';
import { ClipboardList, Share2, Download, ChevronDown, ChevronUp, AlertTriangle, Calendar } from 'lucide-react';
import { db, Product, InventoryCount as InventoryCountType } from '../lib/db';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { RefreshButton } from './RefreshButton';

function formatCurrency(value: number | undefined): string {
  if (typeof value !== 'number') return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

interface GroupedCount {
  date: Date;
  counts: {
    ean_code: string;
    quantity: number;
    counted_at: string;
    product: Product | undefined;
  }[];
}

export function InventoryCount() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCountType[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null
  });

  const processInventoryCounts = (counts: InventoryCountType[], products: Product[]) => {
    const groupedByDayAndSku = counts.reduce((acc: Record<string, Record<string, InventoryCountType[]>>, count) => {
      const date = format(startOfDay(new Date(count.counted_at)), 'yyyy-MM-dd');
      const sku = count.ean_code;
      
      if (!acc[date]) acc[date] = {};
      if (!acc[date][sku]) acc[date][sku] = [];
      
      acc[date][sku].push(count);
      return acc;
    }, {});

    const groupedCounts: GroupedCount[] = Object.entries(groupedByDayAndSku).map(([dateStr, skuCounts]) => {
      const date = new Date(dateStr);
      const latestCounts = Object.entries(skuCounts).map(([sku, counts]) => {
        const sortedCounts = counts.sort((a, b) => 
          new Date(b.counted_at).getTime() - new Date(a.counted_at).getTime()
        );
        
        const latestCount = sortedCounts[0];
        const product = products.find(p => p.ean_code === sku);

        return {
          ean_code: sku,
          quantity: latestCount.quantity,
          counted_at: latestCount.counted_at,
          product
        };
      });

      return {
        date,
        counts: latestCounts
      };
    });

    return groupedCounts.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, countsData] = await Promise.all([
        db.getProducts(),
        db.getInventoryCounts()
      ]);
      setProducts(productsData);
      setInventoryCounts(countsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !quantity) return;

    try {
      const numQuantity = parseFloat(quantity);
      if (isNaN(numQuantity) || numQuantity < 0) {
        throw new Error('Quantidade inválida');
      }

      await db.addInventoryCount(selectedProduct, numQuantity);
      await loadData();
      setQuantity('');
      setSelectedProduct('');
      setIsExpanded(false);
      alert('Contagem registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar contagem:', error);
      alert(error instanceof Error ? error.message : 'Erro ao adicionar contagem');
    }
  };

  const handleShare = async () => {
    if (!inventoryCounts || !products) return;

    try {
      const data = inventoryCounts.map(count => {
        const product = products.find(p => p.ean_code === count.ean_code);
        return {
          'Data': format(startOfDay(new Date(count.counted_at)), 'dd/MM/yyyy'),
          'Código EAN': count.ean_code,
          'Nome do Produto': product?.name || 'Produto não encontrado',
          'Status': product?.active ? 'Ativo' : 'Inativo',
          'Data de Exclusão': product?.deleted_at ? format(new Date(product.deleted_at), 'dd/MM/yyyy') : '-',
          'Quantidade': count.quantity,
          'Preço de Venda': formatCurrency(product?.sale_price),
          'Fornecedor': product?.supplier || '-',
          'Preço de Compra': formatCurrency(product?.purchase_price)
        };
      });

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `historico_estoque_${format(new Date(), 'dd-MM-yyyy')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao compartilhar histórico:', error);
      alert('Erro ao gerar arquivo de compartilhamento');
    }
  };

  const handleDownload = async () => {
    if (!inventoryCounts || !products) return;

    try {
      const data = inventoryCounts.map(count => {
        const product = products.find(p => p.ean_code === count.ean_code);
        return {
          'Data': format(startOfDay(new Date(count.counted_at)), 'dd/MM/yyyy'),
          'Código EAN': count.ean_code,
          'Nome do Produto': product?.name || 'Produto não encontrado',
          'Status': product?.active ? 'Ativo' : 'Inativo',
          'Data de Exclusão': product?.deleted_at ? format(new Date(product.deleted_at), 'dd/MM/yyyy') : '-',
          'Quantidade': count.quantity,
          'Preço de Venda': product?.sale_price || 0,
          'Fornecedor': product?.supplier || '-',
          'Preço de Compra': product?.purchase_price || 0
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
      XLSX.writeFile(wb, `historico_estoque_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    } catch (error) {
      console.error('Erro ao baixar histórico:', error);
      alert('Erro ao gerar planilha');
    }
  };

  const getFilteredGroups = () => {
    let filtered = groupedCounts;

    if (dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(group => 
        isWithinInterval(group.date, {
          start: startOfDay(dateFilter.startDate),
          end: endOfDay(dateFilter.endDate)
        })
      );
    }

    if (!showAllHistory) {
      filtered = filtered.map(group => ({
        ...group,
        counts: group.counts.filter(count => count.product?.active)
      })).filter(group => group.counts.length > 0);
    }

    return filtered;
  };

  const handleClearFilters = () => {
    setDateFilter({
      startDate: null,
      endDate: null
    });
  };

  if (!products) return <div>Carregando...</div>;

  const groupedCounts = processInventoryCounts(inventoryCounts, products);
  const filteredGroups = getFilteredGroups();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 py-4 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#dfac32]" />
            <h2 className="text-xl font-semibold">Histórico de Contagens</h2>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={loadData} loading={loading} />
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              {isHistoryExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {isHistoryExpanded && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t">
            <div className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inicial
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter.startDate ? format(dateFilter.startDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateFilter(prev => ({
                        ...prev,
                        startDate: e.target.value ? new Date(e.target.value) : null
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32] pl-10"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Final
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFilter.endDate ? format(dateFilter.endDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setDateFilter(prev => ({
                        ...prev,
                        endDate: e.target.value ? new Date(e.target.value) : null
                      }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32] pl-10"
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                {(dateFilter.startDate || dateFilter.endDate) && (
                  <div className="flex items-end">
                    <button
                      onClick={handleClearFilters}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md"
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <Share2 className="w-4 h-4 text-[#dfac32]" />
                  Compartilhar JSON
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d]"
                >
                  <Download className="w-4 h-4" />
                  Baixar Planilha
                </button>
                <button
                  onClick={() => setShowAllHistory(!showAllHistory)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {showAllHistory ? 'Ocultar Produtos Excluídos' : 'Mostrar Produtos Excluídos'}
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {filteredGroups.length === 0 ? (
                  <p>Nenhuma alteração encontrada no período selecionado.</p>
                ) : (
                  <p>
                    Mostrando {filteredGroups.reduce((sum, group) => sum + group.counts.length, 0)} alterações
                    em {filteredGroups.length} {filteredGroups.length === 1 ? 'dia' : 'dias'}.
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-8">
                {filteredGroups.map((group) => (
                  <div key={group.date.toISOString()} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {format(group.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código EAN</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço de Venda</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fornecedor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço de Compra</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.counts.map((count) => (
                            <tr 
                              key={`${count.ean_code}-${count.counted_at}`}
                              className={!count.product?.active ? 'bg-red-50' : undefined}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{count.ean_code}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  {count.product?.name || 'Produto não encontrado'}
                                  {!count.product?.active && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Excluído
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {count.product?.active ? (
                                  <span className="text-green-600">Ativo</span>
                                ) : (
                                  <span className="text-red-600">
                                    Excluído em {count.product?.deleted_at ? format(new Date(count.product.deleted_at), 'dd/MM/yyyy') : '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{count.quantity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(count.product?.sale_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {count.product?.supplier || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(count.product?.purchase_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}