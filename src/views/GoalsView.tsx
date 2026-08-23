import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  Target,
  Calendar,
  Sparkles,
  TrendingUp,
  Trash2,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export const GoalsView: React.FC = () => {
  const {
    goals,
    contributeToGoal,
    deleteGoal,
    accounts,
    user,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
  } = useFinance();

  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('200');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Totals
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleDeposit = (goalId: string) => {
    const amount = parseFloat(depositAmount.replace(',', '.'));
    if (!amount || isNaN(amount)) return;

    contributeToGoal(goalId, amount, selectedAccountId);
    setDepositGoalId(null);
    setSuccessToast(`Aporte de ${formatCurrency(amount)} adicionado com sucesso! 🎉`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-bold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white text-xs">
            Fechar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Metas & Objetivos Financeiros
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Defina sonhos concretos, acompanhe o progresso e saiba exatamente quanto poupar
          </p>
        </div>

        <button
          onClick={() => {
            setQuickAddDefaultType('goal');
            setIsQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Meta</span>
        </button>
      </div>

      {/* Overall Progress Banner */}
      <div className="bg-[#161618] border border-white/5 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Progresso Geral das Suas Conquistas
            </span>
            <h2 className="text-2xl font-bold">
              {formatCurrency(totalSaved, user.hideValues)} / {formatCurrency(totalTarget, user.hideValues)}
            </h2>
            <p className="text-xs text-slate-300">
              Você já alcançou {overallProgress}% de todo o valor estipulado para suas metas ativas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-[#202024] border border-white/10 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-black text-emerald-400">{overallProgress}%</span>
              <span className="text-[10px] text-slate-300 font-semibold">Concluído</span>
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-[#202024] rounded-full overflow-hidden mt-6">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map(goal => {
          const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          // Calculate estimated months left (assuming deadline)
          const deadlineDate = new Date(goal.deadline);
          const now = new Date();
          const monthsLeft = Math.max(
            1,
            (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth())
          );
          const monthlyRecommended = remaining / monthsLeft;

          return (
            <div
              key={goal.id}
              className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:border-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header of Goal Card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-xs bg-emerald-500"
                    >
                      <PiggyBank className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {goal.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{goal.category}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    title="Excluir meta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar & Values */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold">Valor Acumulado</span>
                      <p className="text-xl font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(goal.currentAmount, user.hideValues)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-semibold">Objetivo</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(goal.targetAmount, user.hideValues)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>{progress}% alcançado</span>
                    <span>Faltam {formatCurrency(remaining, user.hideValues)}</span>
                  </div>
                </div>

                {/* Estimation Insights */}
                <div className="mt-4 p-3 bg-slate-50 dark:bg-[#202024] rounded-2xl border border-slate-100 dark:border-white/5 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Prazo:
                    </span>
                    <span className="font-semibold">{formatDate(goal.deadline)} ({monthsLeft} meses)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Aporte sugerido:
                    </span>
                    <strong className="text-emerald-400">
                      {formatCurrency(monthlyRecommended, user.hideValues)} /mês
                    </strong>
                  </div>
                </div>
              </div>

              {/* Deposit Quick Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
                {depositGoalId === goal.id ? (
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 dark:text-white">
                        Valor do Aporte (R$)
                      </label>
                      <input
                        type="text"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="w-28 px-2 py-1 text-xs bg-white dark:bg-[#161618] border border-slate-200 dark:border-white/10 rounded-lg text-right font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setDepositGoalId(null)}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-[#28282C] text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDeposit(goal.id)}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs"
                      >
                        Confirmar Aporte
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setDepositGoalId(goal.id)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Fazer Aporte Rápido</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
