import React, { useRef, useState } from 'react';
import { FileDown, FileUp, FileQuestion, Trash2, ChevronDown, ChevronUp, Clipboard } from 'lucide-react';
import { db, Product } from '../lib/db';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  const parseNumber = (value: string | number | undefined): number => {
    if (typeof value === 'undefined') return 0;
    if (typeof value === 'number') return value;
    
    // Remove qualquer caractere que não seja número, ponto ou vírgula
    const cleanValue = value.toString().replace(/[^\d.,]/g, '');
    
    // Se o valor contém vírgula, trata como formato brasileiro
    if (cleanValue.includes(',')) {
      return Number(cleanValue.replace('.', '').replace(',', '.'));
    }
    
    // Caso contrário, trata como formato internacional
    return Number(cleanValue);
  };

  const downloadTemplate = () => {
    const headers = [
      'codigo_ean',
      'nome',
      'categoria',
      'quantidade_inicial',
      'url_imagem',
      'fornecedor',
      'quantidade_embalagem',
      'tipo_embalagem',
      'preco_compra',
      'preco_venda',
      'status'
    ];
    const exampleRow = [
      'PROD001',
      'Exemplo Produto',
      'Categoria A',
      '10',
      'https://exemplo.com/imagem.jpg',
      'Fornecedor A',
      '12',
      'Caixa',
      '10.50',
      '15.90',
      'ativo'
    ];

    // Cria workbook com exemplos em CSV e XLSX
    const wb = XLSX.utils.book_new();
    
    // Adiciona exemplo CSV
    const csvData = [headers, exampleRow];
    const csvWs = XLSX.utils.aoa_to_sheet(csvData);
    XLSX.utils.book_append_sheet(wb, csvWs, "Exemplo CSV");
    
    // Adiciona exemplo XLSX com formato brasileiro
    const xlsxData = [
      headers,
      [
        'PROD001',
        'Exemplo Produto',
        'Categoria A',
        '10',
        'https://exemplo.com/imagem.jpg',
        'Fornecedor A',
        '12',
        'Caixa',
        '10,50',
        '15,90',
        'ativo'
      ]
    ];
    const xlsxWs = XLSX.utils.aoa_to_sheet(xlsxData);
    XLSX.utils.book_append_sheet(wb, xlsxWs, "Exemplo XLSX");

    // Salva o arquivo
    XLSX.writeFile(wb, 'modelo_produtos.xlsx');
  };

  const exportProducts = async () => {
    try {
      const products = await db.getProducts();
      const headers = [
        'codigo_ean',
        'nome',
        'categoria',
        'quantidade_inicial',
        'url_imagem',
        'fornecedor',
        'quantidade_embalagem',
        'tipo_embalagem',
        'preco_compra',
        'preco_venda',
        'status',
        'data_criacao'
      ];

      const rows = products.map(p => [
        p.ean_code,
        p.name,
        p.category,
        p.initial_quantity.toString(),
        p.image_url || '',
        p.supplier || '',
        p.package_quantity.toString(),
        p.package_type || '',
        p.purchase_price.toString().replace('.', ','),
        p.sale_price.toString().replace('.', ','),
        p.active ? 'ativo' : 'inativo',
        format(new Date(p.created_at), 'dd/MM/yyyy HH:mm:ss')
      ]);

      // Cria workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Produtos");

      // Salva o arquivo
      XLSX.writeFile(wb, `produtos_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`);
    } catch (error) {
      console.error('Erro ao exportar produtos:', error);
      alert('Erro ao exportar produtos. Tente novamente.');
    }
  };

  const processProductData = async (rows: string[][]) => {
    try {
      setImporting(true);
      const headers = rows[0].map(h => h.toLowerCase());

      const requiredFields = ['codigo_ean', 'nome', 'categoria'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));

      if (missingFields.length > 0) {
        alert(`Campos obrigatórios ausentes: ${missingFields.join(', ')}\nUse o modelo fornecido como referência.`);
        return;
      }

      const fieldIndexes = {
        eanCode: headers.indexOf('codigo_ean'),
        name: headers.indexOf('nome'),
        category: headers.indexOf('categoria'),
        initialQuantity: headers.indexOf('quantidade_inicial'),
        imageUrl: headers.indexOf('url_imagem'),
        supplier: headers.indexOf('fornecedor'),
        packageQuantity: headers.indexOf('quantidade_embalagem'),
        packageType: headers.indexOf('tipo_embalagem'),
        purchasePrice: headers.indexOf('preco_compra'),
        salePrice: headers.indexOf('preco_venda'),
        status: headers.indexOf('status')
      };

      const products: Product[] = [];
      const updates: Product[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i].some(cell => cell)) continue; // Pula linhas vazias
        
        const values = rows[i];
        const eanCode = values[fieldIndexes.eanCode]?.toString().trim();
        
        if (!eanCode) {
          console.warn(`Linha ${i + 1}: Código EAN ausente, pulando...`);
          continue;
        }

        const product = {
          ean_code: eanCode,
          name: values[fieldIndexes.name]?.toString().trim() || '',
          category: values[fieldIndexes.category]?.toString().trim() || '',
          initial_quantity: fieldIndexes.initialQuantity !== -1 ? parseNumber(values[fieldIndexes.initialQuantity]) : 0,
          image_url: fieldIndexes.imageUrl !== -1 ? values[fieldIndexes.imageUrl]?.toString().trim() : null,
          supplier: fieldIndexes.supplier !== -1 ? values[fieldIndexes.supplier]?.toString().trim() : null,
          package_quantity: fieldIndexes.packageQuantity !== -1 ? parseNumber(values[fieldIndexes.packageQuantity]) : 0,
          package_type: fieldIndexes.packageType !== -1 ? values[fieldIndexes.packageType]?.toString().trim() : null,
          purchase_price: fieldIndexes.purchasePrice !== -1 ? parseNumber(values[fieldIndexes.purchasePrice]) : 0,
          sale_price: fieldIndexes.salePrice !== -1 ? parseNumber(values[fieldIndexes.salePrice]) : 0,
          active: fieldIndexes.status !== -1 
            ? values[fieldIndexes.status]?.toString().toLowerCase() === 'ativo'
            : true,
          created_at: new Date().toISOString()
        } as Product;

        try {
          const existingProduct = await db.getProducts().then(products => 
            products.find(p => p.ean_code === eanCode)
          );

          if (existingProduct) {
            updates.push(product);
          } else {
            products.push(product);
          }
        } catch (error) {
          console.error(`Error checking product ${eanCode}:`, error);
          continue;
        }
      }

      if (updates.length > 0) {
        const confirmUpdate = window.confirm(
          `Foram encontrados ${updates.length} produtos já existentes.\n\n` +
          'Deseja atualizar os dados destes produtos?\n\n' +
          'Clique em:\n' +
          '- "OK" para atualizar os produtos existentes\n' +
          '- "Cancelar" para importar apenas os novos produtos'
        );

        if (confirmUpdate) {
          await Promise.all(updates.map(product => 
            db.updateProduct(product.ean_code, product)
          ));
        }
      }

      if (products.length > 0) {
        await Promise.all(products.map(product => 
          db.addProduct(product)
        ));
      }

      // Adiciona quantidades iniciais como contagens de inventário
      const initialCounts = [...products, ...updates]
        .filter(p => p.initial_quantity > 0)
        .map(p => ({
          ean_code: p.ean_code,
          quantity: p.initial_quantity,
          counted_at: new Date().toISOString()
        }));

      if (initialCounts.length > 0) {
        await Promise.all(initialCounts.map(count => 
          db.addInventoryCount(count.ean_code, count.quantity)
        ));
      }

      alert(
        `Importação concluída!\n\n` +
        `- ${products.length} novos produtos adicionados\n` +
        `- ${updates.length} produtos atualizados\n` +
        `- ${initialCounts.length} contagens iniciais registradas`
      );

      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsExpanded(false);
      setShowPasteModal(false);
      setPasteContent('');
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      alert('Erro ao importar produtos. Verifique o formato dos dados.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      await processProductData(rows);
    } catch (error) {
      console.error('Erro ao importar arquivo:', error);
      alert('Erro ao importar arquivo. Verifique o formato e tente novamente.');
    }
  };

  const handlePasteImport = async () => {
    try {
      const rows = pasteContent
        .trim()
        .split('\n')
        .map(line => line.split('\t'));
      
      await processProductData(rows);
    } catch (error) {
      console.error('Erro ao importar dados colados:', error);
      alert('Erro ao importar dados. Verifique o formato e tente novamente.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 sm:py-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <FileUp className="w-5 h-5 text-[#dfac32]" />
          <h2 className="text-xl font-semibold">Importar/Exportar Produtos</h2>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6 border-t">
          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <FileQuestion className="w-5 h-5 text-[#dfac32]" />
              Baixar Modelo
            </button>

            <button
              onClick={exportProducts}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d] focus:outline-none focus:ring-2 focus:ring-[#dfac32] focus:ring-offset-2"
            >
              <FileDown className="w-5 h-5" />
              Exportar Produtos
            </button>

            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls"
                onChange={handleFileImport}
                className="hidden"
                id="product-upload"
              />
              <label
                htmlFor="product-upload"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d] focus:outline-none focus:ring-2 focus:ring-[#dfac32] focus:ring-offset-2 cursor-pointer w-full sm:w-auto"
              >
                <FileUp className="w-5 h-5" />
                Importar Arquivo
              </label>
            </div>

            <button
              onClick={() => setShowPasteModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d] focus:outline-none focus:ring-2 focus:ring-[#dfac32] focus:ring-offset-2"
            >
              <Clipboard className="w-5 h-5" />
              Colar Dados
            </button>
          </div>

          <div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <FileQuestion className="w-5 h-5 text-[#dfac32]" />
              <span>{showInstructions ? 'Ocultar Instruções' : 'Mostrar Instruções'}</span>
            </button>

            {showInstructions && (
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Instruções:</h3>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Baixe o modelo clicando no botão "Baixar Modelo"</li>
                  <li>O arquivo modelo contém duas planilhas de exemplo:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Exemplo CSV: Usa ponto (.) como separador decimal</li>
                      <li>Exemplo XLSX: Usa vírgula (,) como separador decimal</li>
                    </ul>
                  </li>
                  <li>Preencha seguindo o formato do modelo</li>
                  <li>O sistema aceita:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Arquivos .csv, .xlsx e .xls</li>
                      <li>Dados copiados diretamente da planilha</li>
                    </ul>
                  </li>
                  <li>Campos obrigatórios: código EAN, nome e categoria</li>
                  <li>Campo status aceita "ativo" ou "inativo"</li>
                  <li>A URL da imagem é opcional</li>
                  <li>Use o botão "Importar Arquivo" para carregar um arquivo</li>
                  <li>Use o botão "Colar Dados" para colar dados da planilha</li>
                  <li>Produtos existentes podem ser atualizados durante a importação</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {showPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Colar Dados da Planilha</h3>
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <span className="sr-only">Fechar</span>
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="text-sm text-gray-600 mb-4">
                <p className="mb-2">Cole aqui os dados copiados da planilha. Certifique-se de que:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>A primeira linha contém os cabeçalhos</li>
                  <li>Os dados estão organizados em colunas</li>
                  <li>Todos os campos obrigatórios estão presentes</li>
                </ul>
              </div>

              <textarea
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="w-full h-64 p-2 border rounded-md font-mono text-sm"
                placeholder="Cole os dados aqui..."
              />
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteImport}
                disabled={!pasteContent.trim() || importing}
                className="px-4 py-2 bg-[#dfac32] text-white rounded-md hover:bg-[#c99b2d] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importando...' : 'Importar Dados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}