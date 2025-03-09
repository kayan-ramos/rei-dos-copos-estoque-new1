import React, { useState, useMemo, useCallback } from 'react';
import { Filter, SortAsc, SortDesc } from 'lucide-react';
import { Product } from '../db';

export type SortOption = 'price-asc' | 'price-desc' | null;

interface ProductFiltersProps {
  products: Product[];
  onFilterChange: (filtered: Product[]) => void;
  showPriceSort?: boolean;
}

export function ProductFilters({ products, onFilterChange, showPriceSort = true }: ProductFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    supplier: '',
    packageType: '',
    sort: null as SortOption
  });

  // Get unique values for dropdowns
  const categories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category))).sort(),
    [products]
  );
  
  const suppliers = useMemo(() => 
    Array.from(new Set(products.map(p => p.supplier).filter(Boolean))).sort(),
    [products]
  );
  
  const packageTypes = useMemo(() => 
    Array.from(new Set(products.map(p => p.packageType).filter(Boolean))).sort(),
    [products]
  );

  // Memoize the filter function to prevent unnecessary recalculations
  const applyFilters = useCallback((products: Product[], filters: typeof filters) => {
    let filtered = [...products];

    // Apply text filters
    if (filters.name) {
      const searchTerm = filters.name.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.eanCode.toLowerCase().includes(searchTerm)
      );
    }

    // Apply dropdown filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.supplier) {
      filtered = filtered.filter(p => p.supplier === filters.supplier);
    }
    if (filters.packageType) {
      filtered = filtered.filter(p => p.packageType === filters.packageType);
    }

    // Apply sorting
    if (filters.sort === 'price-asc') {
      filtered.sort((a, b) => a.salePrice - b.salePrice);
    } else if (filters.sort === 'price-desc') {
      filtered.sort((a, b) => b.salePrice - a.salePrice);
    } else {
      // Default sorting: first by category, then by name
      filtered.sort((a, b) => {
        // First compare categories
        const categoryComparison = a.category.localeCompare(b.category, 'pt-BR');
        if (categoryComparison !== 0) return categoryComparison;
        
        // If categories are equal, compare names
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }

    return filtered;
  }, []);

  // Memoize filtered results
  const filteredProducts = useMemo(() => 
    applyFilters(products, filters),
    [products, filters, applyFilters]
  );

  // Update parent component with filtered results
  React.useEffect(() => {
    onFilterChange(filteredProducts);
  }, [filteredProducts, onFilterChange]);

  const clearFilters = () => {
    setFilters({
      name: '',
      category: '',
      supplier: '',
      packageType: '',
      sort: null
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#dfac32]" />
          <span className="font-medium">Filtros</span>
          {Object.values(filters).some(v => v) && (
            <span className="bg-[#dfac32] text-white text-xs px-2 py-0.5 rounded-full">
              Ativos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {Object.values(filters).some(v => v) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar Filtros
            </button>
          )}
          <span className="text-gray-400">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome ou código EAN"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32]"
              >
                <option value="">Todas</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor
              </label>
              <select
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32]"
              >
                <option value="">Todos</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Embalagem
              </label>
              <select
                value={filters.packageType}
                onChange={(e) => setFilters(prev => ({ ...prev, packageType: e.target.value }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#dfac32] focus:ring-[#dfac32]"
              >
                <option value="">Todos</option>
                {packageTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {showPriceSort && (
            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => setFilters(prev => ({
                  ...prev,
                  sort: prev.sort === 'price-asc' ? null : 'price-asc'
                }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                  filters.sort === 'price-asc'
                    ? 'bg-[#dfac32] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <SortAsc className="w-4 h-4" />
                Mais Baratos
              </button>
              <button
                onClick={() => setFilters(prev => ({
                  ...prev,
                  sort: prev.sort === 'price-desc' ? null : 'price-desc'
                }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                  filters.sort === 'price-desc'
                    ? 'bg-[#dfac32] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <SortDesc className="w-4 h-4" />
                Mais Caros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}