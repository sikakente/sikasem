import { create } from 'zustand';

export interface InventoryBalance {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  product?: { name: string; sku?: string };
  location?: { name: string };
}

interface InventoryState {
  balances: InventoryBalance[];
  lowStockCount: number;
  setBalances: (balances: InventoryBalance[]) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  balances: [],
  lowStockCount: 0,

  setBalances: (balances: InventoryBalance[]) => {
    const lowStockCount = balances.filter((balance) => balance.quantityAvailable < 10).length;
    set({ balances, lowStockCount });
  },
}));
