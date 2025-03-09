import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from './auth';

export interface CartItem {
  ean_code: string;
  quantity: number;
}

interface StoreState {
  cart: CartItem[];
  user: UserProfile | null;
  addToCart: (ean_code: string, quantity?: number) => void;
  removeFromCart: (ean_code: string) => void;
  updateCartQuantity: (ean_code: string, quantity: number) => void;
  clearCart: () => void;
  setUser: (user: UserProfile | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      cart: [],
      user: null,
      addToCart: (ean_code: string, quantity: number = 1) =>
        set((state) => {
          const existingItem = state.cart.find((item) => item.ean_code === ean_code);
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.ean_code === ean_code
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return { cart: [...state.cart, { ean_code, quantity }] };
        }),
      removeFromCart: (ean_code: string) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.ean_code !== ean_code),
        })),
      updateCartQuantity: (ean_code: string, quantity: number) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.ean_code === ean_code ? { ...item, quantity } : item
          ),
        })),
      clearCart: () => set({ cart: [] }),
      setUser: (user: UserProfile | null) => set({ user }),
    }),
    {
      name: 'store',
    }
  )
);