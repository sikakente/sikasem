import { create } from 'zustand';

export interface Shipment {
  id: string;
  shipmentReference: string;
  shipmentName: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  status: string;
  dispatchDate: string | null;
  expectedArrivalDate: string | null;
  _count?: { items: number };
}

interface ShipmentsState {
  activeShipments: Shipment[];
  delayedCount: number;
  setActiveShipments: (shipments: Shipment[]) => void;
}

export const useShipmentsStore = create<ShipmentsState>((set) => ({
  activeShipments: [],
  delayedCount: 0,

  setActiveShipments: (shipments: Shipment[]) => {
    const delayedCount = shipments.filter((s) => s.status === 'delayed').length;
    set({ activeShipments: shipments, delayedCount });
  },
}));
