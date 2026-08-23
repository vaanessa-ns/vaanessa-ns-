import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  Sparkles,
  CheckCheck,
  TrendingUp,
  CreditCard,
  Receipt,
  PiggyBank,
  Cloud,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatMonthYear, formatCurrency } from '../utils/formatters';

interface HeaderProps {
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const {
    user,
    selectedMonth,
    setSelectedMonth,
    toggleHideValues,
    toggleTheme,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    setActiveTab,
    lockApp,
    availableBalance,
    setIsAuthModalOpen,
    isSyncing,
    refreshData,
    setIsConnectBankOpen,
  } = useFinance();

  const { user: authUser, isConfigured } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bill':
        return <Receipt className="w-4 h-4 text-amber-500" />;
      case 'card':
        return <CreditCard className="w-4 h-4 text-purple-500" />;
      case 'goal':
        return <PiggyBank className="w-4 h-4 text-emerald-500" />;
      case 'budget':
        return <TrendingUp className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0A0A0B]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform font-black">
                <span className="font-extrabold text-xl tracking-tight">V</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  V<span className="text-emerald-500">finance</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Pro
                  </span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                  Controle & Gestão Pessoal
                </p>
              </div>
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-[#161618] rounded-2xl p-1 border border-slate-200/80 dark:border-white/5">
            <button
              onClick={() => navigateMonth('prev')}
              aria-label="Mês anterior"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#202024] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2.5 sm:px-3 text-center min-w-[120px] sm:min-w-[140px]">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {formatMonthYear(selectedMonth)}
              </span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              aria-label="Próximo mês"
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#202024] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Actions & Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label="Buscar"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161618] rounded-2xl transition-colors flex items-center gap-1.5"
              title="Buscar transações, contas ou categorias (Ctrl+K)"
            >
              <Search className="w-5 h-5" />
              <span className="hidden md:inline text-xs text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded-lg bg-slate-50 dark:bg-[#161618]">
                ⌘K
              </span>
            </button>

            {/* Hide/Show Balances Toggle */}
            <button
              onClick={toggleHideValues}
              aria-label={user.hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161618] rounded-2xl transition-colors"
              title={user.hideValues ? 'Mostrar valores' : 'Ocultar valores'}
            >
              {user.hideValues ? (
                <EyeOff className="w-5 h-5 text-slate-400" />
              ) : (
                <Eye className="w-5 h-5 text-emerald-500" />
              )}
            </button>

            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notificações"
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161618] rounded-2xl transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0A0A0B]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#161618] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        Notificações
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                          {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationAsRead(n.id);
                            if (n.linkTab) setActiveTab(n.linkTab);
                            setShowNotifications(false);
                          }}
                          className={`p-3 hover:bg-slate-50 dark:hover:bg-[#202024] cursor-pointer transition-colors flex gap-3 items-start ${
                            !n.isRead ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''
                          }`}
                        >
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#202024] border border-transparent dark:border-white/5 shrink-0">
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1 shadow-xs shadow-emerald-500" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode */}
            <button
              onClick={toggleTheme}
              aria-label="Alternar tema"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161618] rounded-2xl transition-colors"
              title="Alternar modo claro / escuro"
            >
              {user.themeMode === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {/* PIN Lock button if enabled */}
            {user.isPinEnabled && (
              <button
                onClick={lockApp}
                aria-label="Bloquear aplicativo com PIN"
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161618] rounded-2xl transition-colors"
                title="Bloquear aplicativo"
              >
                <Lock className="w-5 h-5 text-slate-500" />
              </button>
            )}

            {/* Open Finance Conectar Banco Button */}
            <button
              onClick={() => setIsConnectBankOpen(true)}
              aria-label="Conectar Banco Pluggy Open Finance"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow-xs"
              title="Conectar Banco via Open Finance / Pluggy Sandbox"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Conectar Banco</span>
            </button>

            {/* Supabase Cloud Sync / Auth Button */}
            <button
              onClick={() => {
                if (authUser) {
                  refreshData();
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              aria-label={authUser ? "Sincronizado com Supabase" : "Conectar ao Supabase"}
              className={`p-2 rounded-2xl transition-colors flex items-center gap-1.5 ${
                authUser
                  ? 'text-emerald-500 hover:bg-emerald-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#161618]'
              }`}
              title={
                authUser
                  ? `Conectado como ${authUser.email} (Clique para sincronizar)`
                  : 'Entrar ou criar conta no Supabase'
              }
            >
              {isSyncing ? (
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              ) : authUser ? (
                <Cloud className="w-5 h-5 text-emerald-400" />
              ) : (
                <LogIn className="w-5 h-5 text-slate-400 hover:text-emerald-400" />
              )}
            </button>

            {/* User Avatar & Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-white/5 text-left group"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#161618] border border-white/10 text-white font-bold text-xs flex items-center justify-center shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-400 transition-colors truncate max-w-[110px]">
                  {user.name || 'Minha Conta'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatCurrency(availableBalance, user.hideValues)}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
