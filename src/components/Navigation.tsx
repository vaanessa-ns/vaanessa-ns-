import React from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsQuickAddOpen,
    fixedBills,
    budgets,
    categorySpending
  } = useFinance();

  const pendingBillsCount = fixedBills.filter(b => b.status === 'pending' || b.status === 'overdue').length;

  const budgetWarningsCount = budgets.filter(b => {
    const spent = categorySpending[b.category] || 0;
    return (spent / b.monthlyLimit) >= (b.alertThreshold / 100);
  }).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'transactions', label: 'Movimentações', icon: ArrowLeftRight },
    {
      id: 'bills',
      label: 'Contas Fixas',
      icon: Receipt,
      badge: pendingBillsCount > 0 ? pendingBillsCount : undefined,
      badgeColor: 'bg-amber-500 text-white'
    },
    { id: 'cards', label: 'Cartões & Parcelas', icon: CreditCard },
    { id: 'goals', label: 'Metas', icon: PiggyBank },
    {
      id: 'budgets',
      label: 'Orçamentos',
      icon: PieChart,
      badge: budgetWarningsCount > 0 ? '!' : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { id: 'accounts', label: 'Contas & Bancos', icon: Landmark },
    { id: 'calendar', label: 'Calendário', icon: CalendarDays },
    { id: 'debts', label: 'Dívidas', icon: ShieldAlert },
    { id: 'ai-advisor', label: 'IA Vfinance', icon: Bot },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation Tabs */}
      <nav className="bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all active:scale-[0.98] shrink-0 ml-3"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Movimentação</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Dock with Central Prominent "+" button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 md:hidden px-3 py-2 shadow-2xl">
        <div className="flex items-center justify-around relative">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
              activeTab === 'dashboard'
                ? 'text-emerald-500 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Início</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
              activeTab === 'transactions'
                ? 'text-emerald-500 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            <span className="text-[10px] mt-1">Extrato</span>
          </button>

          {/* Central Floating Action Button */}
          <div className="-mt-7">
            <button
              onClick={() => setIsQuickAddOpen(true)}
              aria-label="Adicionar movimentação"
              className="w-13 h-13 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 border-4 border-slate-50 dark:border-[#0A0A0B] active:scale-95 transition-transform"
            >
              <Plus className="w-7 h-7 stroke-[3]" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
              activeTab === 'cards'
                ? 'text-emerald-500 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Cartões</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
              activeTab === 'goals'
                ? 'text-emerald-500 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <PiggyBank className="w-5 h-5" />
            <span className="text-[10px] mt-1">Metas</span>
          </button>
        </div>
      </div>
    </>
  );
};
