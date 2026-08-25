import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  BankAccount,
  Transaction,
  FixedBill,
  CreditCard,
  CardPurchase,
  FinancialGoal,
  DebtItem,
  CategoryBudget,
  CategoryDefinition,
  AppNotification,
  SmartInsight,
  BankConnection,
  BankOpenFinanceAccount,
  BankOpenFinanceTransaction,
  BankOpenFinanceCard,
  BankOpenFinanceBill
} from '../types';
import {
  initialUser,
  initialAccounts,
  initialTransactions,
  initialFixedBills,
  initialCreditCards,
  initialCardPurchases,
  initialGoals,
  initialDebts,
  initialBudgets,
  initialCategories,
  initialNotifications
} from '../data/initialData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface FinanceContextType {
  user: UserProfile;
  accounts: BankAccount[];
  transactions: Transaction[];
  fixedBills: FixedBill[];
  creditCards: CreditCard[];
  cardPurchases: CardPurchase[];
  goals: FinancialGoal[];
  debts: DebtItem[];
  budgets: CategoryBudget[];
  categories: CategoryDefinition[];
  notifications: AppNotification[];
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  quickAddDefaultType?: 'income' | 'expense' | 'transfer' | 'bill' | 'card_purchase';
  setQuickAddDefaultType: (type?: 'income' | 'expense' | 'transfer' | 'bill' | 'card_purchase') => void;
  isPinLocked: boolean;
  unlockWithPin: (pin: string) => boolean;
  lockApp: () => void;

  // Open Finance & Bank Connections
  bankConnections: BankConnection[];
  isSyncingBank: boolean;
  isConnectBankOpen: boolean;
  setIsConnectBankOpen: (open: boolean) => void;
  connectBank: (
    institutionId?: string,
    customName?: string,
    itemId?: string
  ) => Promise<{ success: boolean; message: string; data?: any }>;
  syncBankConnection: (connectionId?: string) => Promise<void>;
  disconnectBank: (connectionId: string) => Promise<void>;

  // Supabase sync states

  isSyncing: boolean;
  syncError: string | null;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  refreshData: () => Promise<void>;

  // Computed Financial Metrics
  availableBalance: number;
  monthIncomes: number;
  monthExpenses: number;
  monthRemaining: number;
  monthSavingsRate: number;
  totalNetWorth: number;
  totalCardLimit: number;
  totalCardUsed: number;
  totalDebtsRemaining: number;
  categorySpending: Record<string, number>;
  insights: SmartInsight[];

  // Mutations
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addAccount: (acc: Omit<BankAccount, 'id'>) => Promise<void>;
  updateAccount: (id: string, acc: Partial<BankAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, notes?: string, date?: string) => Promise<void>;

  addFixedBill: (bill: Omit<FixedBill, 'id'>) => Promise<void>;
  updateFixedBill: (id: string, bill: Partial<FixedBill>) => Promise<void>;
  deleteFixedBill: (id: string) => Promise<void>;
  payFixedBill: (billId: string, accountId?: string) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<{ success: boolean; error?: string }>;
  addCardPurchase: (purchase: Omit<CardPurchase, 'id' | 'installmentValue' | 'currentPaidInstallments'>) => Promise<void>;
  deleteCardPurchase: (id: string) => Promise<void>;
  payCardInvoice: (cardId: string, accountId: string, amount: number) => Promise<void>;

  addGoal: (goal: Omit<FinancialGoal, 'id'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<FinancialGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number, fromAccountId?: string, note?: string) => Promise<void>;

  addDebt: (debt: Omit<DebtItem, 'id' | 'remainingAmount' | 'installmentsPaid'>) => Promise<void>;
  updateDebt: (id: string, debt: Partial<DebtItem>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  payDebtInstallment: (debtId: string, amount: number, accountId?: string) => Promise<void>;

  updateBudget: (id: string, monthlyLimit: number, alertThreshold?: number) => Promise<void>;
  addCategory: (cat: Omit<CategoryDefinition, 'id'>) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  toggleHideValues: () => void;
  toggleTheme: () => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  resetAllData: () => void;
  importAllData: (data: any) => boolean;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'vfinance_user_v1',
  ACCOUNTS: 'vfinance_accounts_v1',
  TRANSACTIONS: 'vfinance_transactions_v1',
  BILLS: 'vfinance_bills_v1',
  CARDS: 'vfinance_cards_v1',
  PURCHASES: 'vfinance_purchases_v1',
  GOALS: 'vfinance_goals_v1',
  DEBTS: 'vfinance_debts_v1',
  BUDGETS: 'vfinance_budgets_v1',
  CATEGORIES: 'vfinance_categories_v1',
  NOTIFICATIONS: 'vfinance_notifications_v1',
};

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error loading storage ${key}`, e);
  }
  return defaultValue;
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultType, setQuickAddDefaultType] = useState<'income' | 'expense' | 'transfer' | 'bill' | 'card_purchase' | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // States
  const [user, setUser] = useState<UserProfile>(() => getStorage(STORAGE_KEYS.USER, initialUser));
  const [accounts, setAccounts] = useState<BankAccount[]>(() => getStorage(STORAGE_KEYS.ACCOUNTS, authUser ? [] : initialAccounts));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStorage(STORAGE_KEYS.TRANSACTIONS, authUser ? [] : initialTransactions));
  const [fixedBills, setFixedBills] = useState<FixedBill[]>(() => getStorage(STORAGE_KEYS.BILLS, authUser ? [] : initialFixedBills));
  const [creditCards, setCreditCards] = useState<CreditCard[]>(() => getStorage(STORAGE_KEYS.CARDS, authUser ? [] : initialCreditCards));
  const [cardPurchases, setCardPurchases] = useState<CardPurchase[]>(() => getStorage(STORAGE_KEYS.PURCHASES, authUser ? [] : initialCardPurchases));
  const [goals, setGoals] = useState<FinancialGoal[]>(() => getStorage(STORAGE_KEYS.GOALS, authUser ? [] : initialGoals));
  const [debts, setDebts] = useState<DebtItem[]>(() => getStorage(STORAGE_KEYS.DEBTS, authUser ? [] : initialDebts));
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => getStorage(STORAGE_KEYS.BUDGETS, authUser ? [] : initialBudgets));
  const [categories, setCategories] = useState<CategoryDefinition[]>(() => getStorage(STORAGE_KEYS.CATEGORIES, initialCategories));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStorage(STORAGE_KEYS.NOTIFICATIONS, authUser ? [] : initialNotifications));

  // Open Finance & Bank Connections
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);

  // Security Lock
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    return Boolean(user.isPinEnabled && user.pinCode);
  });


  // Sync with Local Storage for offline/cache
  useEffect(() => {
    if (!authUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(fixedBills));
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(creditCards));
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(cardPurchases));
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }
  }, [authUser, user, accounts, transactions, fixedBills, creditCards, cardPurchases, goals, debts, budgets, categories, notifications]);

  // Load from Supabase when user logs in
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !authUser) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // 1. Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileErr) console.warn('Error fetching profile:', profileErr.message);

      if (profileData) {
        setUser({
          id: profileData.id,
          name: profileData.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
          email: profileData.email || authUser.email || '',
          phone: profileData.phone || '',
          birthDate: profileData.birth_date || '',
          monthlyIncome: Number(profileData.monthly_income || 0),
          primaryGoal: profileData.primary_goal || 'Independência Financeira',
          financialStyle: (profileData.financial_style as any) || 'individual',
          hasCreditCard: Boolean(profileData.has_credit_card),
          hasInstallments: Boolean(profileData.has_installments),
          onboarded: Boolean(profileData.onboarded),
          pinCode: profileData.pin_code || undefined,
          isPinEnabled: Boolean(profileData.is_pin_enabled),
          hideValues: Boolean(profileData.hide_values),
          themeMode: (profileData.theme_mode as any) || 'dark',
          createdAt: profileData.created_at || new Date().toISOString(),
        });
      } else {
        // Create initial profile
        const newProf = {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
          email: authUser.email || '',
          monthly_income: 0,
          primary_goal: 'Independência Financeira',
          financial_style: 'individual',
          has_credit_card: false,
          has_installments: false,
          onboarded: false,
          theme_mode: 'dark',
        };
        await supabase.from('profiles').insert(newProf);
      }

      // Parallel queries for all collections
      const [
        accsRes,
        cardsRes,
        purchasesRes,
        billsRes,
        txsRes,
        goalsRes,
        goalContribsRes,
        debtsRes,
        budgetsRes,
        catsRes,
        notifsRes,
        bankConnsRes,
      ] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('credit_cards').select('*').order('created_at', { ascending: true }),
        supabase.from('card_purchases').select('*').order('created_at', { ascending: false }),
        supabase.from('fixed_bills').select('*').order('due_day', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('goals').select('*').order('deadline', { ascending: true }),
        supabase.from('goal_contributions').select('*').order('date', { ascending: false }),
        supabase.from('debts').select('*').order('priority', { ascending: true }),
        supabase.from('budgets').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('notifications').select('*').order('date', { ascending: false }),
        supabase.from('bank_connections').select('*').order('created_at', { ascending: false }),
      ]);


      if (accsRes.data) {
        setAccounts(accsRes.data.map(a => ({
          id: a.id,
          name: a.name,
          bank: a.bank,
          type: a.type,
          balance: Number(a.balance || 0),
          color: a.color,
          iconName: a.icon_name,
          isDefault: a.is_default,
        })));
      }

      if (cardsRes.data) {
        setCreditCards(cardsRes.data.map(c => ({
          id: c.id,
          name: c.name,
          bank: c.bank,
          totalLimit: Number(c.total_limit || 0),
          closingDay: c.closing_day,
          dueDay: c.due_day,
          color: c.color,
          lastDigits: c.last_digits,
          brand: c.brand,
        })));
      }

      if (purchasesRes.data) {
        setCardPurchases(purchasesRes.data.map(p => ({
          id: p.id,
          cardId: p.card_id,
          description: p.description,
          totalAmount: Number(p.total_amount || 0),
          installmentsCount: p.installments_count,
          installmentValue: Number(p.installment_value || 0),
          currentPaidInstallments: p.current_paid_installments,
          purchaseDate: p.purchase_date,
          category: p.category,
          notes: p.notes,
        })));
      }

      if (billsRes.data) {
        setFixedBills(billsRes.data.map(b => ({
          id: b.id,
          name: b.name,
          amount: Number(b.amount || 0),
          dueDay: b.due_day,
          category: b.category,
          paymentMethod: b.payment_method,
          recurrence: b.recurrence,
          status: b.status,
          accountId: b.account_id,
          lastPaidDate: b.last_paid_date,
          notes: b.notes,
          autoDebit: b.auto_debit,
        })));
      }

      if (txsRes.data) {
        setTransactions(txsRes.data.map(t => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: Number(t.amount || 0),
          category: t.category,
          date: t.date,
          paymentMethod: t.payment_method,
          accountId: t.account_id,
          toAccountId: t.to_account_id,
          cardId: t.card_id,
          recurrence: t.recurrence,
          isPaid: t.is_paid,
          isFixedBill: t.is_fixed_bill,
          fixedBillId: t.fixed_bill_id,
          installmentInfo: t.current_installment && t.total_installments ? {
            current: t.current_installment,
            total: t.total_installments,
            parentPurchaseId: t.parent_purchase_id || '',
          } : undefined,
          notes: t.notes,
          createdAt: t.created_at,
        })));
      }

      if (goalsRes.data) {
        const contributions = goalContribsRes.data || [];
        setGoals(goalsRes.data.map(g => ({
          id: g.id,
          name: g.name,
          targetAmount: Number(g.target_amount || 0),
          currentAmount: Number(g.current_amount || 0),
          deadline: g.deadline,
          category: g.category,
          color: g.color,
          iconName: g.icon_name,
          notes: g.notes,
          history: contributions.filter(c => c.goal_id === g.id).map(c => ({
            id: c.id,
            date: c.date,
            amount: Number(c.amount || 0),
            note: c.note,
          })),
        })));
      }

      if (debtsRes.data) {
        setDebts(debtsRes.data.map(d => ({
          id: d.id,
          name: d.name,
          creditor: d.creditor,
          totalAmount: Number(d.total_amount || 0),
          paidAmount: Number(d.paid_amount || 0),
          remainingAmount: Number(d.remaining_amount || 0),
          installmentsTotal: d.installments_total,
          installmentsPaid: d.installments_paid,
          interestRate: Number(d.interest_rate || 0),
          dueDate: d.due_date,
          priority: d.priority,
          category: d.category,
          notes: d.notes,
        })));
      }

      if (budgetsRes.data) {
        setBudgets(budgetsRes.data.map(b => ({
          id: b.id,
          category: b.category,
          monthlyLimit: Number(b.monthly_limit || 0),
          currentSpent: 0, // calculated dynamically below
          month: b.month,
          alertThreshold: b.alert_threshold,
        })));
      }

      if (catsRes.data && catsRes.data.length > 0) {
        setCategories(catsRes.data.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          isCustom: c.is_custom,
        })));
      }

      if (notifsRes.data) {
        setNotifications(notifsRes.data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          date: n.date,
          isRead: n.is_read,
          type: n.type,
          linkTab: n.link_tab,
        })));
      }

      if (bankConnsRes?.data) {
        setBankConnections(bankConnsRes.data.map(c => ({
          id: c.id,
          userId: c.user_id,
          provider: c.provider,
          providerItemId: c.provider_item_id,
          institutionId: c.institution_id,
          institutionName: c.institution_name,
          institutionLogo: c.institution_logo,
          status: c.status,
          consentStatus: c.consent_status,
          lastSyncAt: c.last_sync_at,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })));
      }
    } catch (err: any) {
      console.error('Failed to sync data with Supabase:', err);
      setSyncError('Não foi possível sincronizar todos os dados em nuvem no momento.');
    } finally {
      setIsSyncing(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (authUser && isSupabaseConfigured) {
      setAccounts([]);
      setTransactions([]);
      setFixedBills([]);
      setCreditCards([]);
      setCardPurchases([]);
      setGoals([]);
      setDebts([]);
      setBudgets([]);
      setNotifications([]);
      setBankConnections([]);
      refreshData();
    } else if (!authUser) {
      setUser(initialUser);
      setAccounts([]);
      setTransactions([]);
      setFixedBills([]);
      setCreditCards([]);
      setCardPurchases([]);
      setGoals([]);
      setDebts([]);
      setBudgets([]);
      setNotifications([]);
      setBankConnections([]);
    }
  }, [authUser, refreshData]);


  // Unlock PIN
  const unlockWithPin = (pin: string): boolean => {
    if (!user.pinCode || user.pinCode === pin) {
      setIsPinLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (user.isPinEnabled && user.pinCode) {
      setIsPinLocked(true);
    }
  };

  // ==========================================
  // Computed Financial Metrics (Dynamic)
  // ==========================================
  const availableBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  const monthIncomes = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'income' && t.date.startsWith(selectedMonth) && t.isPaid)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions, selectedMonth]);

  const monthExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth) && t.isPaid)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [transactions, selectedMonth]);

  const monthRemaining = useMemo(() => {
    return monthIncomes - monthExpenses;
  }, [monthIncomes, monthExpenses]);

  const monthSavingsRate = useMemo(() => {
    if (monthIncomes <= 0) return 0;
    const rate = ((monthIncomes - monthExpenses) / monthIncomes) * 100;
    return Math.max(0, Math.min(100, Math.round(rate)));
  }, [monthIncomes, monthExpenses]);

  const totalCardLimit = useMemo(() => {
    return creditCards.reduce((sum, c) => sum + (c.totalLimit || 0), 0);
  }, [creditCards]);

  const totalCardUsed = useMemo(() => {
    return cardPurchases.reduce((sum, p) => {
      const remainingInstallments = p.installmentsCount - p.currentPaidInstallments;
      return sum + (remainingInstallments * p.installmentValue);
    }, 0);
  }, [cardPurchases]);

  const totalDebtsRemaining = useMemo(() => {
    return debts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  }, [debts]);

  const totalNetWorth = useMemo(() => {
    const goalsTotal = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    return availableBalance + goalsTotal - totalDebtsRemaining;
  }, [availableBalance, goals, totalDebtsRemaining]);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + (t.amount || 0);
      });
    return map;
  }, [transactions, selectedMonth]);

  // Smart Insights Engine
  const insights = useMemo<SmartInsight[]>(() => {
    const list: SmartInsight[] = [];

    if (monthSavingsRate >= 20) {
      list.push({
        id: 'ins-1',
        type: 'success',
        title: 'Excelente taxa de poupança!',
        message: `Você está economizando ${monthSavingsRate}% da sua receita este mês. Ótimo momento para acelerar suas metas!`,
        actionable: 'Aportar em uma Meta',
        actionTab: 'goals',
      });
    } else if (monthExpenses > monthIncomes && monthIncomes > 0) {
      list.push({
        id: 'ins-2',
        type: 'alert',
        title: 'Despesas superando receitas',
        message: `Seus gastos este mês (R$ ${monthExpenses.toFixed(2)}) excederam suas entradas (R$ ${monthIncomes.toFixed(2)}).`,
        actionable: 'Revisar Orçamentos',
        actionTab: 'budgets',
      });
    }

    if (totalCardLimit > 0 && (totalCardUsed / totalCardLimit) > 0.7) {
      list.push({
        id: 'ins-3',
        type: 'alert',
        title: 'Atenção ao limite do cartão',
        message: `Você já comprometeu ${Math.round((totalCardUsed / totalCardLimit) * 100)}% do seu limite total de crédito.`,
        actionable: 'Ver Faturas',
        actionTab: 'cards',
      });
    }

    return list;
  }, [monthSavingsRate, monthExpenses, monthIncomes, totalCardUsed, totalCardLimit]);

  // ==========================================
  // Mutations & Database Persistence
  // ==========================================

  // Transactions
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tempId = crypto.randomUUID();
    const newTx: Transaction = {
      ...tx,
      id: tempId,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Update account balances
    if (tx.isPaid) {
      if (tx.type === 'income' && tx.accountId) {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === tx.accountId ? { ...acc, balance: acc.balance + tx.amount } : acc))
        );
      } else if (tx.type === 'expense' && tx.accountId && tx.paymentMethod !== 'credit') {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === tx.accountId ? { ...acc, balance: acc.balance - tx.amount } : acc))
        );
      } else if (tx.type === 'transfer' && tx.accountId && tx.toAccountId) {
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === tx.accountId) return { ...acc, balance: acc.balance - tx.amount };
            if (acc.id === tx.toAccountId) return { ...acc, balance: acc.balance + tx.amount };
            return acc;
          })
        );
      }
    }

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const { error } = await supabase.from('transactions').insert({
          id: tempId,
          user_id: authUser.id,
          account_id: tx.accountId || null,
          to_account_id: tx.toAccountId || null,
          card_id: tx.cardId || null,
          fixed_bill_id: tx.fixedBillId || null,
          parent_purchase_id: tx.installmentInfo?.parentPurchaseId || null,
          type: tx.type,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          payment_method: tx.paymentMethod,
          recurrence: tx.recurrence || 'none',
          is_paid: tx.isPaid,
          is_fixed_bill: tx.isFixedBill || false,
          current_installment: tx.installmentInfo?.current || null,
          total_installments: tx.installmentInfo?.total || null,
          notes: tx.notes || null,
        });

        if (error) console.error('Error inserting transaction to Supabase:', error);

        // Also persist updated account balance in Supabase
        if (tx.isPaid) {
          if (tx.type === 'income' && tx.accountId) {
            const acc = accounts.find((a) => a.id === tx.accountId);
            if (acc) {
              await supabase
                .from('accounts')
                .update({ balance: acc.balance + tx.amount })
                .eq('id', tx.accountId)
                .eq('user_id', authUser.id);
            }
          } else if (tx.type === 'expense' && tx.accountId && tx.paymentMethod !== 'credit') {
            const acc = accounts.find((a) => a.id === tx.accountId);
            if (acc) {
              await supabase
                .from('accounts')
                .update({ balance: acc.balance - tx.amount })
                .eq('id', tx.accountId)
                .eq('user_id', authUser.id);
            }
          } else if (tx.type === 'transfer' && tx.accountId && tx.toAccountId) {
            const fromAcc = accounts.find((a) => a.id === tx.accountId);
            const toAcc = accounts.find((a) => a.id === tx.toAccountId);
            if (fromAcc) {
              await supabase
                .from('accounts')
                .update({ balance: fromAcc.balance - tx.amount })
                .eq('id', tx.accountId)
                .eq('user_id', authUser.id);
            }
            if (toAcc) {
              await supabase
                .from('accounts')
                .update({ balance: toAcc.balance + tx.amount })
                .eq('id', tx.toAccountId)
                .eq('user_id', authUser.id);
            }
          }
        }
      } catch (err) {
        console.error('Supabase transaction insert failed:', err);
      }
    }
  };

  const updateTransaction = async (id: string, updated: Partial<Transaction>) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const updatePayload: any = {};
        if (updated.description !== undefined) updatePayload.description = updated.description;
        if (updated.amount !== undefined) updatePayload.amount = updated.amount;
        if (updated.category !== undefined) updatePayload.category = updated.category;
        if (updated.date !== undefined) updatePayload.date = updated.date;
        if (updated.paymentMethod !== undefined) updatePayload.payment_method = updated.paymentMethod;
        if (updated.isPaid !== undefined) updatePayload.is_paid = updated.isPaid;
        if (updated.notes !== undefined) updatePayload.notes = updated.notes;

        await supabase.from('transactions').update(updatePayload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating transaction:', e);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    // Reverse balance
    if (tx && tx.isPaid && tx.accountId) {
      if (tx.type === 'income') {
        setAccounts((prev) =>
          prev.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a))
        );
      } else if (tx.type === 'expense' && tx.paymentMethod !== 'credit') {
        setAccounts((prev) =>
          prev.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + tx.amount } : a))
        );
      }
    }

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('transactions').delete().eq('id', id).eq('user_id', authUser.id);

        if (tx && tx.isPaid && tx.accountId) {
          const acc = accounts.find((a) => a.id === tx.accountId);
          if (acc) {
            const newBal =
              tx.type === 'income'
                ? acc.balance - tx.amount
                : tx.paymentMethod !== 'credit'
                ? acc.balance + tx.amount
                : acc.balance;
            await supabase
              .from('accounts')
              .update({ balance: newBal })
              .eq('id', tx.accountId)
              .eq('user_id', authUser.id);
          }
        }
      } catch (e) {
        console.error('Error deleting transaction in Supabase:', e);
      }
    }
  };

  // Accounts
  const addAccount = async (acc: Omit<BankAccount, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newAcc = { ...acc, id: tempId };
    setAccounts((prev) => [...prev, newAcc]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('accounts').insert({
          id: tempId,
          user_id: authUser.id,
          name: acc.name,
          bank: acc.bank,
          type: acc.type,
          balance: acc.balance,
          color: acc.color,
          icon_name: acc.iconName,
          is_default: acc.isDefault || false,
        });
      } catch (e) {
        console.error('Error adding account in Supabase:', e);
      }
    }
  };

  const updateAccount = async (id: string, updated: Partial<BankAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.name) payload.name = updated.name;
        if (updated.bank) payload.bank = updated.bank;
        if (updated.balance !== undefined) payload.balance = updated.balance;
        if (updated.color) payload.color = updated.color;
        if (updated.iconName) payload.icon_name = updated.iconName;

        await supabase.from('accounts').update(payload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating account in Supabase:', e);
      }
    }
  };

  const deleteAccount = async (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('accounts').delete().eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error deleting account in Supabase:', e);
      }
    }
  };

  const transferBetweenAccounts = async (fromId: string, toId: string, amount: number, notes?: string, date?: string) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc || amount <= 0) return;

    await addTransaction({
      type: 'transfer',
      description: `Transferência: ${fromAcc.name} ➔ ${toAcc.name}`,
      amount,
      category: 'Transferência',
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod: 'transfer',
      accountId: fromId,
      toAccountId: toId,
      recurrence: 'none',
      isPaid: true,
      notes,
    });
  };

  // Fixed Bills
  const addFixedBill = async (bill: Omit<FixedBill, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newBill = { ...bill, id: tempId };
    setFixedBills((prev) => [...prev, newBill]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('fixed_bills').insert({
          id: tempId,
          user_id: authUser.id,
          name: bill.name,
          amount: bill.amount,
          due_day: bill.dueDay,
          category: bill.category,
          payment_method: bill.paymentMethod,
          recurrence: bill.recurrence,
          status: bill.status,
          account_id: bill.accountId || null,
          notes: bill.notes || null,
          auto_debit: bill.autoDebit || false,
        });
      } catch (e) {
        console.error('Error adding fixed bill in Supabase:', e);
      }
    }
  };

  const updateFixedBill = async (id: string, updated: Partial<FixedBill>) => {
    setFixedBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.name) payload.name = updated.name;
        if (updated.amount !== undefined) payload.amount = updated.amount;
        if (updated.dueDay) payload.due_day = updated.dueDay;
        if (updated.status) payload.status = updated.status;
        if (updated.lastPaidDate) payload.last_paid_date = updated.lastPaidDate;
        await supabase.from('fixed_bills').update(payload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating fixed bill in Supabase:', e);
      }
    }
  };

  const deleteFixedBill = async (id: string) => {
    setFixedBills((prev) => prev.filter((b) => b.id !== id));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('fixed_bills').delete().eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error deleting fixed bill in Supabase:', e);
      }
    }
  };

  const payFixedBill = async (billId: string, accountId?: string) => {
    const bill = fixedBills.find((b) => b.id === billId);
    if (!bill) return;

    const chosenAccount = accountId || bill.accountId || accounts[0]?.id;
    const today = new Date().toISOString().split('T')[0];

    await updateFixedBill(billId, {
      status: 'paid',
      lastPaidDate: today,
    });

    await addTransaction({
      type: 'expense',
      description: `Pagamento Conta Fixa: ${bill.name}`,
      amount: bill.amount,
      category: bill.category,
      date: today,
      paymentMethod: bill.paymentMethod,
      accountId: chosenAccount,
      recurrence: bill.recurrence,
      isPaid: true,
      isFixedBill: true,
      fixedBillId: bill.id,
    });

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
  };

  // Credit Cards
  const addCreditCard = async (card: Omit<CreditCard, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newCard = { ...card, id: tempId };
    setCreditCards((prev) => [...prev, newCard]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('credit_cards').insert({
          id: tempId,
          user_id: authUser.id,
          name: card.name,
          bank: card.bank,
          total_limit: card.totalLimit,
          closing_day: card.closingDay,
          due_day: card.dueDay,
          color: card.color,
          last_digits: card.lastDigits || null,
          brand: card.brand || 'mastercard',
        });
      } catch (e) {
        console.error('Error adding credit card in Supabase:', e);
      }
    }
  };

  const updateCreditCard = async (id: string, updated: Partial<CreditCard>) => {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.name) payload.name = updated.name;
        if (updated.totalLimit !== undefined) payload.total_limit = updated.totalLimit;
        if (updated.closingDay) payload.closing_day = updated.closingDay;
        if (updated.dueDay) payload.due_day = updated.dueDay;
        if (updated.color) payload.color = updated.color;
        await supabase.from('credit_cards').update(payload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating credit card in Supabase:', e);
      }
    }
  };

  const deleteCreditCard = async (id: string): Promise<{ success: boolean; error?: string }> => {
    // Optimistic local state update
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    setCardPurchases((prev) => prev.filter((p) => p.cardId !== id));
    setTransactions((prev) => prev.map((t) => t.cardId === id ? { ...t, cardId: undefined } : t));

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        // 1. Delete associated purchases in Supabase
        const { error: purErr } = await supabase
          .from('card_purchases')
          .delete()
          .eq('card_id', id)
          .eq('user_id', authUser.id);

        if (purErr) {
          console.warn('Note deleting associated card purchases:', purErr);
        }

        // 2. Disassociate any transactions linked to this card
        const { error: txErr } = await supabase
          .from('transactions')
          .update({ card_id: null })
          .eq('card_id', id)
          .eq('user_id', authUser.id);

        if (txErr) {
          console.warn('Note disassociating transactions for card:', txErr);
        }

        // 3. Delete the credit card record
        const { error: cardErr } = await supabase
          .from('credit_cards')
          .delete()
          .eq('id', id)
          .eq('user_id', authUser.id);

        if (cardErr) {
          console.error('Error deleting credit card in Supabase:', cardErr);
          await refreshData();
          return { success: false, error: cardErr.message || 'Erro ao excluir o cartão no banco de dados.' };
        }

        return { success: true };
      } catch (e: any) {
        console.error('Exception deleting credit card in Supabase:', e);
        await refreshData();
        return { success: false, error: e?.message || 'Falha na comunicação com o banco de dados.' };
      }
    }

    return { success: true };
  };

  const addCardPurchase = async (purchase: Omit<CardPurchase, 'id' | 'installmentValue' | 'currentPaidInstallments'>) => {
    const tempId = crypto.randomUUID();
    const instVal = Number((purchase.totalAmount / purchase.installmentsCount).toFixed(2));
    const newPurchase: CardPurchase = {
      ...purchase,
      id: tempId,
      installmentValue: instVal,
      currentPaidInstallments: 0,
    };

    setCardPurchases((prev) => [newPurchase, ...prev]);

    // Create immediate transaction for 1st installment
    await addTransaction({
      type: 'expense',
      description: `${purchase.description} (1/${purchase.installmentsCount})`,
      amount: instVal,
      category: purchase.category,
      date: purchase.purchaseDate,
      paymentMethod: 'credit',
      cardId: purchase.cardId,
      recurrence: 'none',
      isPaid: true,
      installmentInfo: {
        current: 1,
        total: purchase.installmentsCount,
        parentPurchaseId: tempId,
      },
      notes: purchase.notes,
    });

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('card_purchases').insert({
          id: tempId,
          user_id: authUser.id,
          card_id: purchase.cardId,
          description: purchase.description,
          total_amount: purchase.totalAmount,
          installments_count: purchase.installmentsCount,
          installment_value: instVal,
          current_paid_installments: 0,
          purchase_date: purchase.purchaseDate,
          category: purchase.category,
          notes: purchase.notes || null,
        });
      } catch (e) {
        console.error('Error adding card purchase in Supabase:', e);
      }
    }
  };

  const deleteCardPurchase = async (id: string) => {
    setCardPurchases((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.installmentInfo?.parentPurchaseId !== id));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('card_purchases').delete().eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error deleting card purchase in Supabase:', e);
      }
    }
  };

  const payCardInvoice = async (cardId: string, accountId: string, amount: number) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card || amount <= 0) return;

    await addTransaction({
      type: 'expense',
      description: `Pagamento Fatura: ${card.name}`,
      amount,
      category: 'Fatura de Cartão',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'debit',
      accountId,
      recurrence: 'none',
      isPaid: true,
    });

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
  };

  // Goals
  const addGoal = async (goal: Omit<FinancialGoal, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newGoal: FinancialGoal = { ...goal, id: tempId, history: [] };
    setGoals((prev) => [...prev, newGoal]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('goals').insert({
          id: tempId,
          user_id: authUser.id,
          name: goal.name,
          target_amount: goal.targetAmount,
          current_amount: goal.currentAmount || 0,
          deadline: goal.deadline,
          category: goal.category,
          color: goal.color,
          icon_name: goal.iconName,
          notes: goal.notes || null,
        });
      } catch (e) {
        console.error('Error adding goal in Supabase:', e);
      }
    }
  };

  const updateGoal = async (id: string, updated: Partial<FinancialGoal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updated } : g)));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.name) payload.name = updated.name;
        if (updated.targetAmount !== undefined) payload.target_amount = updated.targetAmount;
        if (updated.currentAmount !== undefined) payload.current_amount = updated.currentAmount;
        if (updated.deadline) payload.deadline = updated.deadline;
        if (updated.color) payload.color = updated.color;
        await supabase.from('goals').update(payload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating goal in Supabase:', e);
      }
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('goals').delete().eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error deleting goal in Supabase:', e);
      }
    }
  };

  const contributeToGoal = async (goalId: string, amount: number, fromAccountId?: string, note?: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || amount <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const newCurrent = goal.currentAmount + amount;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const newHist = [
            ...(g.history || []),
            { id: crypto.randomUUID(), date: today, amount, note },
          ];
          return { ...g, currentAmount: newCurrent, history: newHist };
        }
        return g;
      })
    );

    if (fromAccountId) {
      await addTransaction({
        type: 'expense',
        description: `Aporte na Meta: ${goal.name}`,
        amount,
        category: 'Investimentos',
        date: today,
        paymentMethod: 'transfer',
        accountId: fromAccountId,
        recurrence: 'none',
        isPaid: true,
        notes: note,
      });
    }

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('goals').update({ current_amount: newCurrent }).eq('id', goalId).eq('user_id', authUser.id);
        await supabase.from('goal_contributions').insert({
          user_id: authUser.id,
          goal_id: goalId,
          amount,
          date: today,
          note: note || null,
        });
      } catch (e) {
        console.error('Error saving goal contribution in Supabase:', e);
      }
    }

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  // Debts
  const addDebt = async (debt: Omit<DebtItem, 'id' | 'remainingAmount' | 'installmentsPaid'>) => {
    const tempId = crypto.randomUUID();
    const rem = debt.totalAmount - (debt.paidAmount || 0);
    const newDebt: DebtItem = {
      ...debt,
      id: tempId,
      remainingAmount: rem,
      installmentsPaid: 0,
    };

    setDebts((prev) => [...prev, newDebt]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('debts').insert({
          id: tempId,
          user_id: authUser.id,
          name: debt.name,
          creditor: debt.creditor,
          total_amount: debt.totalAmount,
          paid_amount: debt.paidAmount || 0,
          remaining_amount: rem,
          installments_total: debt.installmentsTotal,
          installments_paid: 0,
          interest_rate: debt.interestRate || 0,
          due_date: debt.dueDate,
          priority: debt.priority,
          category: debt.category,
          notes: debt.notes || null,
        });
      } catch (e) {
        console.error('Error adding debt in Supabase:', e);
      }
    }
  };

  const updateDebt = async (id: string, updated: Partial<DebtItem>) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.paidAmount !== undefined) payload.paid_amount = updated.paidAmount;
        if (updated.remainingAmount !== undefined) payload.remaining_amount = updated.remainingAmount;
        if (updated.installmentsPaid !== undefined) payload.installments_paid = updated.installmentsPaid;
        await supabase.from('debts').update(payload).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error updating debt in Supabase:', e);
      }
    }
  };

  const deleteDebt = async (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('debts').delete().eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error deleting debt in Supabase:', e);
      }
    }
  };

  const payDebtInstallment = async (debtId: string, amount: number, accountId?: string) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt || amount <= 0) return;

    const newPaid = debt.paidAmount + amount;
    const newRemaining = Math.max(0, debt.totalAmount - newPaid);
    const newInstPaid = debt.installmentsPaid + 1;

    await updateDebt(debtId, {
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      installmentsPaid: newInstPaid,
    });

    const chosenAccount = accountId || accounts[0]?.id;
    if (chosenAccount) {
      await addTransaction({
        type: 'expense',
        description: `Amortização Dívida: ${debt.name} (${newInstPaid}/${debt.installmentsTotal})`,
        amount,
        category: debt.category || 'Empréstimos',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'pix',
        accountId: chosenAccount,
        recurrence: 'none',
        isPaid: true,
      });
    }

    confetti({ particleCount: 50, spread: 60 });
  };

  // Budgets
  const updateBudget = async (id: string, monthlyLimit: number, alertThreshold = 80) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, monthlyLimit, alertThreshold } : b))
    );

    const bgt = budgets.find((b) => b.id === id);
    if (isSupabaseConfigured && supabase && authUser && bgt) {
      try {
        await supabase.from('budgets').upsert({
          id: bgt.id,
          user_id: authUser.id,
          category: bgt.category,
          monthly_limit: monthlyLimit,
          month: bgt.month,
          alert_threshold: alertThreshold,
        });
      } catch (e) {
        console.error('Error upserting budget in Supabase:', e);
      }
    }
  };

  // Categories
  const addCategory = async (cat: Omit<CategoryDefinition, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newCat = { ...cat, id: tempId, isCustom: true };
    setCategories((prev) => [...prev, newCat]);

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('categories').insert({
          id: tempId,
          user_id: authUser.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          is_custom: true,
        });
      } catch (e) {
        console.error('Error adding category in Supabase:', e);
      }
    }
  };

  // Profile
  const updateUserProfile = async (updated: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updated }));

    if (isSupabaseConfigured && supabase && authUser) {
      try {
        const payload: any = {};
        if (updated.name !== undefined) payload.name = updated.name;
        if (updated.phone !== undefined) payload.phone = updated.phone;
        if (updated.monthlyIncome !== undefined) payload.monthly_income = updated.monthlyIncome;
        if (updated.primaryGoal !== undefined) payload.primary_goal = updated.primaryGoal;
        if (updated.financialStyle !== undefined) payload.financial_style = updated.financialStyle;
        if (updated.onboarded !== undefined) payload.onboarded = updated.onboarded;
        if (updated.pinCode !== undefined) payload.pin_code = updated.pinCode;
        if (updated.isPinEnabled !== undefined) payload.is_pin_enabled = updated.isPinEnabled;
        if (updated.hideValues !== undefined) payload.hide_values = updated.hideValues;
        if (updated.themeMode !== undefined) payload.theme_mode = updated.themeMode;

        await supabase.from('profiles').update(payload).eq('id', authUser.id);
      } catch (e) {
        console.error('Error updating profile in Supabase:', e);
      }
    }
  };

  const toggleHideValues = () => {
    updateUserProfile({ hideValues: !user.hideValues });
  };

  const toggleTheme = () => {
    const next = user.themeMode === 'dark' ? 'light' : 'dark';
    updateUserProfile({ themeMode: next });
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Notifications
  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error marking notification in Supabase:', e);
      }
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    if (isSupabaseConfigured && supabase && authUser) {
      try {
        await supabase.from('notifications').delete().eq('user_id', authUser.id);
      } catch (e) {
        console.error('Error clearing notifications in Supabase:', e);
      }
    }
  };

  // Open Finance & Bank Operations
  const connectBank = async (
    institutionId?: string,
    customName?: string,
    itemId?: string
  ): Promise<{ success: boolean; message: string; data?: any }> => {
    setIsSyncingBank(true);
    try {
      // Try /api/pluggy/sync first, fallback to /api/open-finance/sync
      let res = await fetch('/api/pluggy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          institutionId: institutionId || '0',
          institutionName: customName,
        }),
      });

      if (!res.ok) {
        res = await fetch('/api/open-finance/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            institutionId: institutionId || '0',
            institutionName: customName,
          }),
        });
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Falha ao conectar instituição bancária.');
      }

      const payload = data.data;
      const userId = authUser ? authUser.id : (user.id || 'user_local');
      const newConnId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `conn_${Date.now()}`;

      const newConnection: BankConnection = {
        id: newConnId,
        userId,
        provider: payload.connection?.provider || 'pluggy',
        providerItemId: payload.connection?.providerItemId || itemId || `item_${Date.now()}`,
        institutionId: payload.connection?.institutionId || institutionId || '0',
        institutionName: payload.connection?.institutionName || customName || 'Instituição Bancária',
        status: payload.connection?.status || 'UPDATED',
        consentStatus: 'ACTIVE',
        lastSyncAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setBankConnections((prev) => [
        newConnection,
        ...prev.filter((c) => c.institutionName !== newConnection.institutionName && c.providerItemId !== newConnection.providerItemId),
      ]);

      // Save to Supabase bank_connections
      if (isSupabaseConfigured && supabase && authUser) {
        try {
          await supabase.from('bank_connections').insert({
            id: newConnId,
            user_id: authUser.id,
            provider: newConnection.provider,
            provider_item_id: newConnection.providerItemId,
            institution_id: newConnection.institutionId,
            institution_name: newConnection.institutionName,
            status: 'UPDATED',
            consent_status: 'ACTIVE',
            last_sync_at: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Could not insert to bank_connections in Supabase:', err);
        }
      }

      // Map accounts into accounts & bank_accounts
      if (payload.accounts && payload.accounts.length > 0) {
        for (const acc of payload.accounts) {
          const accId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const mappedType =
            acc.accountType === 'SAVINGS'
              ? 'savings'
              : acc.accountType === 'INVESTMENT'
              ? 'investment'
              : 'checking';
          const color = acc.institutionName?.toLowerCase().includes('nubank')
            ? '#820AD1'
            : acc.institutionName?.toLowerCase().includes('ita')
            ? '#EC7000'
            : acc.institutionName?.toLowerCase().includes('bradesco')
            ? '#CC092F'
            : acc.institutionName?.toLowerCase().includes('santander')
            ? '#EA1D25'
            : '#10B981';

          const newAcc: BankAccount = {
            id: accId,
            name: acc.accountName,
            bank: acc.institutionName,
            type: mappedType,
            balance: Number(acc.balance || 0),
            color,
            iconName: 'Building2',
            isDefault: mappedType === 'checking',
          };

          setAccounts((prev) => [newAcc, ...prev.filter((a) => a.name !== acc.accountName)]);

          if (isSupabaseConfigured && supabase && authUser) {
            try {
              await supabase.from('accounts').insert({
                id: accId,
                user_id: authUser.id,
                name: newAcc.name,
                bank: newAcc.bank,
                type: newAcc.type,
                balance: newAcc.balance,
                color: newAcc.color,
                icon_name: newAcc.iconName,
                is_default: newAcc.isDefault,
              });

              await supabase.from('bank_accounts').insert({
                id: accId,
                user_id: authUser.id,
                bank_connection_id: newConnId,
                provider_account_id: acc.providerAccountId,
                institution_name: acc.institutionName,
                account_name: acc.accountName,
                account_type: acc.accountType,
                account_number_masked: acc.accountNumberMasked,
                balance: acc.balance,
                currency: acc.currency || 'BRL',
              });
            } catch (e) {
              console.warn('Error inserting account into Supabase:', e);
            }
          }

          // Insert transactions for this account
          if (acc.transactions && acc.transactions.length > 0) {
            for (const tx of acc.transactions) {
              const txId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const txType = tx.transactionType === 'CREDIT' ? 'income' : 'expense';
              const newTx: Transaction = {
                id: txId,
                type: txType,
                description: tx.description,
                amount: Number(tx.amount || 0),
                category: tx.category || 'Geral',
                date: tx.transactionDate,
                paymentMethod: 'pix',
                accountId: accId,
                recurrence: 'none',
                isPaid: true,
                createdAt: new Date().toISOString(),
              };

              setTransactions((prev) => [newTx, ...prev]);

              if (isSupabaseConfigured && supabase && authUser) {
                try {
                  await supabase.from('transactions').insert({
                    id: txId,
                    user_id: authUser.id,
                    type: newTx.type,
                    description: newTx.description,
                    amount: newTx.amount,
                    category: newTx.category,
                    date: newTx.date,
                    payment_method: newTx.paymentMethod,
                    account_id: newTx.accountId,
                    recurrence: 'none',
                    is_paid: true,
                  });

                  await supabase.from('bank_transactions').insert({
                    id: txId,
                    user_id: authUser.id,
                    bank_account_id: accId,
                    provider_transaction_id: tx.providerTransactionId,
                    description: tx.description,
                    amount: tx.amount,
                    transaction_type: tx.transactionType,
                    category: tx.category,
                    transaction_date: tx.transactionDate,
                    status: tx.status || 'POSTED',
                  });
                } catch (e) {
                  console.warn('Error inserting transaction into Supabase:', e);
                }
              }
            }
          }
        }
      }

      // Map cards
      if (payload.cards && payload.cards.length > 0) {
        for (const card of payload.cards) {
          const cardId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const color = card.institutionName?.toLowerCase().includes('nubank') ? '#820AD1' : '#10B981';
          const newCard: CreditCard = {
            id: cardId,
            name: card.cardName,
            bank: card.institutionName,
            totalLimit: Number(card.creditLimit || 0),
            closingDay: 20,
            dueDay: 28,
            color,
            lastDigits: card.lastFourDigits,
            brand: 'mastercard',
          };

          setCreditCards((prev) => [newCard, ...prev.filter((c) => c.name !== card.cardName)]);

          if (isSupabaseConfigured && supabase && authUser) {
            try {
              await supabase.from('credit_cards').insert({
                id: cardId,
                user_id: authUser.id,
                name: newCard.name,
                bank: newCard.bank,
                total_limit: newCard.totalLimit,
                closing_day: newCard.closingDay,
                due_day: newCard.dueDay,
                color: newCard.color,
                last_digits: newCard.lastDigits,
                brand: newCard.brand,
              });

              await supabase.from('bank_cards').insert({
                id: cardId,
                user_id: authUser.id,
                bank_connection_id: newConnId,
                provider_card_id: card.providerCardId,
                institution_name: card.institutionName,
                card_name: card.cardName,
                last_four_digits: card.lastFourDigits,
                credit_limit: card.creditLimit,
                available_limit: card.availableLimit,
              });
            } catch (e) {
              console.warn('Error inserting card into Supabase:', e);
            }
          }
        }
      }

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {}

      return {
        success: true,
        message: `Conta ${payload.connection.institutionName} conectada com sucesso via Open Finance!`,
      };
    } catch (err: any) {
      console.error('Error connecting bank:', err);
      return {
        success: false,
        message: err.message || 'Não foi possível completar a conexão bancária.',
      };
    } finally {
      setIsSyncingBank(false);
    }
  };

  const syncBankConnection = async (connectionId?: string) => {
    setIsSyncingBank(true);
    try {
      const target = bankConnections.find((c) => c.id === connectionId) || bankConnections[0];
      if (!target) return;

      const res = await fetch('/api/open-finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: target.providerItemId,
          institutionId: target.institutionId,
          institutionName: target.institutionName,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const now = new Date().toISOString();
        setBankConnections((prev) =>
          prev.map((c) => (c.id === target.id ? { ...c, lastSyncAt: now, status: 'UPDATED' } : c))
        );
        if (isSupabaseConfigured && supabase && authUser) {
          await supabase
            .from('bank_connections')
            .update({ last_sync_at: now, status: 'UPDATED' })
            .eq('id', target.id)
            .eq('user_id', authUser.id);
        }
      }
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setIsSyncingBank(false);
    }
  };

  const disconnectBank = async (connectionId: string) => {
    const target = bankConnections.find((c) => c.id === connectionId);
    if (!target) return;

    try {
      await fetch('/api/open-finance/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: target.providerItemId }),
      });

      setBankConnections((prev) => prev.filter((c) => c.id !== connectionId));
      if (isSupabaseConfigured && supabase && authUser) {
        await supabase
          .from('bank_connections')
          .delete()
          .eq('id', connectionId)
          .eq('user_id', authUser.id);
      }
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  };

  // Reset demo
  const resetAllData = () => {
    setUser(initialUser);
    setAccounts(initialAccounts);
    setTransactions(initialTransactions);
    setFixedBills(initialFixedBills);
    setCreditCards(initialCreditCards);
    setCardPurchases(initialCardPurchases);
    setGoals(initialGoals);
    setDebts(initialDebts);
    setBudgets(initialBudgets);
    setCategories(initialCategories);
    setNotifications(initialNotifications);
    setBankConnections([]);
  };

  const importAllData = (data: any): boolean => {
    try {
      if (data.accounts) setAccounts(data.accounts);
      if (data.transactions) setTransactions(data.transactions);
      if (data.bills) setFixedBills(data.bills);
      if (data.cards) setCreditCards(data.cards);
      if (data.purchases) setCardPurchases(data.purchases);
      if (data.goals) setGoals(data.goals);
      if (data.debts) setDebts(data.debts);
      if (data.budgets) setBudgets(data.budgets);
      if (data.user) setUser(data.user);
      return true;
    } catch (e) {
      console.error('Failed to import backup', e);
      return false;
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        accounts,
        transactions,
        fixedBills,
        creditCards,
        cardPurchases,
        goals,
        debts,
        budgets,
        categories,
        notifications,
        selectedMonth,
        setSelectedMonth,
        activeTab,
        setActiveTab,
        isQuickAddOpen,
        setIsQuickAddOpen,
        quickAddDefaultType,
        setQuickAddDefaultType,
        isPinLocked,
        unlockWithPin,
        lockApp,

        // Open Finance & Bank Connections
        bankConnections,
        isSyncingBank,
        isConnectBankOpen,
        setIsConnectBankOpen,
        connectBank,
        syncBankConnection,
        disconnectBank,

        // Supabase sync states
        isSyncing,
        syncError,
        isAuthModalOpen,
        setIsAuthModalOpen,
        refreshData,


        // Computed
        availableBalance,
        monthIncomes,
        monthExpenses,
        monthRemaining,
        monthSavingsRate,
        totalNetWorth,
        totalCardLimit,
        totalCardUsed,
        totalDebtsRemaining,
        categorySpending,
        insights,

        // Actions
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        transferBetweenAccounts,
        addFixedBill,
        updateFixedBill,
        deleteFixedBill,
        payFixedBill,
        addCreditCard,
        updateCreditCard,
        deleteCreditCard,
        addCardPurchase,
        deleteCardPurchase,
        payCardInvoice,
        addGoal,
        updateGoal,
        deleteGoal,
        contributeToGoal,
        addDebt,
        updateDebt,
        deleteDebt,
        payDebtInstallment,
        updateBudget,
        addCategory,
        updateUserProfile,
        toggleHideValues,
        toggleTheme,
        markNotificationAsRead,
        clearAllNotifications,
        resetAllData,
        importAllData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};
