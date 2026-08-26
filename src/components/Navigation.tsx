import React, { useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Receipt,
  PiggyBank,
  PieChart,
  CalendarDays,
  Bot,
  Plus,
  Landmark,
  ShieldAlert,
  Menu,
  X,
  User,
  ShieldCheck,
  Lock,
  ChevronRight,
  Cloud
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  description?: string;
}

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsQuickAddOpen,
    fixedBills,
    budgets,
    categorySpending,
    user,
    availableBalance,
    setIsConnectBankOpen,
    setIsAuthModalOpen,
  } = useFinance();

  const { user: authUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pendingBillsCount = fixedBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;

  const budgetWarningsCount = budgets.filter(b => {
    const spent = categorySpending[b.category] || 0;
    return (spent / b.monthlyLimit) >= (b.alertThreshold / 100);
  }).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, description: 'Visão geral & resumo financeiro' },
    { id: 'transactions', label: 'Movimentações', icon: ArrowLeftRight, description: 'Extrato, receitas, despesas & PIX' },
    {
      id: 'bills',
      label: 'Contas Fixas',
      icon: Receipt,
      badge: pendingBillsCount > 0 ? pendingBillsCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
      description: 'Boletos, assinaturas & vencimentos'
    },
    { id: 'cards', label: 'Cartões & Parcelas', icon: CreditCard, description: 'Faturas, limites & compras parceladas' },
    { id: 'goals', label: 'Metas', icon: PiggyBank, description: 'Sonhos, reservas & objetivos' },
    {
      id: 'budgets',
      label: 'Orçamentos',
      icon: PieChart,
      badge: budgetWarningsCount > 0 ? '!' : undefined,
      badgeColor: 'bg-rose-500 text-white',
      description: 'Tetos mensais por categoria'
    },
    { id: 'accounts', label: 'Contas & Bancos', icon: Landmark, description: 'Saldos bancários & transferências' },
    { id: 'calendar', label: 'Calendário', icon: CalendarDays, description: 'Fluxo dia a dia & vencimentos' },
    { id: 'debts', label: 'Dívidas', icon: ShieldAlert, description: 'Quitação inteligente & método avalanche' },
    { id: 'ai-advisor', label: 'IA Vfinance', icon: Bot, description: 'Consultor financeiro inteligente' },
    { id: 'profile', label: 'Perfil & Ajustes', icon: User, description: 'Segurança, PIN & backups' },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop & Tablet Top Navigation Tabs */}
      <nav className="bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {navItems.filter(item => item.id !== 'profile').map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#161618] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Floating Button on Header for desktop */}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] shrink-0 ml-3 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Movimentação</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Dock (Fluid, Zero Overflow) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 md:hidden px-2 py-2 shadow-2xl safe-area-pb">
        <div className="grid grid-cols-5 items-center relative max-w-md mx-auto">
          {/* 1. Início */}
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-500 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium truncate">Início</span>
          </button>

          {/* 2. Extrato */}
          <button
            onClick={() => handleSelectTab('transactions')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'transactions'
                ? 'text-emerald-500 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium truncate">Extrato</span>
          </button>

          {/* 3. Central FAB (+) */}
          <div className="flex justify-center -mt-6">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              aria-label="Adicionar movimentação"
              className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 border-4 border-slate-50 dark:border-[#0A0A0B] active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* 4. Cartões */}
          <button
            onClick={() => handleSelectTab('cards')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
              activeTab === 'cards'
                ? 'text-emerald-500 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium truncate">Cartões</span>
          </button>

          {/* 5. Menu / Mais */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer ${
              isMobileMenuOpen || !['dashboard', 'transactions', 'cards'].includes(activeTab)
                ? 'text-emerald-500 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {(pendingBillsCount > 0 || budgetWarningsCount > 0) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#161618]" />
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium truncate">Mais</span>
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Drawer / Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xs sm:max-w-sm h-full bg-white dark:bg-[#161618] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
                  V
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vfinance Menu
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Navegação completa
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202024] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Profile Summary Banner */}
            <div className="p-4 bg-slate-50 dark:bg-[#1A1A1D] border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Saldo Disponível</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  authUser ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {authUser ? 'Supabase Sincronizado' : 'Convidado'}
                </span>
              </div>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(availableBalance, user.hideValues)}
              </p>
            </div>

            {/* Navigation Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-100 dark:bg-[#202024] text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold ${isActive ? 'text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            {item.label}
                          </p>
                          {item.badge && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-3 border-t border-slate-100 dark:border-white/5 space-y-2 bg-slate-50/50 dark:bg-[#121214]">
              {/* Conectar Banco */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsConnectBankOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Conectar Banco (Pluggy)</span>
              </button>

              {/* Supabase login or profile */}
              {!authUser && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Entrar com Supabase</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
