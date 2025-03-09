import React, { useState, useEffect } from 'react';
import { Package, ImageOff, Plus, Minus, ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import { db, Product } from '../lib/db';
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

function formatCurrency(value: number | undefined): string {
  if (typeof value !== 'number') {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

interface OperationalProductListProps {
  onAddToOrder?: (product: Product) => void;
}

export function OperationalProductList({ onAddToOrder }: OperationalProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const productsData = await db.getProducts();
      setProducts(productsData);

      // Load quantities for each product
      const initialQuantities: {[key: string]: number} = {};
      for (const product of productsData) {
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

  const handleQuantityChange = async (ean_code: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    try {
      await db.addInventoryCount(ean_code, newQuantity);
      setQuantities(prev => ({ ...prev, [ean_code]: newQuantity }));
      setEditingQuantity(null);
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Erro ao atualizar quantidade. Tente novamente.');
    }
  };

  const handleImageError = (ean_code: string) => {
    setImageErrors(prev => ({ ...prev, [ean_code]: true }));
  };

  if (loading && products.length === 0) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Carregando produtos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg flex flex-col items-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-700 text-center">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Filter out products with zero or negative quantity and inactive products
  const filteredProducts = products.filter(p => {
    const currentQuantity = quantities[p.ean_code] || 0;
    return p.active && currentQuantity > 0;
  });

  // Sort products first by category, then by name
  filteredProducts.sort((a, b) => {
    // First compare categories
    const categoryComparison = a.category.localeCompare(b.category, 'pt-BR');
    if (categoryComparison !== 0) return categoryComparison;
    
    // If categories are equal, compare names
    return a.name.localeCompare(b.name, 'pt-BR');
  });

  if (filteredProducts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum produto disponível em estoque.</p>
        <p className="text-gray-500 mt-2">Adicione produtos ou atualize o estoque para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <RefreshButton onRefresh={loadData} loading={loading} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div 
            key={product.ean_code}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="relative">
              <button
                onClick={() => onAddToOrder?.(product)}
                className="absolute top-2 right-2 z-10 bg-[#dfac32] text-white px-3 py-1.5 rounded-full hover:bg-[#c99b2d] flex items-center gap-1.5 shadow-md"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Adicionar ao Pedido</span>
              </button>
              <div className="aspect-square bg-gray-50">
                {product.image_url && !imageErrors[product.ean_code] ? (
                  <img
                    src={getGoogleDriveViewUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-contain p-4 cursor-pointer"
                    onClick={() => setExpandedImage(product.image_url)}
                    onError={() => handleImageError(product.ean_code)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
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
            </div>

            <div className="p-4">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">EAN: {product.ean_code}</p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>Categoria: {product.category}</p>
                <p>Tipo: {product.package_type || '-'}</p>
                <p>Qtd. por Embalagem: {product.package_quantity || 0}</p>
                
                <div className="mt-4 py-3 px-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-700">Preço:</span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(product.sale_price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Quantidade:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const currentQty = quantities[product.ean_code] || 0;
                        if (currentQty > 0) {
                          handleQuantityChange(product.ean_code, currentQty - 1);
                        }
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                      disabled={!quantities[product.ean_code]}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    {editingQuantity === product.ean_code ? (
                      <input
                        type="number"
                        min="0"
                        value={quantities[product.ean_code] || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 0) {
                            handleQuantityChange(product.ean_code, value);
                          }
                        }}
                        onBlur={() => setEditingQuantity(null)}
                        autoFocus
                        className="w-16 text-center border rounded-md"
                      />
                    ) : (
                      <span 
                        className="w-12 text-center font-medium cursor-pointer hover:bg-gray-100 rounded"
                        onClick={() => setEditingQuantity(product.ean_code)}
                      >
                        {quantities[product.ean_code] || 0}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        const currentQty = quantities[product.ean_code] || 0;
                        handleQuantityChange(product.ean_code, currentQty + 1);
                      }}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

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
      </div>
    </div>
  );
}