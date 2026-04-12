import { create } from 'zustand';

export interface CartItem {
  productId: string;
  productName: string;
  barcode: string;
  unitPriceGhs: number;
  quantity: number;
  discountAmountGhs: number;
}

interface PosState {
  cartItems: CartItem[];
  customerId: string | null;
  fxRate: number;
  addItem: (product: Omit<CartItem, 'quantity' | 'discountAmountGhs'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyDiscount: (productId: string, amount: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customerId: string | null) => void;
  setFxRate: (rate: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

export const usePosStore = create<PosState>()((set, get) => ({
  cartItems: [],
  customerId: null,
  fxRate: 1,

  addItem: (product) =>
    set((state) => {
      const existing = state.cartItems.find((i) => i.productId === product.productId);
      if (existing) {
        return {
          cartItems: state.cartItems.map((i) =>
            i.productId === product.productId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return { cartItems: [...state.cartItems, { ...product, quantity: 1, discountAmountGhs: 0 }] };
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cartItems:
        quantity <= 0
          ? state.cartItems.filter((i) => i.productId !== productId)
          : state.cartItems.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    })),

  applyDiscount: (productId, amount) =>
    set((state) => ({
      cartItems: state.cartItems.map((i) =>
        i.productId === productId ? { ...i, discountAmountGhs: amount } : i,
      ),
    })),

  removeItem: (productId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((i) => i.productId !== productId),
    })),

  setCustomer: (customerId) => set({ customerId }),
  setFxRate: (fxRate) => set({ fxRate }),
  clearCart: () => set({ cartItems: [], customerId: null, fxRate: 1 }),

  subtotal: () => get().cartItems.reduce((sum, i) => sum + i.unitPriceGhs * i.quantity, 0),
  total: () => {
    const items = get().cartItems;
    return items.reduce((sum, i) => sum + i.unitPriceGhs * i.quantity - i.discountAmountGhs, 0);
  },
}));
