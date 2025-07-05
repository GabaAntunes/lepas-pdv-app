
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface ConsumptionItem {
  productId: string;
  name: string;
  price: number; // Price at the time of consumption
  quantity: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'freeTime';
  discountValue: number;
  status: 'active' | 'inactive';
  validUntil?: number; // JS Timestamp
  usageLimit?: number; // max uses
  uses: number; // current uses
}

export interface ActiveSession {
  id:string;
  responsible: string;
  responsibleCpf: string;
  responsiblePhone?: string;
  children: string[];
  startTime: number; // JS Timestamp
  maxTime: number; // in minutes
  consumption: ConsumptionItem[];
  couponCode?: string;
  couponId?: string; // Store the ID for easier updates
  discountApplied?: number;
  isInitialPaymentMade?: boolean;
  totalPaidSoFar?: number;
  isCouponUsageCounted?: boolean;
}

export interface Payment {
  method: 'Dinheiro' | 'PIX' | 'Crédito' | 'Débito';
  amount: number;
}

export interface SaleRecord {
  id: string;
  finalizedAt: number; // JS Timestamp
  responsible: string;
  responsibleCpf: string;
  children: string[];
  durationInMinutes: number;
  timeCost: number;
  consumption: ConsumptionItem[];
  consumptionCost: number;
  couponCode?: string;
  couponId?: string;
  discountApplied?: number;
  totalAmount: number;
  paymentMethods: Payment[];
  changeGiven: number;
}

export interface Settings {
  id?: string;
  firstHourRate: number;
  additionalHourRate: number;
  logoUrl?: string;
}

export interface Withdrawal {
  amount: number;
  reason?: string;
  timestamp: number;
  userName: string;
}

export interface CashSession {
  id: string;
  status: 'open' | 'closed';
  openedAt: number;
  openingBalance: number;
  openedBy: {
    uid: string;
    email: string;
  };
  withdrawals: Withdrawal[];
  closedAt?: number;
  closedBy?: {
    uid: string;
    email: string;
  };
  countedBalance?: number;
  expectedCashAmount?: number;
  difference?: number;
  finalCashSales?: number;
}
