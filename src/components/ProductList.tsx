import React, { useState, useEffect } from 'react';
import { Package, Trash2, ImageOff, Plus, Minus, ToggleLeft, ToggleRight, Edit2, Check, X, TrendingUp, TrendingDown, Percent, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { db, Product } from '../lib/db';
import { ProductFilters } from './ProductFilters';
import { format } from 'date-fns';
import { RefreshButton } from './RefreshButton';

function getGoogleDriveViewUrl(url: string): string {
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/[-\w]{25,}/);
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId[0]}`;
    }
  }
  return url;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function calculateProfitMargin(salePrice: number, purchasePrice: number): number {
  if (purchasePrice === 0) return 0;
  return ((salePrice - purchasePrice) / purchasePrice) * 100;
}

function calculateSalePriceFromMargin(purchasePrice: number, margin: number): number {
  return purchasePrice * (1 + margin / 100);
}

function getProfitMarginColor(margin: number): string {
  if (margin <= 0) return 'text-red-600';
  if (margin < 15) return 'text-orange-600';
  if (margin < 30) return 'text-yellow-600';
  return 'text-green-600';
}

interface EditingField {
  ean_code: string;
  field: keyof Product | 'margin';
  value: string;
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.getProducts();
      setProducts(data);
      setFilteredProducts(data);

      // Load quantities
      const initialQuantities: Record<string, number> = {};
      for (const product of data) {
        try {
          const latestCount = await db.getLatestCount(product.ean_code);
          initialQuantities[product.ean_code] = latestCount || product.initial_quantity;
        } catch (err) {
          console.warn(`Failed to load quantity for ${product.ean_code}:`, err);
          initialQuantities[product.ean_code] = product.initial_quantity;
        }
      }
      setQuantities(initialQuantities);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Não foi possível carregar os produtos. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateProductTotalSales = (product: Product, quantity: number) => {
    return product.sale_price * quantity;
  };

  const totalPotentialRevenue = Object.entries(quantities).reduce((total, [ean_code, quantity]) => {
    const product = products?.find(p => p.ean_code === ean_code);
    if (product && product.active) {
      return total + calculateProductTotalSales(product, quantity);
    }
    return total;
  }, 0);

  const handleImageError = (ean_code: string) => {
    setImageErrors(prev => ({ ...prev, [ean_code]: true }));
  };

  const handleQuantityChange = async (ean_code: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    try {
      await db.addInventoryCount(ean_code, newQuantity);
      setQuantities(prev => ({ ...prev, [ean_code]: newQuantity }));
      setEditingQuantity(null);
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      alert('Erro ao atualizar quantidade. Tente novamente.');
    }
  };

  const handleFieldEdit = async (ean_code: string, field: keyof Product, value: string) => {
    try {
      const updates = { [field]: value };
      await db.updateProduct(ean_code, updates);
      setEditingField(null);
      
      // Refresh products list
      const updatedProducts = await db.getProducts();
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
    } catch (error) {
      console.error('Erro ao atualizar campo:', error);
      alert('Erro ao atualizar campo. Tente novamente.');
    }
  };

  const handleDeleteProduct = async (ean_code: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await db.deleteProduct(ean_code);
        
        // Refresh products list
        const updatedProducts = await db.getProducts();
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts);
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
        alert('Erro ao deletar produto. Tente novamente.');
      }
    }
  };

  const handleMarginChange = async (ean_code: string, margin: number) => {
    const product = products.find(p => p.ean_code === ean_code);
    if (!product) return;

    const newSalePrice = calculateSalePriceFromMargin(product.purchase_price, margin);
    
    try {
      await db.updateProduct(ean_code, {
        ...product,
        sale_price: newSalePrice
      });
      
      // Update local state
      const updatedProducts = products.map(p => 
        p.ean_code === ean_code 
          ? { ...p, sale_price: newSalePrice }
          : p
      );
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
      setEditingField(null);
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Erro ao atualizar preço. Tente novamente.');
    }
  };

  const handleMarginAdjustment = async (ean_code: string, delta: number) => {
    const product = products.find(p => p.ean_code === ean_code);
    if (!product) return;

    const currentMargin = calculateProfitMargin(product.sale_price, product.purchase_price);
    const newMargin = Math.max(0, currentMargin + delta); // Prevent negative margins
    
    await handleMarginChange(ean_code, newMargin);
  };

  const displayProducts = showInactive ? filteredProducts : filteredProducts.filter(p => p.active);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos
            </h2>
            <div className="flex items-center gap-2">
              <RefreshButton onRefresh={loadData} loading={loading} />
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {showInactive ? (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    Ocultar Inativos
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    Mostrar Inativos
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
              <button 
                onClick={loadData}
                className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Tentar novamente
              </button>
            </div>
          )}

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Total em Vendas:
                </span>
              </div>
              <span className="text-2xl font-bold text-green-700">
                {formatCurrency(totalPotentialRevenue)}
              </span>
            </div>
            <p className="mt-1 text-sm text-green-600">
              Valor total se todos os produtos em estoque forem vendidos pelos preços atuais
            </p>
          </div>
        </div>

        <div className="mt-6">
          <ProductFilters
            products={products}
            onFilterChange={setFilteredProducts}
          />
        </div>

        <div className="mt-6 space-y-6">
          {displayProducts.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              {error ? (
                <p>Não foi possível carregar os produtos.</p>
              ) : (
                <p>Nenhum produto encontrado. Adicione produtos para começar.</p>
              )}
            </div>
          )}

          {loading && displayProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p>Carregando produtos...</p>
            </div>
          )}

          {displayProducts.map((product) => (
            <div
              key={product.ean_code}
              className={`bg-white rounded-lg border ${
                product.active ? 'border-gray-200' : 'border-red-200 bg-red-50'
              } overflow-hidden hover:shadow-md transition-shadow`}
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full sm:w-48 h-48">
                    {product.image_url && !imageErrors[product.ean_code] ? (
                      <img
                        src={getGoogleDriveViewUrl(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => setExpandedImage(product.image_url)}
                        onError={() => handleImageError(product.ean_code)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        {imageErrors[product.ean_code] ? (
                          <>
                            <ImageOff className="w-12 h-12 mb-2" />
                            <span className="text-sm">Erro ao carregar imagem</span>
                          </>
                        ) : (
                          <Package className="w-16 h-16" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {editingField?.ean_code === product.ean_code && editingField.field === 'name' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingField.value}
                                onChange={(e) => setEditingField({
                                  ...editingField,
                                  value: e.target.value
                                })}
                                className="border rounded px-2 py-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleFieldEdit(product.ean_code, 'name', editingField.value)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingField(null)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {product.name}
                              <button
                                onClick={() => setEditingField({
                                  ean_code: product.ean_code,
                                  field: 'name',
                                  value: product.name
                                })}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">EAN: {product.ean_code}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteProduct(product.ean_code)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Categoria</p>
                        {editingField?.ean_code === product.ean_code && editingField.field === 'category' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingField.value}
                              onChange={(e) => setEditingField({
                                ...editingField,
                                value: e.target.value
                              })}
                              className="border rounded px-2 py-1"
                              autoFocus
                            />
                            <button
                              onClick={() => handleFieldEdit(product.ean_code, 'category', editingField.value)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingField(null)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900">{product.category}</p>
                            <button
                              onClick={() => setEditingField({
                                ean_code: product.ean_code,
                                field: 'category',
                                value: product.category
                              })}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {expandedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-lg overflow-hidden">
            <img
              src={getGoogleDriveViewUrl(expandedImage)}
              alt="Imagem ampliada"
              className="w-full h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
            >
              <span className="sr-only">Fechar</span>
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductList;