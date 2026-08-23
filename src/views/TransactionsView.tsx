import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Wallet,
  Tag,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate, exportToCSV, getPaymentMethodLabel } from '../utils/formatters';
import { Transaction, TransactionType } from '../types';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    categories,
    accounts,
    user,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
    selectedMonth,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // all, income, expense, transfer
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, paid, pending

  // Filtered transactions for selected month
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Month match
      if (!t.date.startsWith(selectedMonth)) return false;

      // Search match
      if (
        searchQuery &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Category filter
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;

      // Account filter
      if (filterAccount !== 'all' && t.accountId !== filterAccount && t.toAccountId !== filterAccount) {
        return false;
      }

      // Status filter
      if (filterStatus === 'paid' && !t.isPaid) return false;
      if (filterStatus === 'pending' && t.isPaid) return false;

      return true;
    });
  }, [transactions, selectedMonth, searchQuery, filterType, filterCategory, filterAccount, filterStatus]);

  // Summaries
  const filteredIncomes = filtered
    .filter(t => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredExpenses = filtered
    .filter(t => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExportCSV = () => {
    const rows = filtered.map(t => ({
      Data: t.date,
      Tipo: t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
      Descricao: t.description,
      Categoria: t.category,
      Valor: t.amount,
      FormaPagamento: getPaymentMethodLabel(t.paymentMethod),
      Status: t.isPaid ? 'Pago/Recebido' : 'Pendente',
      Observacao: t.notes || '',
    }));
    exportToCSV(`vfinance_extrato_${selectedMonth}`, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Extrato & Movimentações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Acompanhe cada entrada, saída e transferência em detalhes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161618] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              setQuickAddDefaultType('expense');
              setIsQuickAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Movimentação</span>
          </button>
        </div>
      </div>

      {/* Mini Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#161618] p-4 rounded-3xl border border-slate-200/80 dark:border-white/5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Entradas do Filtro</p>
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
              +{formatCurrency(filteredIncomes, user.hideValues)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#161618] p-4 rounded-3xl border border-slate-200/80 dark:border-white/5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Saídas do Filtro</p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
              -{formatCurrency(filteredExpenses, user.hideValues)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#161618] p-4 rounded-3xl border border-slate-200/80 dark:border-white/5 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Resultado Líquido</p>
            <p
              className={`text-lg font-bold ${
                filteredIncomes - filteredExpenses >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(filteredIncomes - filteredExpenses, user.hideValues)}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-500/10 text-slate-400 border border-white/5">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#161618] p-4 rounded-3xl border border-slate-200/80 dark:border-white/5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Type */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas (+)</option>
            <option value="expense">Despesas (-)</option>
            <option value="transfer">Transferências</option>
          </select>

          {/* Category */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Account */}
          <select
            value={filterAccount}
            onChange={e => setFilterAccount(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas as contas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-[#161618] rounded-3xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <p>Nenhuma movimentação encontrada com os filtros selecionados.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterAccount('all');
                }}
                className="text-emerald-500 font-semibold hover:underline"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            filtered.map(tx => {
              const account = accounts.find(a => a.id === tx.accountId);
              const toAccount = accounts.find(a => a.id === tx.toAccountId);

              return (
                <div
                  key={tx.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : tx.type === 'expense'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : tx.type === 'expense' ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <ArrowLeftRight className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </p>
                        {tx.installmentInfo && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            {tx.installmentInfo.current}/{tx.installmentInfo.total}
                          </span>
                        )}
                        {!tx.isPaid && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Pendente
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {tx.category}
                        </span>
                        <span>•</span>
                        <span>
                          {tx.type === 'transfer'
                            ? `${account?.name} → ${toAccount?.name}`
                            : account?.name || 'Conta'}
                        </span>
                        <span>•</span>
                        <span className="capitalize">
                          {getPaymentMethodLabel(tx.paymentMethod)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-sm sm:text-base font-bold ${
                          tx.type === 'income'
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, user.hideValues)}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Excluir movimentação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
