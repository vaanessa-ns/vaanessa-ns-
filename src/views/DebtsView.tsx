import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Flame,
  TrendingDown,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Trash2,
  DollarSign
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export const DebtsView: React.FC = () => {
  const {
    debts,
    payDebtInstallment,
    deleteDebt,
    user,
    accounts,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
  } = useFinance();

  const [amortizeDebtId, setAmortizeDebtId] = useState<string | null>(null);
  const [amortizeAmount, setAmortizeAmount] = useState<string>('300');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  const totalDebts = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalRemaining = totalDebts - totalPaid;
  const overallPaidPct = totalDebts > 0 ? Math.round((totalPaid / totalDebts) * 100) : 0;

  const handleAmortize = (debtId: string) => {
    const amt = parseFloat(amortizeAmount.replace(',', '.'));
    if (!amt || isNaN(amt)) return;

    payDebtInstallment(debtId, amt, selectedAccountId);
    setAmortizeDebtId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Controle & Quitação de Dívidas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Elimine juros, priorize credores e alcance a liberdade financeira
          </p>
        </div>

        <button
          onClick={() => {
            setQuickAddDefaultType('debt');
            setIsQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Dívida</span>
        </button>
      </div>

      {/* Debt Summary Banner */}
      <div className="bg-[#161618] border border-white/5 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Saldo Devedor Consolidado
            </span>
            <h2 className="text-3xl font-black mt-1">
              {formatCurrency(totalRemaining, user.hideValues)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Você já quitou {formatCurrency(totalPaid, user.hideValues)} ({overallPaidPct}%) do total de {formatCurrency(totalDebts, user.hideValues)}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-[#202024] border border-white/10 text-center">
              <span className="text-2xl font-black text-emerald-400">{overallPaidPct}%</span>
              <p className="text-[10px] text-slate-400 font-semibold">Amortizado</p>
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-[#202024] rounded-full overflow-hidden mt-6">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${overallPaidPct}%` }}
          />
        </div>
      </div>

      {/* Smart Repayment Strategy Advice Box */}
      <div className="bg-[#161618] p-4 rounded-3xl border border-white/5 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Estratégia Recomendada Vfinance: Método Avalanche de Juros
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Concentre qualquer renda extra ou sobra financeira na dívida com <strong className="text-slate-200">maior taxa de juros ao mês</strong> (Prioridade Alta) enquanto mantém as parcelas mínimas das demais em dia. Isso economiza centenas de reais em juros compostos.
          </p>
        </div>
      </div>

      {/* Debts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {debts.map(debt => {
          const remaining = Math.max(0, debt.totalAmount - debt.paidAmount);
          const progress = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));

          return (
            <div
              key={debt.id}
              className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:border-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      debt.priority === 'high'
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                        : debt.priority === 'medium'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-slate-500/10 border border-slate-500/20 text-slate-400'
                    }`}
                  >
                    Prioridade {debt.priority === 'high' ? 'Alta (Juros Altos)' : debt.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>

                  <button
                    onClick={() => deleteDebt(debt.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {debt.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Credor: <strong className="text-slate-700 dark:text-slate-300">{debt.creditor}</strong> • {debt.interestRate}% juros/mês
                </p>

                {/* Values & Progress */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] text-slate-400">Saldo Restante</span>
                      <p className="text-xl font-bold text-rose-400">
                        {formatCurrency(remaining, user.hideValues)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Total Original</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(debt.totalAmount, user.hideValues)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-[#202024] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>{progress}% quitado ({formatCurrency(debt.paidAmount, user.hideValues)})</span>
                    <span>Vencimento: {formatDate(debt.dueDate)}</span>
                  </div>
                </div>
              </div>

              {/* Amortize Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
                {amortizeDebtId === debt.id ? (
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Valor a Amortizar:
                      </label>
                      <input
                        type="text"
                        value={amortizeAmount}
                        onChange={e => setAmortizeAmount(e.target.value)}
                        className="w-24 px-2 py-1 text-xs bg-white dark:bg-[#161618] border border-slate-200 dark:border-white/10 rounded font-bold text-right text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setAmortizeDebtId(null)}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-[#28282C] text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAmortize(debt.id)}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs"
                      >
                        Confirmar Pagamento
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAmortizeDebtId(debt.id)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Registrar Amortização / Parcela</span>
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
