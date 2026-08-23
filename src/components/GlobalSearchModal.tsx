import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  PiggyBank,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const {
    transactions,
    fixedBills,
    creditCards,
    goals,
    debts,
    setActiveTab,
    user,
  } = useFinance();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle search handled externally
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return { transactions: [], bills: [], cards: [], goals: [], debts: [] };
    const q = query.toLowerCase();

    return {
      transactions: transactions
        .filter(t => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
        .slice(0, 5),
      bills: fixedBills
        .filter(b => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q))
        .slice(0, 3),
      cards: creditCards
        .filter(c => c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q))
        .slice(0, 2),
      goals: goals
        .filter(g => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
        .slice(0, 3),
      debts: debts
        .filter(d => d.name.toLowerCase().includes(q) || d.creditor.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [query, transactions, fixedBills, creditCards, goals, debts]);

  if (!isOpen) return null;

  const hasAnyResults =
    filteredResults.transactions.length > 0 ||
    filteredResults.bills.length > 0 ||
    filteredResults.cards.length > 0 ||
    filteredResults.goals.length > 0 ||
    filteredResults.debts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161618] w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Pesquisar por transação, conta, meta, cartão ou dívida..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 bg-slate-100 dark:bg-[#202024] text-slate-400 rounded-lg border border-slate-200 dark:border-white/5"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Digite para buscar em todas as suas finanças...
            </div>
          ) : !hasAnyResults ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhum resultado encontrado para "{query}".
            </div>
          ) : (
            <>
              {/* Transactions */}
              {filteredResults.transactions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Movimentações
                  </p>
                  <div className="space-y-1">
                    {filteredResults.transactions.map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveTab('transactions');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#202024] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg ${
                              t.type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {t.description}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {t.category} • {formatDate(t.date)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            t.type === 'income' ? 'text-teal-400' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, user.hideValues)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bills */}
              {filteredResults.bills.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Contas Fixas
                  </p>
                  <div className="space-y-1">
                    {filteredResults.bills.map(b => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setActiveTab('bills');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#202024] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {b.name}
                            </p>
                            <p className="text-[11px] text-slate-400">Vencimento todo dia {b.dueDay}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(b.amount, user.hideValues)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {filteredResults.goals.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Metas
                  </p>
                  <div className="space-y-1">
                    {filteredResults.goals.map(g => (
                      <div
                        key={g.id}
                        onClick={() => {
                          setActiveTab('goals');
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#202024] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                            <PiggyBank className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {g.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {Math.round((g.currentAmount / g.targetAmount) * 100)}% concluído
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-teal-400">
                          {formatCurrency(g.targetAmount, user.hideValues)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
