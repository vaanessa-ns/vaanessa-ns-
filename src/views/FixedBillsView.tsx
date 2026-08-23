import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Wallet,
  Trash2,
  Check,
  RotateCcw
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getDaysUntil, getPaymentMethodLabel } from '../utils/formatters';
import { FixedBill } from '../types';

export const FixedBillsView: React.FC = () => {
  const {
    fixedBills,
    payFixedBill,
    deleteFixedBill,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
    user,
    accounts,
  } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [payingBillId, setPayingBillId] = useState<string | null>(null);

  // Totals
  const totalBillsAmount = fixedBills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaidAmount = fixedBills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);
  const totalPendingAmount = fixedBills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const handleConfirmPay = (billId: string) => {
    payFixedBill(billId, selectedAccountId);
    setPayingBillId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Contas Fixas & Recorrentes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Controle seus vencimentos mensais essenciais e nunca mais pague juros por atraso
          </p>
        </div>

        <button
          onClick={() => {
            setQuickAddDefaultType('bill');
            setIsQuickAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Conta Fixa</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total de Contas Fixas</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalBillsAmount, user.hideValues)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {fixedBills.length} despesas recorrentes cadastradas
          </p>
        </div>

        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Total Já Pago</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidAmount, user.hideValues)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {fixedBills.filter(b => b.status === 'paid').length} contas quitadas este mês
          </p>
        </div>

        <div className="bg-white dark:bg-[#161618] p-5 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs">
          <span className="text-xs font-semibold text-slate-400">Pendente de Pagamento</span>
          <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">
            {formatCurrency(totalPendingAmount, user.hideValues)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {fixedBills.filter(b => b.status !== 'paid').length} contas a vencer
          </p>
        </div>
      </div>

      {/* Bills Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fixedBills.map(bill => {
          const daysInfo = getDaysUntil(bill.dueDay);
          const isPaid = bill.status === 'paid';
          const isOverdue = !isPaid && daysInfo.isOverdue;

          return (
            <div
              key={bill.id}
              className={`p-5 rounded-3xl border transition-all relative flex flex-col justify-between ${
                isPaid
                  ? 'bg-white/80 dark:bg-[#161618]/60 border-slate-200 dark:border-white/5 opacity-80'
                  : isOverdue
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 shadow-sm'
                  : 'bg-white dark:bg-[#161618] border-slate-200/80 dark:border-white/5 shadow-xs hover:border-white/10'
              }`}
            >
              <div>
                {/* Status Badge & Actions */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isOverdue
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Pago
                      </>
                    ) : isOverdue ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Atrasada
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        Pendente
                      </>
                    )}
                  </span>

                  <button
                    onClick={() => deleteFixedBill(bill.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                    title="Excluir conta fixa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Name & Due Day */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {bill.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vence todo dia <strong className="text-slate-700 dark:text-slate-200">{bill.dueDay}</strong> • {daysInfo.text}
                </p>

                {/* Amount */}
                <div className="mt-4">
                  <span className="text-xs text-slate-400">Valor mensal:</span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(bill.amount, user.hideValues)}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Categoria: <strong className="text-slate-600 dark:text-slate-300 font-medium">{bill.category}</strong></span>
                  <span className="capitalize">{getPaymentMethodLabel(bill.paymentMethod)}</span>
                </div>
              </div>

              {/* Pay Action button or modal trigger */}
              <div className="mt-4 pt-2">
                {payingBillId === bill.id ? (
                  <div className="space-y-2 p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Debitar de qual conta?
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-[#161618] border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} (R$ {acc.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setPayingBillId(null)}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-[#28282C] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleConfirmPay(bill.id)}
                        className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : isPaid ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-default"
                  >
                    <Check className="w-4 h-4" />
                    <span>Conta Paga este Mês</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setPayingBillId(bill.id)}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar Pagamento (1 Clique)</span>
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
