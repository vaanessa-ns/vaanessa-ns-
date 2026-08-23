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
  AppNotification
} from '../types';

export const initialCategories: CategoryDefinition[] = [
  // Despesas
  { id: 'cat-alimentacao', name: 'Alimentação', type: 'expense', icon: 'Utensils', color: '#F97316' },
  { id: 'cat-moradia', name: 'Moradia', type: 'expense', icon: 'Home', color: '#3B82F6' },
  { id: 'cat-transporte', name: 'Transporte', type: 'expense', icon: 'Car', color: '#EAB308' },
  { id: 'cat-saude', name: 'Saúde', type: 'expense', icon: 'HeartPulse', color: '#EF4444' },
  { id: 'cat-educacao', name: 'Educação', type: 'expense', icon: 'GraduationCap', color: '#8B5CF6' },
  { id: 'cat-lazer', name: 'Lazer', type: 'expense', icon: 'Smile', color: '#EC4899' },
  { id: 'cat-compras', name: 'Compras', type: 'expense', icon: 'ShoppingBag', color: '#06B6D4' },
  { id: 'cat-assinaturas', name: 'Assinaturas', type: 'expense', icon: 'Tv', color: '#6366F1' },
  { id: 'cat-contas', name: 'Contas Fixas', type: 'expense', icon: 'Receipt', color: '#10B981' },
  { id: 'cat-impostos', name: 'Impostos & Taxas', type: 'expense', icon: 'FileText', color: '#64748B' },
  { id: 'cat-pets', name: 'Pets', type: 'expense', icon: 'Dog', color: '#D97706' },
  { id: 'cat-viagens', name: 'Viagens', type: 'expense', icon: 'Plane', color: '#14B8A6' },
  { id: 'cat-outros-exp', name: 'Outros Gastos', type: 'expense', icon: 'MoreHorizontal', color: '#94A3B8' },

  // Receitas
  { id: 'cat-salario', name: 'Salário', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { id: 'cat-comissao', name: 'Comissão', type: 'income', icon: 'Percent', color: '#059669' },
  { id: 'cat-freelance', name: 'Freelance', type: 'income', icon: 'Laptop', color: '#0D9488' },
  { id: 'cat-vendas', name: 'Vendas', type: 'income', icon: 'Store', color: '#0284C7' },
  { id: 'cat-beneficios', name: 'Benefícios', type: 'income', icon: 'Gift', color: '#4F46E5' },
  { id: 'cat-rendimentos', name: 'Rendimentos', type: 'income', icon: 'TrendingUp', color: '#16A34A' },
  { id: 'cat-outros-inc', name: 'Outras Entradas', type: 'income', icon: 'PlusCircle', color: '#84CC16' },
];

export const initialUser: UserProfile = {
  id: 'user-default',
  name: 'Usuário',
  email: '',
  phone: '',
  monthlyIncome: 0,
  primaryGoal: '',
  financialStyle: 'individual',
  hasCreditCard: false,
  hasInstallments: false,
  onboarded: true,
  isPinEnabled: false,
  hideValues: false,
  themeMode: 'dark',
  createdAt: new Date().toISOString(),
};

export const initialAccounts: BankAccount[] = [];
export const initialCreditCards: CreditCard[] = [];
export const initialCardPurchases: CardPurchase[] = [];
export const initialFixedBills: FixedBill[] = [];
export const initialTransactions: Transaction[] = [];
export const initialGoals: FinancialGoal[] = [];
export const initialDebts: DebtItem[] = [];
export const initialBudgets: CategoryBudget[] = [];
export const initialNotifications: AppNotification[] = [];
