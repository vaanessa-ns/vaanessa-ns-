-- =====================================================================
-- Vfinance — Supabase SQL Migration Schema (Idempotent)
-- Complete multi-tenant financial schema with Row Level Security (RLS)
-- Can be executed multiple times safely without 42710 policy errors
-- =====================================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  monthly_income NUMERIC(12,2) DEFAULT 0,
  primary_goal TEXT,
  financial_style TEXT DEFAULT 'individual',
  has_credit_card BOOLEAN DEFAULT false,
  has_installments BOOLEAN DEFAULT false,
  onboarded BOOLEAN DEFAULT false,
  pin_code TEXT,
  is_pin_enabled BOOLEAN DEFAULT false,
  hide_values BOOLEAN DEFAULT false,
  theme_mode TEXT DEFAULT 'dark',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bank Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#10B981',
  icon_name TEXT NOT NULL DEFAULT 'Landmark',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Credit Cards
CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  total_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  last_digits TEXT,
  brand TEXT DEFAULT 'mastercard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Credit Card Purchases / Installments
CREATE TABLE IF NOT EXISTS public.card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  installment_value NUMERIC(12,2) NOT NULL,
  current_paid_installments INTEGER NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Fixed Bills (Contas Fixas)
CREATE TABLE IF NOT EXISTS public.fixed_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  recurrence TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'pending',
  last_paid_date DATE,
  notes TEXT,
  auto_debit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Transactions (Movimentações)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  fixed_bill_id UUID REFERENCES public.fixed_bills(id) ON DELETE SET NULL,
  parent_purchase_id UUID REFERENCES public.card_purchases(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  recurrence TEXT NOT NULL DEFAULT 'none',
  is_paid BOOLEAN NOT NULL DEFAULT true,
  is_fixed_bill BOOLEAN DEFAULT false,
  current_installment INTEGER,
  total_installments INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Financial Goals (Metas)
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline DATE NOT NULL,
  category TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon_name TEXT NOT NULL DEFAULT 'Target',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Goal Contributions (Histórico de aportes em metas)
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Debts (Controle de Dívidas)
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  creditor TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL,
  installments_total INTEGER NOT NULL DEFAULT 1,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  interest_rate NUMERIC(6,2) DEFAULT 0,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Budgets (Orçamentos Mensais por Categoria)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL,
  month TEXT NOT NULL, -- Format YYYY-MM
  alert_threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_category_month UNIQUE (user_id, category, month)
);

-- 11. Categories (Categorias do Sistema e Customizadas)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means global system default
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Notifications (Notificações e Alertas)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL,
  link_tab TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- Open Finance Integration Tables (Pluggy / Central Bank Open Finance)
-- =====================================================================

-- 13. Bank Connections (Institutions connected via Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pluggy',
  provider_item_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  institution_logo TEXT,
  status TEXT NOT NULL DEFAULT 'UPDATED',
  consent_status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Bank Accounts (Synchronized via Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  provider_account_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'CHECKING',
  account_number_masked TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Bank Transactions (Synchronized via Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  provider_transaction_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  transaction_type TEXT NOT NULL, -- 'DEBIT' or 'CREDIT'
  category TEXT DEFAULT 'Outros',
  transaction_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'POSTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Bank Cards (Credit cards synchronized via Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  provider_card_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  card_name TEXT NOT NULL,
  last_four_digits TEXT,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  available_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Bank Bills (Credit card invoices synchronized via Open Finance)
CREATE TABLE IF NOT EXISTS public.bank_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_card_id UUID NOT NULL REFERENCES public.bank_cards(id) ON DELETE CASCADE,
  provider_bill_id TEXT NOT NULL,
  due_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- Indexes for High Performance
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_card_purchases_user_card ON public.card_purchases(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_fixed_bills_user_id ON public.fixed_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_conn_id ON public.bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_acc_id ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_cards_user_id ON public.bank_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_bills_user_id ON public.bank_bills(user_id);

-- =====================================================================
-- Row Level Security (RLS) Policies (Idempotent: DROP IF EXISTS first)
-- =====================================================================

-- 1. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Os usuários podem visualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Os usuários podem inserir seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Os usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Os usuários podem deletar seus próprios perfis" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 2. Accounts RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Os usuários podem visualizar suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Os usuários podem inserir suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Os usuários podem atualizar suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Os usuários podem deletar suas próprias contas" ON public.accounts;

CREATE POLICY "Users can view their own accounts" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Credit Cards RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can insert their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can update their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can delete their own credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Os usuários podem visualizar seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Os usuários podem inserir seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Os usuários podem atualizar seus próprios cartões" ON public.credit_cards;
DROP POLICY IF EXISTS "Os usuários podem deletar seus próprios cartões" ON public.credit_cards;

CREATE POLICY "Users can view their own credit cards" ON public.credit_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credit cards" ON public.credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credit cards" ON public.credit_cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit cards" ON public.credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Card Purchases RLS
ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own card purchases" ON public.card_purchases;
DROP POLICY IF EXISTS "Users can insert their own card purchases" ON public.card_purchases;
DROP POLICY IF EXISTS "Users can update their own card purchases" ON public.card_purchases;
DROP POLICY IF EXISTS "Users can delete their own card purchases" ON public.card_purchases;

CREATE POLICY "Users can view their own card purchases" ON public.card_purchases
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own card purchases" ON public.card_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own card purchases" ON public.card_purchases
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own card purchases" ON public.card_purchases
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Fixed Bills RLS
ALTER TABLE public.fixed_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own fixed bills" ON public.fixed_bills;
DROP POLICY IF EXISTS "Users can insert their own fixed bills" ON public.fixed_bills;
DROP POLICY IF EXISTS "Users can update their own fixed bills" ON public.fixed_bills;
DROP POLICY IF EXISTS "Users can delete their own fixed bills" ON public.fixed_bills;

CREATE POLICY "Users can view their own fixed bills" ON public.fixed_bills
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fixed bills" ON public.fixed_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fixed bills" ON public.fixed_bills
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fixed bills" ON public.fixed_bills
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Transactions RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Goals RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;

CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Goal Contributions RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can insert their own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can update their own goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can delete their own goal contributions" ON public.goal_contributions;

CREATE POLICY "Users can view their own goal contributions" ON public.goal_contributions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goal contributions" ON public.goal_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goal contributions" ON public.goal_contributions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goal contributions" ON public.goal_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Debts RLS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can insert their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can update their own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can delete their own debts" ON public.debts;

CREATE POLICY "Users can view their own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Budgets RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;

CREATE POLICY "Users can view their own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- 11. Categories RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view default or their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

CREATE POLICY "Users can view default or their own categories" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- 12. Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 13. Bank Connections RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can insert their own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can update their own bank connections" ON public.bank_connections;
DROP POLICY IF EXISTS "Users can delete their own bank connections" ON public.bank_connections;

CREATE POLICY "Users can view their own bank connections" ON public.bank_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank connections" ON public.bank_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank connections" ON public.bank_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank connections" ON public.bank_connections
  FOR DELETE USING (auth.uid() = user_id);

-- 14. Bank Accounts RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank accounts" ON public.bank_accounts;

CREATE POLICY "Users can view their own bank accounts" ON public.bank_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank accounts" ON public.bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank accounts" ON public.bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank accounts" ON public.bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- 15. Bank Transactions RLS
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can delete their own bank transactions" ON public.bank_transactions;

CREATE POLICY "Users can view their own bank transactions" ON public.bank_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank transactions" ON public.bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank transactions" ON public.bank_transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank transactions" ON public.bank_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 16. Bank Cards RLS
ALTER TABLE public.bank_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can insert their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can update their own bank cards" ON public.bank_cards;
DROP POLICY IF EXISTS "Users can delete their own bank cards" ON public.bank_cards;

CREATE POLICY "Users can view their own bank cards" ON public.bank_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank cards" ON public.bank_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank cards" ON public.bank_cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank cards" ON public.bank_cards
  FOR DELETE USING (auth.uid() = user_id);

-- 17. Bank Bills RLS
ALTER TABLE public.bank_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank bills" ON public.bank_bills;
DROP POLICY IF EXISTS "Users can insert their own bank bills" ON public.bank_bills;
DROP POLICY IF EXISTS "Users can update their own bank bills" ON public.bank_bills;
DROP POLICY IF EXISTS "Users can delete their own bank bills" ON public.bank_bills;

CREATE POLICY "Users can view their own bank bills" ON public.bank_bills
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank bills" ON public.bank_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank bills" ON public.bank_bills
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank bills" ON public.bank_bills
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- Trigger: Auto-create Profile on Auth Signup
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, onboarded, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- Seed: Default System Categories (Global, user_id IS NULL)
-- =====================================================================
INSERT INTO public.categories (name, type, icon, color, is_custom) VALUES
  ('Alimentação', 'expense', 'Utensils', '#F97316', false),
  ('Moradia', 'expense', 'Home', '#3B82F6', false),
  ('Transporte', 'expense', 'Car', '#EAB308', false),
  ('Saúde', 'expense', 'HeartPulse', '#EF4444', false),
  ('Educação', 'expense', 'GraduationCap', '#8B5CF6', false),
  ('Lazer', 'expense', 'Smile', '#EC4899', false),
  ('Compras', 'expense', 'ShoppingBag', '#06B6D4', false),
  ('Assinaturas', 'expense', 'Tv', '#6366F1', false),
  ('Contas Fixas', 'expense', 'Receipt', '#10B981', false),
  ('Impostos & Taxas', 'expense', 'FileText', '#64748B', false),
  ('Pets', 'expense', 'Dog', '#D97706', false),
  ('Viagens', 'expense', 'Plane', '#14B8A6', false),
  ('Outros Gastos', 'expense', 'MoreHorizontal', '#94A3B8', false),
  ('Salário', 'income', 'Briefcase', '#10B981', false),
  ('Comissão', 'income', 'Percent', '#059669', false),
  ('Freelance', 'income', 'Laptop', '#0D9488', false),
  ('Vendas', 'income', 'Store', '#0284C7', false),
  ('Benefícios', 'income', 'Gift', '#4F46E5', false),
  ('Rendimentos', 'income', 'TrendingUp', '#16A34A', false),
  ('Outras Entradas', 'income', 'PlusCircle', '#84CC16', false)
ON CONFLICT DO NOTHING;
