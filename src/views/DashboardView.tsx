import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt,
  CreditCard,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, getDaysUntil } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const {
    user,
    availableBalance,
    monthIncomes,
    monthExpenses,
    monthRemaining,
    monthSavingsRate,
    totalNetWorth,
    categorySpending,
    transactions,
    fixedBills,
    creditCards,
    goals,
    insights,
    selectedMonth,
    setActiveTab,
    setIsQuickAddOpen,
    setIsConnectBankOpen,
    payFixedBill,
  } = useFinance();

  // Recent 5 transactions for selected month
  const recentTransactions = transactions
    .filter(t => t.date.startsWith(selectedMonth))
    .slice(0, 5);

  // Upcoming bills due in the current month
  const upcomingBills = fixedBills
    .filter(b => b.status === 'pending')
    .slice(0, 3);

  // Sort categories by highest spending
  const sortedCategories = (Object.entries(categorySpending) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalExpenseForDonut = monthExpenses || 1;

  // Colors for donut chart
  const categoryColors = [
    '#F97316', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#EAB308', '#06B6D4'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome / Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-[#161618] dark:via-[#1C1C1F] dark:to-[#161618] p-6 sm:p-7 rounded-3xl text-white shadow-xl dark:shadow-2xl border border-transparent dark:border-white/5 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Painel Financeiro
            </span>
            <span className="text-xs text-slate-400">
              Atualizado em tempo real
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Olá, {user.name ? user.name.split(' ')[0] : 'Usuário'}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {monthSavingsRate >= 20
              ? `Você está economizando ${monthSavingsRate}% das suas receitas este mês. Excelente disciplina!`
              : monthRemaining >= 0
              ? `Você possui saldo positivo de ${formatCurrency(monthRemaining, user.hideValues)} neste mês.`
              : `Atenção: seus gastos superaram as receitas deste mês em ${formatCurrency(Math.abs(monthRemaining), user.hideValues)}.`}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsConnectBankOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 rounded-2xl text-xs sm:text-sm font-bold backdrop-blur-md transition-all active:scale-95 text-emerald-400 cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Conectar Banco</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-advisor')}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl text-xs sm:text-sm font-semibold backdrop-blur-md transition-all active:scale-95 text-white"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Consultar IA</span>
          </button>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Registrar</span>
          </button>
        </div>
      </div>

      {/* 4 Core Metric Cards (Section 4 of prompt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Disponível */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:shadow-xl dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Saldo Disponível
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatCurrency(availableBalance, user.hideValues)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Patrimônio Líquido:</span>
              <strong className="text-slate-600 dark:text-slate-300 font-semibold">
                {formatCurrency(totalNetWorth, user.hideValues)}
              </strong>
            </p>
          </div>
        </div>

        {/* Card 2: Receitas do Mês */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:shadow-xl dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Receitas do Mês
            </span>
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 tracking-tight">
              +{formatCurrency(monthIncomes, user.hideValues)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Entradas registradas no período
            </p>
          </div>
        </div>

        {/* Card 3: Despesas do Mês */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:shadow-xl dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Despesas do Mês
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              -{formatCurrency(monthExpenses, user.hideValues)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Gastos & faturas computadas
            </p>
          </div>
        </div>

        {/* Card 4: Valor Restante / Disponível */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:shadow-xl dark:hover:border-white/10 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Valor Restante (Disponível)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-bold tracking-tight ${
                monthRemaining >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(monthRemaining, user.hideValues)}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-full bg-slate-100 dark:bg-[#202024] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    monthSavingsRate >= 20 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, monthSavingsRate)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 shrink-0">
                {monthSavingsRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Financial Insights Banner (Section 14 & 21) */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.slice(0, 3).map(ins => (
            <div
              key={ins.id}
              onClick={() => ins.actionTab && setActiveTab(ins.actionTab)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start gap-3 group ${
                ins.type === 'alert'
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400'
                  : ins.type === 'success'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400'
                  : 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400'
              }`}
            >
              <div
                className={`p-2 rounded-2xl shrink-0 ${
                  ins.type === 'alert'
                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'
                    : ins.type === 'success'
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                    : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'
                }`}
              >
                {ins.type === 'alert' ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {ins.title}
                  </p>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                  {ins.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Charts & Category Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparison Bar Chart (Receitas x Despesas x Saldo) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fluxo & Comparativo Mensal
              </h2>
              <p className="text-xs text-slate-400">
                Entradas vs. Saídas vs. Saldo Acumulado
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Despesas
              </span>
            </div>
          </div>

          {/* Simple Clean Bar Graph Representation */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-teal-600 dark:text-teal-400">Receitas Totais</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {formatCurrency(monthIncomes, user.hideValues)}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-600 dark:text-rose-400">Despesas Totais</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {formatCurrency(monthExpenses, user.hideValues)}
                </span>
              </div>
              <div className="w-full h-4 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      monthIncomes > 0 ? (monthExpenses / monthIncomes) * 100 : 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#1C1C1F] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                  %
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Comprometimento da Renda
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {monthIncomes > 0
                      ? `${Math.round((monthExpenses / monthIncomes) * 100)}% da sua renda foi utilizada`
                      : 'Nenhuma receita registrada'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('budgets')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Orçamentos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Expenses Breakdown Donut / Ranking */}
        <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Maiores Gastos
              </h2>
              <button
                onClick={() => setActiveTab('transactions')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Ver tudo
              </button>
            </div>

            <div className="space-y-3">
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhum gasto registrado neste mês.
                </p>
              ) : (
                sortedCategories.map(([catName, spent], idx) => {
                  const percentage = Math.round((spent / totalExpenseForDonut) * 100);
                  const color = categoryColors[idx % categoryColors.length];
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {catName}
                        </span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(spent, user.hideValues)}
                          </span>
                          <span className="text-slate-400 ml-1.5 text-[11px]">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-4">
            <button
              onClick={() => setActiveTab('budgets')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#202024] dark:hover:bg-[#28282C] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Gerenciar Tetos de Gastos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Bills & Goals & Credit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Section: Próximas Contas a Vencer */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Contas a Vencer
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('bills')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-3">
            {upcomingBills.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Todas as contas fixas do mês estão pagas!</span>
              </div>
            ) : (
              upcomingBills.map(bill => {
                const daysInfo = getDaysUntil(bill.dueDay);
                return (
                  <div
                    key={bill.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {bill.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className={daysInfo.isOverdue ? 'text-rose-500 font-semibold' : ''}>
                          {daysInfo.text} (Dia {bill.dueDay})
                        </span>
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount, user.hideValues)}
                      </span>
                      <button
                        onClick={() => payFixedBill(bill.id)}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold rounded-xl shadow-xs transition-colors"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Metas Financeiras (Progresso) */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <PiggyBank className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Metas em Andamento
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('goals')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-3">
            {goals.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhuma meta cadastrada ainda.
              </div>
            ) : (
              goals.slice(0, 2).map(g => {
                const progress = Math.min(
                  100,
                  Math.round((g.currentAmount / g.targetAmount) * 100)
                );
                return (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {g.name}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-[#161618] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Guardado: {formatCurrency(g.currentAmount, user.hideValues)}</span>
                      <span>Meta: {formatCurrency(g.targetAmount, user.hideValues)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section: Cartões de Crédito */}
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cartões de Crédito
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('cards')}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              Faturas
            </button>
          </div>

          <div className="space-y-3">
            {creditCards.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Nenhum cartão cadastrado ainda.
              </div>
            ) : (
              creditCards.slice(0, 2).map(card => {
                // Calculate usage for this card
                const cardSpent = transactions
                  .filter(t => t.cardId === card.id && t.date.startsWith(selectedMonth))
                  .reduce((sum, t) => sum + t.amount, 0);

                const available = Math.max(0, card.totalLimit - cardSpent);
                const usagePct = Math.round((cardSpent / card.totalLimit) * 100);

                return (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-white/5 text-white shadow-sm space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{card.name}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        Vence dia {card.dueDay}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-400">Fatura Atual</p>
                        <p className="text-sm font-bold text-emerald-400">
                          {formatCurrency(cardSpent, user.hideValues)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Limite Disp.</p>
                        <p className="text-xs font-semibold text-slate-300">
                          {formatCurrency(available, user.hideValues)}
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          usagePct > 70 ? 'bg-rose-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.min(100, usagePct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Últimas Movimentações
            </h2>
            <p className="text-xs text-slate-400">
              Registros recentes do mês selecionado
            </p>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <span>Ver Extrato Completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma movimentação cadastrada neste mês.
            </div>
          ) : (
            recentTransactions.map(tx => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#202024] px-3 rounded-2xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : tx.type === 'expense'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    }`}
                  >
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : tx.type === 'expense' ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {tx.description}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {tx.category} • {formatDate(tx.date)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-xs font-bold ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, user.hideValues)}
                  </p>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {tx.paymentMethod === 'credit' ? 'Cartão' : tx.paymentMethod}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
