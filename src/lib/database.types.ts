export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          ean_code: string
          name: string
          category: string
          initial_quantity: number
          image_url: string | null
          package_quantity: number
          package_type: string | null
          purchase_price: number
          sale_price: number
          supplier: string | null
          active: boolean
          created_at: string
          deleted_at: string | null
          last_price_change: string | null
          last_supplier_change: string | null
          last_purchase_price_change: string | null
          previous_sale_price: number | null
          previous_supplier: string | null
          previous_purchase_price: number | null
          organization_id: string
        }
        Insert: {
          ean_code: string
          name: string
          category: string
          initial_quantity?: number
          image_url?: string | null
          package_quantity?: number
          package_type?: string | null
          purchase_price?: number
          sale_price?: number
          supplier?: string | null
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          last_price_change?: string | null
          last_supplier_change?: string | null
          last_purchase_price_change?: string | null
          previous_sale_price?: number | null
          previous_supplier?: string | null
          previous_purchase_price?: number | null
          organization_id?: string
        }
        Update: {
          ean_code?: string
          name?: string
          category?: string
          initial_quantity?: number
          image_url?: string | null
          package_quantity?: number
          package_type?: string | null
          purchase_price?: number
          sale_price?: number
          supplier?: string | null
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          last_price_change?: string | null
          last_supplier_change?: string | null
          last_purchase_price_change?: string | null
          previous_sale_price?: number | null
          previous_supplier?: string | null
          previous_purchase_price?: number | null
          organization_id?: string
        }
      }
      inventory_counts: {
        Row: {
          id: string
          ean_code: string
          quantity: number
          counted_at: string
          organization_id: string
        }
        Insert: {
          id?: string
          ean_code: string
          quantity: number
          counted_at?: string
          organization_id?: string
        }
        Update: {
          id?: string
          ean_code?: string
          quantity?: number
          counted_at?: string
          organization_id?: string
        }
      }
      cash_counts: {
        Row: {
          id: string
          date: string
          notes: Json
          coins: Json
          total: number
          created_at: string
          updated_at: string
          comments: string | null
          organization_id: string
        }
        Insert: {
          id?: string
          date: string
          notes: Json
          coins: Json
          total: number
          created_at?: string
          updated_at?: string
          comments?: string | null
          organization_id?: string
        }
        Update: {
          id?: string
          date?: string
          notes?: Json
          coins?: Json
          total?: number
          created_at?: string
          updated_at?: string
          comments?: string | null
          organization_id?: string
        }
      }
      cash_count_logs: {
        Row: {
          id: string
          cash_count_id: string
          date: string
          type: string
          previous_total: number | null
          new_total: number | null
          previous_date: string | null
          new_date: string | null
          notes: Json | null
          coins: Json | null
          comments: string | null
          organization_id: string
        }
        Insert: {
          id?: string
          cash_count_id: string
          date?: string
          type: string
          previous_total?: number | null
          new_total?: number | null
          previous_date?: string | null
          new_date?: string | null
          notes?: Json | null
          coins?: Json | null
          comments?: string | null
          organization_id?: string
        }
        Update: {
          id?: string
          cash_count_id?: string
          date?: string
          type?: string
          previous_total?: number | null
          new_total?: number | null
          previous_date?: string | null
          new_date?: string | null
          notes?: Json | null
          coins?: Json | null
          comments?: string | null
          organization_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}