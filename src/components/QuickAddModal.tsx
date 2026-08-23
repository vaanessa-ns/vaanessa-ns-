import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Receipt,
  CreditCard,
  PiggyBank,
  ShieldAlert,
  Calendar,
  Wallet,
  Tag,
  FileText
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PaymentMethod, RecurrenceType, DebtPriority } from '../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'income' | 'expense' | 'transfer' | 'bill' | 'card_purchase' | 'goal' | 'debt';
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'expense',
}) => {
  const {
    accounts,
    categories,
    creditCards,
    addTransaction,
    transferBetweenAccounts,
    addFixedBill,
    addCardPurchase,
    addGoal,
    addDebt,
    selectedMonth,
  } = useFinance();

  const [activeType, setActiveType] = useState<string>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveType(initialTab);
    }
  }, [initialTab, isOpen]);

  // Today's date default
  const today = new Date().toISOString().split('T')[0];

  // Common Form States
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Alimentação');
  const [date, setDate] = useState<string>(today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || accounts[0]?.id || '');
  const [cardId, setCardId] = useState<string>(creditCards[0]?.id || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [notes, setNotes] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(true);

  // Specific for Card Purchase
  const [installmentsCount, setInstallmentsCount] = useState<number>(6);

  // Specific for Fixed Bill
  const [dueDay, setDueDay] = useState<number>(10);

  // Specific for Goal
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('0');
  const [goalDeadline, setGoalDeadline] = useState<string>('2026-12-31');

  // Specific for Debt
  const [debtCreditor, setDebtCreditor] = useState<string>('');
  const [debtPaidAmount, setDebtPaidAmount] = useState<string>('0');
  const [debtInstallments, setDebtInstallments] = useState<number>(5);
  const [debtPriority, setDebtPriority] = useState<DebtPriority>('high');
  const [debtInterest, setDebtInterest] = useState<string>('0');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.'));

    if (activeType === 'income') {
      if (!numAmount || isNaN(numAmount)) return;
      addTransaction({
        type: 'income',
        description: description || 'Receita',
        amount: numAmount,
        category: category || 'Outras Entradas',
        date,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        recurrence,
        isPaid: true,
        notes,
      });
    } else if (activeType === 'expense') {
      if (!numAmount || isNaN(numAmount)) return;
      addTransaction({
        type: 'expense',
        description: description || 'Despesa',
        amount: numAmount,
        category: category || 'Outros Gastos',
        date,
        paymentMethod,
        accountId: paymentMethod === 'credit' ? (accounts[0]?.id || '') : accountId,
        cardId: paymentMethod === 'credit' ? cardId : undefined,
        recurrence,
        isPaid,
        notes,
      });
    } else if (activeType === 'transfer') {
      if (!numAmount || isNaN(numAmount)) return;
      if (accountId === toAccountId) return;
      transferBetweenAccounts(accountId, toAccountId, numAmount, notes, date);
    } else if (activeType === 'bill') {
      if (!numAmount || isNaN(numAmount)) return;
      addFixedBill({
        name: description || 'Conta Fixa',
        amount: numAmount,
        dueDay: Number(dueDay) || 10,
        category: category || 'Contas Fixas',
        paymentMethod,
        recurrence: 'monthly',
        status: 'pending',
        accountId,
        notes,
      });
    } else if (activeType === 'card_purchase') {
      if (!numAmount || isNaN(numAmount)) return;
      addCardPurchase({
        cardId: cardId || creditCards[0]?.id,
        description: description || 'Compra Parcelada',
        totalAmount: numAmount,
        installmentsCount: Number(installmentsCount) || 1,
        purchaseDate: date,
        category: category || 'Compras',
        notes,
      });
    } else if (activeType === 'goal') {
      const target = parseFloat(targetAmount.replace(',', '.'));
      const curr = parseFloat(currentAmount.replace(',', '.')) || 0;
      if (!target || isNaN(target)) return;
      addGoal({
        name: description || 'Novo Objetivo',
        targetAmount: target,
        currentAmount: curr,
        deadline: goalDeadline,
        category: category || 'Metas',
        color: '#10B981',
        iconName: 'PiggyBank',
        notes,
      });
    } else if (activeType === 'debt') {
      const total = parseFloat(amount.replace(',', '.'));
      const paid = parseFloat(debtPaidAmount.replace(',', '.')) || 0;
      if (!total || isNaN(total)) return;
      addDebt({
        name: description || 'Dívida',
        creditor: debtCreditor || 'Credor',
        totalAmount: total,
        paidAmount: paid,
        installmentsTotal: Number(debtInstallments) || 1,
        interestRate: parseFloat(debtInterest) || 0,
        dueDate: date,
        priority: debtPriority,
        category: category || 'Cartão de crédito',
        notes,
      });
    }

    // Reset & Close
    setAmount('');
    setDescription('');
    setNotes('');
    onClose();
  };

  const typesList = [
    { id: 'expense', label: 'Despesa', icon: TrendingDown, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
    { id: 'income', label: 'Receita', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { id: 'transfer', label: 'Transferência', icon: ArrowLeftRight, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
    { id: 'bill', label: 'Conta Fixa', icon: Receipt, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { id: 'card_purchase', label: 'Compra Parcelada', icon: CreditCard, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
    { id: 'goal', label: 'Meta', icon: PiggyBank, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
    { id: 'debt', label: 'Dívida', icon: ShieldAlert, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161618] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Nova Movimentação
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202024] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Pills */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {typesList.map(t => {
              const Icon = t.icon;
              const isSelected = activeType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveType(t.id);
                    if (t.id === 'income') setCategory('Salário');
                    else if (t.id === 'expense') setCategory('Alimentação');
                    else if (t.id === 'bill') setCategory('Moradia');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-[#202024] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#28282C]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Main Amount Input (Big & Prominent) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {activeType === 'goal' ? 'Valor Objetivo (R$)' : 'Valor (R$)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-slate-400">
                R$
              </span>
              <input
                type="text"
                required
                placeholder="0,00"
                value={activeType === 'goal' ? targetAmount : amount}
                onChange={e => {
                  const val = e.target.value;
                  if (activeType === 'goal') setTargetAmount(val);
                  else setAmount(val);
                }}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xl sm:text-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              {activeType === 'debt' ? 'Nome da Dívida' : activeType === 'goal' ? 'Nome da Meta' : 'Descrição'}
            </label>
            <input
              type="text"
              required
              placeholder={
                activeType === 'income'
                  ? 'Ex: Salário mensal, Freelance'
                  : activeType === 'expense'
                  ? 'Ex: Supermercado, Almoço'
                  : activeType === 'bill'
                  ? 'Ex: Aluguel, Internet, Academia'
                  : activeType === 'card_purchase'
                  ? 'Ex: Notebook, Celular, Passagens'
                  : activeType === 'goal'
                  ? 'Ex: Viagem de Fim de Ano, Carro'
                  : activeType === 'debt'
                  ? 'Ex: Cartão Renegociado, Empréstimo'
                  : 'Descrição da transferência'
              }
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Specific Inputs by Type */}
          {activeType === 'transfer' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Conta de Origem
                </label>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Conta de Destino
                </label>
                <select
                  value={toAccountId}
                  onChange={e => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : activeType === 'card_purchase' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Cartão de Crédito
                  </label>
                  <select
                    value={cardId}
                    onChange={e => setCardId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Nº de Parcelas
                  </label>
                  <select
                    value={installmentsCount}
                    onChange={e => setInstallmentsCount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36].map(n => (
                      <option key={n} value={n}>
                        {n}x {amount && !isNaN(Number(amount.replace(',', '.'))) ? `de R$ ${(Number(amount.replace(',', '.')) / n).toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : activeType === 'bill' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Dia do Vencimento (1 a 31)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={e => setDueDay(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="pix">Pix</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="debit">Débito em Conta</option>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="money">Dinheiro</option>
                </select>
              </div>
            </div>
          ) : activeType === 'goal' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Valor já guardado (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={currentAmount}
                  onChange={e => setCurrentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Data Limite
                </label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={e => setGoalDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ) : activeType === 'debt' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Credor / Banco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bradesco, Santander"
                    value={debtCreditor}
                    onChange={e => setDebtCreditor(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Valor já pago (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={debtPaidAmount}
                    onChange={e => setDebtPaidAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={debtPriority}
                    onChange={e => setDebtPriority(e.target.value as DebtPriority)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="high">Alta (Juros altos / Rotativo)</option>
                    <option value="medium">Média (Financiamento)</option>
                    <option value="low">Baixa (Amigos / Família)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Juros ao mês (%)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 2.5"
                    value={debtInterest}
                    onChange={e => setDebtInterest(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Standard Income / Expense
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories
                      .filter(c => (activeType === 'income' ? c.type === 'income' : c.type === 'expense'))
                      .map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pix">Pix</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="money">Dinheiro</option>
                    <option value="boleto">Boleto</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </div>

                {paymentMethod === 'credit' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Cartão
                    </label>
                    <select
                      value={cardId}
                      onChange={e => setCardId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Conta
                    </label>
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Recorrência
                </label>
                <select
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value as RecurrenceType)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="none">Única (Não se repete)</option>
                  <option value="monthly">Mensal</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes / Observation */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Observação (Opcional)
            </label>
            <input
              type="text"
              placeholder="Adicione um lembrete ou detalhe"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99]"
            >
              Salvar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
