import { create } from 'zustand';

export interface RevenueSummary {
  todayGhs: number;
  thisMonthGhs: number;
  lastMonthGhs: number;
  monthOverMonthChange: number;
  thisMonthGbpEstimate: number;
}

export interface ProfitSummary {
  estimatedGrossProfit: number;
  estimatedGrossProfitMargin: number;
  estimatedNetProfitAfterShipping: number;
}

export interface InventorySummary {
  totalStockValueGbp: number;
  lowStockCount: number;
  outOfStockCount: number;
  ukStockCount: number;
  ghanaStockCount: number;
}

export interface ShipmentSummary {
  inTransitCount: number;
  delayedCount: number;
  avgTransitDays: number;
  avgTransitTrend: string;
  shippingCostThisMonthGbp: number;
}

export interface FxSummary {
  realisedFxGainLoss: number;
  unrealisedGhsBalance: number;
  avgSaleRate: number;
  avgPurchaseRate: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  totalRevenueGhs: number;
}

export interface TopProducts {
  bestSelling: TopProduct[];
  highRevenue: TopProduct[];
  slowMoving: TopProduct[];
}

export interface AlertItem {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
}

export interface AlertSummary {
  totalOpen: number;
  countBySeverity: Record<string, number>;
  topAlerts: AlertItem[];
}

export interface RiskRecord {
  id: string;
  riskType: string;
  summary: string;
  recommendation: string | null;
  score: number | null;
  status: string;
}

export interface OpportunityRecord {
  id: string;
  opportunityType: string;
  summary: string;
  recommendation: string | null;
  score: number | null;
  status: string;
}

export interface DashboardSummary {
  revenue: RevenueSummary;
  profit: ProfitSummary;
  inventory: InventorySummary;
  shipments: ShipmentSummary;
  fx: FxSummary;
  topProducts: TopProducts;
  alerts: AlertSummary;
  risks: RiskRecord[];
  opportunities: OpportunityRecord[];
}

interface DashboardState {
  summary: DashboardSummary | null;
  lastFetched: Date | null;
  setSummary: (summary: DashboardSummary) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  lastFetched: null,
  setSummary: (summary) => set({ summary, lastFetched: new Date() }),
}));
