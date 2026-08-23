import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  X,
  Plus
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatMonthYear, formatDate } from '../utils/formatters';

export const CalendarView: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    transactions,
    fixedBills,
    creditCards,
    user,
    setIsQuickAddOpen,
  } = useFinance();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Month navigation
  const [year, month] = selectedMonth.split('-').map(Number);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
    setSelectedDay(null);
  };

  // Pre-calculate daily events
  const dailyData = useMemo(() => {
    const map: Record<
      number,
      {
        incomes: number;
        expenses: number;
        bills: typeof fixedBills;
        txs: typeof transactions;
      }
    > = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;

      const dayTxs = transactions.filter(t => t.date === dateKey);
      const dayIncomes = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const dayExpenses = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const dayBills = fixedBills.filter(b => b.dueDay === d);

      map[d] = {
        incomes: dayIncomes,
        expenses: dayExpenses,
        bills: dayBills,
        txs: dayTxs,
      };
    }
    return map;
  }, [selectedMonth, daysInMonth, transactions, fixedBills]);

  const selectedDayInfo = selectedDay ? dailyData[selectedDay] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Calendário Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Visualize entradas, saídas e vencimentos dia a dia no calendário
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-[#161618] p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-xs sm:text-sm px-3 capitalize text-slate-800 dark:text-slate-200">
            {formatMonthYear(selectedMonth)}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#202024] text-slate-600 dark:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white dark:bg-[#161618] rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden p-4 sm:p-6">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 pb-3 border-b border-slate-100 dark:border-white/5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5 pt-3">
          {/* Empty offset padding for first week */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-2xl bg-slate-50/50 dark:bg-[#0A0A0B]/40" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const data = dailyData[dayNum];
            const isSelected = selectedDay === dayNum;
            const hasActivity = data.incomes > 0 || data.expenses > 0 || data.bills.length > 0;

            return (
              <div
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10 shadow-sm ring-2 ring-emerald-500/20'
                    : hasActivity
                    ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#202024] hover:border-slate-300 dark:hover:border-white/20'
                    : 'border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-[#0A0A0B]/30 hover:bg-white dark:hover:bg-[#202024]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {data.bills.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Contas a vencer" />
                  )}
                </div>

                {/* Badges / Values */}
                <div className="space-y-0.5 overflow-hidden">
                  {data.incomes > 0 && (
                    <p className="text-[9px] sm:text-[10px] font-bold text-teal-400 truncate">
                      +{formatCurrency(data.incomes, user.hideValues)}
                    </p>
                  )}
                  {data.expenses > 0 && (
                    <p className="text-[9px] sm:text-[10px] font-bold text-rose-400 truncate">
                      -{formatCurrency(data.expenses, user.hideValues)}
                    </p>
                  )}
                  {data.bills.length > 0 && data.expenses === 0 && (
                    <p className="text-[9px] font-semibold text-amber-400 truncate">
                      {data.bills.length} conta{data.bills.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDay && selectedDayInfo && (
        <div className="bg-white dark:bg-[#161618] rounded-3xl border border-slate-200/80 dark:border-white/5 p-6 shadow-xs animate-in slide-in-from-bottom-2 duration-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Detalhes do Dia {selectedDay} de {formatMonthYear(selectedMonth)}
              </h3>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Movimentações do dia */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Movimentações Realizadas
              </h4>
              {selectedDayInfo.txs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Nenhum gasto ou receita registrado neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayInfo.txs.map(tx => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {tx.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-400" />
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</span>
                      </div>
                      <span className={`font-bold ${tx.type === 'income' ? 'text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, user.hideValues)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contas que vencem no dia */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Contas Fixas com Vencimento Hoje
              </h4>
              {selectedDayInfo.bills.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Nenhuma conta fixa vence neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayInfo.bills.map(bill => (
                    <div
                      key={bill.id}
                      className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{bill.name}</p>
                          <p className="text-[10px] text-slate-400">{bill.category}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(bill.amount, user.hideValues)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
