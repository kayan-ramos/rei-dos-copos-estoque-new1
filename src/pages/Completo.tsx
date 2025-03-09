import React from 'react';
import { ProductForm } from '../components/ProductForm';
import ProductList from '../components/ProductList';
import { ImportExport } from '../components/ImportExport';
import { InventoryCount } from '../components/InventoryCount';
import { CashFlow } from '../components/CashFlow';

export function Completo() {
  return (
    <div className="space-y-6">
      <CashFlow />
      <ProductForm />
      <ImportExport />
      <InventoryCount />
      <ProductList />
    </div>
  );
}