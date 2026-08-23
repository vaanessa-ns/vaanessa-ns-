import React, { useState } from 'react';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  TrendingUp,
  Flame,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

export const BudgetsView: React.FC = () => {
  const {
    budgets,
    categorySpending,
    updateBudgetLimit,
    user,
    monthExpenses,
    monthIncomes,
  } = useFinance();

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newLimitValue, setNewLimitValue] = useState<string>('');

  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalBudgetSpent = budgets.reduce((sum, b) => sum + (categorySpending[b.category] || 0), 0);

  const startEdit = (id: string, currentLimit: number) => {
    setEditingCategoryId(id);
    setNewLimitValue(String(currentLimit));
  };

  const saveEdit = (category: string) => {
    const num = parseFloat(newLimitValue.replace(',', '.'));
    if (num && !isNaN(num)) {
      updateBudgetLimit(category, num);
    }
    setEditingCategoryId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Orçamentos & Tetos Mensais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Defina limites por categoria e receba alertas preventivos antes de estourar
          </p>
        </div>
      </div>

      {/* Global Budget Overview Banner */}
      <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Limite Orçamentário Global
            </span>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {formatCurrency(totalBudgetSpent, user.hideValues)} / {formatCurrency(totalBudgetLimit, user.hideValues)}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Restam {formatCurrency(Math.max(0, totalBudgetLimit - totalBudgetSpent), user.hideValues)} para gastar dentro dos limites estipulados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs text-slate-400">Comprometido</span>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalBudgetSpent > totalBudgetLimit
                ? 'bg-rose-500'
                : totalBudgetSpent / totalBudgetLimit > 0.85
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{
              width: `${Math.min(100, (totalBudgetSpent / (totalBudgetLimit || 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.map(b => {
          const spent = categorySpending[b.category] || 0;
          const percentage = Math.round((spent / b.monthlyLimit) * 100);
          const remaining = Math.max(0, b.monthlyLimit - spent);
          const isOverLimit = spent > b.monthlyLimit;
          const isNearLimit = !isOverLimit && percentage >= b.alertThreshold;

          return (
            <div
              key={b.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isOverLimit
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 shadow-sm'
                  : isNearLimit
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30 shadow-sm'
                  : 'bg-white dark:bg-[#161618] border-slate-200/80 dark:border-white/5 shadow-xs hover:border-white/10'
              }`}
            >
              <div>
                {/* Category & Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {b.category}
                  </span>

                  {isOverLimit ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      Estourado (+{formatCurrency(spent - b.monthlyLimit, user.hideValues)})
                    </span>
                  ) : isNearLimit ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Atenção ({percentage}%)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      No Limite
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mt-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] text-slate-400">Gasto Atual</span>
                      <p
                        className={`text-xl font-bold ${
                          isOverLimit ? 'text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {formatCurrency(spent, user.hideValues)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Teto Definido</span>
                      {editingCategoryId === b.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newLimitValue}
                            onChange={e => setNewLimitValue(e.target.value)}
                            className="w-20 px-2 py-0.5 text-xs bg-white dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded font-bold text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => saveEdit(b.category)}
                            className="p-1 bg-emerald-500 text-slate-950 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => startEdit(b.id, b.monthlyLimit)}>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {formatCurrency(b.monthlyLimit, user.hideValues)}
                          </p>
                          <Edit2 className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverLimit
                          ? 'bg-rose-500'
                          : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                    <span>{percentage}% utilizado</span>
                    <span>
                      {isOverLimit
                        ? `Excedido em ${formatCurrency(spent - b.monthlyLimit, user.hideValues)}`
                        : `Disponível: ${formatCurrency(remaining, user.hideValues)}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center text-[11px] text-slate-400">
                <span>Alerta configurado para {b.alertThreshold}%</span>
                <button
                  onClick={() => startEdit(b.id, b.monthlyLimit)}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Ajustar Teto
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
