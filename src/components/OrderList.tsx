import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X, Eraser, Send, User } from 'lucide-react';
import { Product } from '../lib/db';
import { format } from 'date-fns';

interface OrderItem {
  product: Product;
  quantity: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

interface OrderListProps {
  products: Product[];
  onClose: () => void;
  initialItems?: OrderItem[];
  onUpdateItems?: (items: OrderItem[]) => void;
}

export function OrderList({ products, onClose, initialItems = [], onUpdateItems }: OrderListProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialItems);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [customerName, setCustomerName] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);
  const [orderDate] = useState<Date>(new Date());

  useEffect(() => {
    onUpdateItems?.(orderItems);
  }, [orderItems, onUpdateItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAddItem = () => {
    if (!selectedProduct || !quantity) return;

    const product = products.find(p => p.ean_code === selectedProduct);
    if (!product) return;

    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) return;

    const existingItem = orderItems.find(item => item.product.ean_code === selectedProduct);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.product.ean_code === selectedProduct
          ? { ...item, quantity: item.quantity + numQuantity }
          : item
      ));
    } else {
      setOrderItems([...orderItems, { product, quantity: numQuantity }]);
    }

    setSelectedProduct('');
    setQuantity('1');
  };

  const handleUpdateQuantity = (eanCode: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.product.ean_code === eanCode) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }));
  };

  const handleRemoveItem = (eanCode: string) => {
    setOrderItems(orderItems.filter(item => item.product.ean_code !== eanCode));
  };

  const handleClearOrder = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o pedido?')) {
      setOrderItems([]);
    }
  };

  const handleShareWhatsApp = () => {
    const orderText = `*Pedido${customerName ? ` de ${customerName}` : ''}*\n` +
      `Data: ${format(orderDate, 'dd/MM/yyyy HH:mm')}\n\n` +
      orderItems.map(item => 
        `• ${item.quantity}x ${item.product.name}\n` +
        `   ${formatCurrency(item.product.sale_price)} cada = ${formatCurrency(item.quantity * item.product.sale_price)}`
      ).join('\n\n') +
      `\n\n*Total: ${formatCurrency(totalValue)}*`;

    const encodedText = encodeURIComponent(orderText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = orderItems.reduce((sum, item) => sum + (item.quantity * item.product.sale_price), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Pedido</h2>
          </div>
          <div className="flex items-center gap-2">
            {orderItems.length > 0 && (
              <>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-md"
                  title="Compartilhar no WhatsApp"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={handleClearOrder}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Eraser className="w-4 h-4" />
                  <span>Limpar Pedido</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Cliente (opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="w-full pl-9 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Produto
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Selecione um produto</option>
                {products
                  .filter(p => p.active)
                  .map((product) => (
                    <option key={product.ean_code} value={product.ean_code}>
                      {product.name} - {formatCurrency(product.sale_price)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddItem}
                disabled={!selectedProduct || !quantity}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {orderItems.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Nenhum item adicionado ao pedido
            </div>
          ) : (
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div
                  key={item.product.ean_code}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(item.product.sale_price)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.ean_code, -1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.ean_code, 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-24 text-right font-medium">
                      {formatCurrency(item.quantity * item.product.sale_price)}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.product.ean_code)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Total de itens:</span>
            <span className="font-medium">{totalItems}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Valor total:</span>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}