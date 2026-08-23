export type TransactionType = 'income' | 'expense' | 'transfer';

export type PaymentMethod =
  | 'money'
  | 'pix'
  | 'debit'
  | 'credit'
  | 'boleto'
  | 'transfer'
  | 'other';

export type RecurrenceType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'yearly';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'investment'
  | 'cash'
  | 'digital_wallet';

export type BillStatus = 'pending' | 'paid' | 'overdue';

export type DebtPriority = 'high' | 'medium' | 'low';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  monthlyIncome: number;
  primaryGoal: string;
  financialStyle: 'individual' | 'couple' | 'family';
  hasCreditCard: boolean;
  hasInstallments: boolean;
  onboarded: boolean;
  pinCode?: string;
  isPinEnabled: boolean;
  hideValues: boolean;
  themeMode: 'light' | 'dark' | 'system';
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  type: AccountType;
  balance: number;
  color: string;
  iconName: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  accountId?: string;
  toAccountId?: string; // for internal transfers
  cardId?: string; // when paid with credit card
  recurrence: RecurrenceType;
  isPaid: boolean;
  isFixedBill?: boolean;
  fixedBillId?: string;
  installmentInfo?: {
    current: number;
    total: number;
    parentPurchaseId: string;
  };
  notes?: string;
  createdAt: string;
}

export interface FixedBill {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // 1 - 31
  category: string;
  paymentMethod: PaymentMethod;
  recurrence: RecurrenceType;
  status: BillStatus;
  accountId?: string;
  lastPaidDate?: string;
  notes?: string;
  autoDebit?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  totalLimit: number;
  closingDay: number; // 1 - 31
  dueDay: number; // 1 - 31
  color: string;
  lastDigits?: string;
  brand?: 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other';
}

export interface CardPurchase {
  id: string;
  cardId: string;
  description: string;
  totalAmount: number;
  installmentsCount: number;
  installmentValue: number;
  currentPaidInstallments: number;
  purchaseDate: string; // YYYY-MM-DD
  category: string;
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  category: string;
  color: string;
  iconName: string;
  notes?: string;
  history?: Array<{
    id: string;
    date: string;
    amount: number;
    note?: string;
  }>;
}

export interface DebtItem {
  id: string;
  name: string;
  creditor: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentsTotal: number;
  installmentsPaid: number;
  interestRate?: number; // % monthly/yearly
  dueDate: string; // YYYY-MM-DD
  priority: DebtPriority;
  category: string;
  notes?: string;
}

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  currentSpent: number;
  month: string; // YYYY-MM
  alertThreshold: number; // e.g. 80 (%)
}

export interface CategoryDefinition {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isCustom?: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'tip' | 'alert' | 'success' | 'info';
  title: string;
  message: string;
  actionable?: string;
  actionTab?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'bill' | 'card' | 'budget' | 'goal' | 'tip';
  linkTab?: string;
}

// Open Finance Types
export type BankConnectionStatus =
  | 'UPDATED'
  | 'UPDATING'
  | 'WAITING_USER_INPUT'
  | 'LOGIN_ERROR'
  | 'OUTDATED'
  | 'DISCONNECTED';

export type BankConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface BankConnection {
  id: string;
  userId: string;
  provider: 'pluggy' | 'mock' | string;
  providerItemId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo?: string;
  status: BankConnectionStatus;
  consentStatus: BankConsentStatus;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BankOpenFinanceAccount {
  id: string;
  userId: string;
  bankConnectionId: string;
  providerAccountId: string;
  institutionName: string;
  accountName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | string;
  accountNumberMasked: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankOpenFinanceTransaction {
  id: string;
  userId: string;
  bankAccountId: string;
  providerTransactionId: string;
  description: string;
  amount: number;
  transactionType: 'DEBIT' | 'CREDIT';
  category: string;
  transactionDate: string;
  status: 'POSTED' | 'PENDING' | string;
  createdAt: string;
  updatedAt: string;
}

export interface BankOpenFinanceCard {
  id: string;
  userId: string;
  bankConnectionId: string;
  providerCardId: string;
  institutionName: string;
  cardName: string;
  lastFourDigits: string;
  creditLimit: number;
  availableLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankOpenFinanceBill {
  id: string;
  userId: string;
  bankCardId: string;
  providerBillId: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'OPEN' | 'PAID' | 'OVERDUE' | string;
  createdAt: string;
  updatedAt: string;
}

