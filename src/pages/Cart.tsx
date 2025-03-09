import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useStore } from '../lib/store';
import { db, Product } from '../lib/db';
import { useNavigate } from 'react-router-dom';

export function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartQuantity, clearCart } = useStore();
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await db.getProducts();
        const productsMap = data.reduce((acc, product) => {
          acc[product.ean_code] = product;
          return acc;
        }, {} as Record<string, Product>);
        setProducts(productsMap);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleQuantityChange = (eanCode: string, delta: number) => {
    const item = cart.find(item => item.ean_code === eanCode);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeFromCart(eanCode);
    } else {
      updateCartQuantity(eanCode, newQuantity);
    }
  };

  const handleCheckout = () => {
    // Implement checkout logic here
    alert('Pedido realizado com sucesso!');
    clearCart();
    navigate('/');
  };

  const totalAmount = cart.reduce((total, item) => {
    const product = products[item.ean_code];
    if (!product) return total;
    return total + (product.sale_price * item.quantity);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#dfac32]"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seu carrinho está vazio</h2>
        <p className="text-gray-600 mb-6">Adicione produtos para continuar comprando</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#dfac32] hover:bg-[#c99b2d]"
        >
          Continuar comprando
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-8">Seu Carrinho</h1>

      <div className="space-y-4">
        {cart.map((item) => {
          const product = products[item.ean_code];
          if (!product) return null;

          return (
            <div
              key={item.ean_code}
              className="flex items-center gap-4 bg-white p-4 rounded-lg shadow"
            >
              <div className="w-20 h-20">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-gray-400">Sem imagem</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
                <p className="text-[#dfac32] font-bold">
                  {product.sale_price.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuantityChange(item.ean_code, -1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => handleQuantityChange(item.ean_code, 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.ean_code)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium">Total</span>
          <span className="text-2xl font-bold text-[#dfac32]">
            {totalAmount.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </span>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCheckout}
            className="w-full py-3 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d] font-medium"
          >
            Finalizar Pedido
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    </div>
  );
}