import React, { useState } from 'react';
import { PlusCircle, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { db, Product } from '../lib/db';

function getGoogleDriveViewUrl(url: string): string {
  if (url.includes('drive.google.com')) {
    const fileId = url.match(/[-\w]{25,}/);
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId[0]}`;
    }
  }
  return url;
}

export function ProductForm() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    ean_code: '',
    name: '',
    category: '',
    initial_quantity: '',
    image_url: '',
    package_quantity: '',
    package_type: '',
    purchase_price: '',
    sale_price: '',
    supplier: '',
    active: true
  });
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (url: string) => {
    const processedUrl = getGoogleDriveViewUrl(url);
    setFormData(prev => ({ ...prev, image_url: processedUrl }));
    setPreviewUrl(processedUrl);
  };

  const validateForm = (data: typeof formData): string | null => {
    if (!data.ean_code.trim()) return 'O código EAN é obrigatório';
    if (!data.name.trim()) return 'O nome do produto é obrigatório';
    if (!data.category.trim()) return 'A categoria é obrigatória';
    
    const numberFields = {
      'Quantidade inicial': data.initial_quantity,
      'Quantidade por embalagem': data.package_quantity,
      'Preço de compra': data.purchase_price,
      'Preço de venda': data.sale_price
    };

    for (const [fieldName, value] of Object.entries(numberFields)) {
      const numValue = Number(value);
      if (value && (isNaN(numValue) || numValue < 0)) {
        return `${fieldName} deve ser um número válido maior ou igual a zero`;
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validationError = validateForm(formData);
      if (validationError) {
        throw new Error(validationError);
      }

      // Check if product with EAN code already exists
      const products = await db.getProducts();
      const existingProduct = products.find(p => p.ean_code === formData.ean_code);
      
      if (existingProduct) {
        const confirmUpdate = window.confirm(
          `Já existe um produto com o código EAN ${formData.ean_code}.\n\n` +
          'Deseja atualizar os dados do produto existente?\n\n' +
          'Clique em:\n' +
          '- "OK" para atualizar os dados\n' +
          '- "Cancelar" para cancelar a inclusão'
        );

        if (!confirmUpdate) {
          return;
        }
      }

      const productData = {
        ean_code: formData.ean_code.trim(),
        name: formData.name.trim(),
        category: formData.category.trim(),
        initial_quantity: Number(formData.initial_quantity) || 0,
        image_url: formData.image_url ? getGoogleDriveViewUrl(formData.image_url) : null,
        package_quantity: Number(formData.package_quantity) || 0,
        package_type: formData.package_type.trim() || null,
        purchase_price: Number(formData.purchase_price) || 0,
        sale_price: Number(formData.sale_price) || 0,
        supplier: formData.supplier.trim() || null,
        active: formData.active,
        created_at: existingProduct ? existingProduct.created_at : new Date().toISOString()
      } as Product;

      if (existingProduct) {
        // Update existing product
        await db.updateProduct(productData.ean_code, productData);
      } else {
        // Add new product
        await db.addProduct(productData);
        // Add initial quantity as first inventory count if greater than 0
        if (productData.initial_quantity > 0) {
          await db.addInventoryCount(productData.ean_code, productData.initial_quantity);
        }
      }

      // Reset form
      setFormData({
        ean_code: '',
        name: '',
        category: '',
        initial_quantity: '',
        image_url: '',
        package_quantity: '',
        package_type: '',
        purchase_price: '',
        sale_price: '',
        supplier: '',
        active: true
      });
      setPreviewUrl('');
      setIsExpanded(false);
      
      alert(existingProduct ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!');
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao processar produto: ${error.message}`);
      } else {
        alert('Erro ao processar produto. Por favor, verifique os dados e tente novamente.');
      }
      console.error('Erro ao processar produto:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 sm:py-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-[#dfac32]" />
          <h2 className="text-xl font-semibold">Adicionar Novo Produto</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6 border-t">
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Código EAN</label>
              <input
                type="text"
                value={formData.ean_code}
                onChange={(e) => setFormData(prev => ({ ...prev, ean_code: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="Digite o código EAN"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade Inicial</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.initial_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, initial_quantity: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fornecedor</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Nome do fornecedor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Quantidade por Embalagem</label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.package_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, package_quantity: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Embalagem</label>
              <input
                type="text"
                value={formData.package_type}
                onChange={(e) => setFormData(prev => ({ ...prev, package_type: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Ex: Caixa, Pacote, Fardo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Compra (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status do Produto</label>
              <select
                value={formData.active ? "active" : "inactive"}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.value === "active" }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Imagem do Produto
                </div>
              </label>
              
              <div className="flex gap-4 mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={imageInputType === 'url'}
                    onChange={() => setImageInputType('url')}
                  />
                  <span className="ml-2">URL da Imagem</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    checked={imageInputType === 'file'}
                    onChange={() => setImageInputType('file')}
                  />
                  <span className="ml-2">Upload de Arquivo</span>
                </label>
              </div>

              {imageInputType === 'url' ? (
                <div>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    placeholder="Cole a URL da imagem ou link do Google Drive"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Dica: Para imagens do Google Drive, use o link "Compartilhar" e certifique-se que o acesso esteja público
                  </p>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              )}

              {previewUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pré-visualização:</p>
                  <div className="relative w-32 h-32 overflow-hidden rounded-lg border border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização"
                      className="w-full h-full object-contain"
                      onError={() => setPreviewUrl('')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-[#dfac32] text-white py-3 px-4 rounded-md hover:bg-[#c99b2d] focus:outline-none focus:ring-2 focus:ring-[#dfac32] focus:ring-offset-2"
          >
            Adicionar Produto
          </button>
        </form>
      )}
    </div>
  );
}