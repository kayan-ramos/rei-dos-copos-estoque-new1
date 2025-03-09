import React, { useState, useEffect } from 'react';
import { OperationalProductList } from '../components/OperationalProductList';
import { OrderList } from '../components/OrderList';
import { Package, ShoppingCart } from 'lucide-react';
import { db, Product } from '../lib/db';

export function Operacional() {
  const [showOrderList, setShowOrderList] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<{ product: Product; quantity: number }[]>([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await db.getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };
    loadProducts();
  }, []);

  const handleAddToOrder = (product: Product) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.ean_code === product.ean_code);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.ean_code === product.ean_code
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
    setShowOrderList(true);
  };

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-6 h-6 text-[#dfac32]" />
            Visualização de Produtos
          </h2>
        </div>
        
        <OperationalProductList onAddToOrder={handleAddToOrder} />
      </div>

      <button
        onClick={() => setShowOrderList(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-[#dfac32] text-white rounded-full hover:bg-[#c99b2d] shadow-lg transition-all hover:shadow-xl"
      >
        <ShoppingCart className="w-5 h-5" />
        <span>Pedido</span>
        {totalItems > 0 && (
          <span className="bg-white text-[#dfac32] rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
            {totalItems}
          </span>
        )}
      </button>

      {showOrderList && (
        <OrderList
          products={products}
          onClose={() => setShowOrderList(false)}
          initialItems={orderItems}
          onUpdateItems={setOrderItems}
        />
      )}
    </div>
  );
}