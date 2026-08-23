import React, { useState } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  Calendar,
  AlertCircle,
  TrendingDown,
  CheckCircle2,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CreditCard } from '../types';

export const CreditCardsView: React.FC = () => {
  const {
    creditCards,
    cardPurchases,
    transactions,
    payCardInvoice,
    addCreditCard,
    deleteCreditCard,
    accounts,
    user,
    setIsQuickAddOpen,
    setQuickAddDefaultType,
    selectedMonth,
  } = useFinance();

  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || '');
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

  // Add Card Modal
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardName, setNewCardName] = useState('');
  const [newCardBank, setNewCardBank] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardClosing, setNewCardClosing] = useState('20');
  const [newCardDue, setNewCardDue] = useState('28');
  const [newCardColor, setNewCardColor] = useState('#8B5CF6');
  const [newCardBrand, setNewCardBrand] = useState<'visa' | 'mastercard' | 'elo' | 'amex'>('mastercard');

  // Delete Card State & Feedback
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeCard = creditCards.find(c => c.id === selectedCardId) || creditCards[0];

  // Calculate current invoice spent for selected card
  const currentInvoiceSpent = transactions
    .filter(t => t.cardId === activeCard?.id && t.date.startsWith(selectedMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const availableLimit = activeCard ? Math.max(0, activeCard.totalLimit - currentInvoiceSpent) : 0;
  const usagePercentage = activeCard && activeCard.totalLimit > 0 ? Math.min(100, Math.round((currentInvoiceSpent / activeCard.totalLimit) * 100)) : 0;

  // Purchases on this card
  const cardItems = cardPurchases.filter(p => p.cardId === activeCard?.id);

  // Total in future installments for this card
  const futureInstallmentsTotal = cardItems.reduce(
    (sum, p) => sum + p.installmentValue * (p.installmentsCount - p.currentPaidInstallments),
    0
  );

  const handlePayInvoice = (cardId: string) => {
    if (currentInvoiceSpent <= 0 || !selectedAccountId) return;
    payCardInvoice(cardId, selectedAccountId, currentInvoiceSpent);
    setPayingCardId(null);
  };

  const handleDeleteCardConfirm = async () => {
    if (!cardToDelete) return;
    setIsDeletingCard(true);
    try {
      const res = await deleteCreditCard(cardToDelete.id);
      if (res && res.success === false) {
        setToastMessage({
          type: 'error',
          text: res.error || 'Não foi possível excluir o cartão no momento.',
        });
      } else {
        setToastMessage({
          type: 'success',
          text: `Cartão "${cardToDelete.name}" foi excluído com sucesso!`,
        });
        const remaining = creditCards.filter(c => c.id !== cardToDelete.id);
        if (selectedCardId === cardToDelete.id) {
          setSelectedCardId(remaining[0]?.id || '');
        }
        setCardToDelete(null);
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err?.message || 'Erro inesperado ao excluir o cartão.',
      });
    } finally {
      setIsDeletingCard(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newCardLimit.replace(',', '.')) || 0;
    if (!newCardName || limit <= 0) return;

    addCreditCard({
      name: newCardName,
      bank: newCardBank || newCardName,
      totalLimit: limit,
      closingDay: parseInt(newCardClosing, 10) || 20,
      dueDay: parseInt(newCardDue, 10) || 28,
      color: newCardColor,
      brand: newCardBrand,
    });

    setIsAddCardOpen(false);
    setNewCardName('');
    setNewCardLimit('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Cartões de Crédito & Parcelamentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitore limites, datas de fechamento e o impacto das parcelas futuras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddCardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161618] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cartão</span>
          </button>

          <button
            onClick={() => {
              setQuickAddDefaultType('card_purchase');
              setIsQuickAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Compra Parcelada</span>
          </button>
        </div>
      </div>

      {/* Credit Cards Horizontal Slider / Selector */}
      {creditCards.length === 0 ? (
        <div className="bg-white dark:bg-[#161618] p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
            <CardIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Nenhum cartão de crédito cadastrado
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Adicione seus cartões para acompanhar limites utilizados, faturas e parcelas futuras.
          </p>
          <button
            type="button"
            onClick={() => setIsAddCardOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded-2xl shadow-lg shadow-purple-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeiro Cartão</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {creditCards.map(card => {
            const isSelected = card.id === (activeCard?.id || creditCards[0]?.id);
            const cardSpent = transactions
              .filter(t => t.cardId === card.id && t.date.startsWith(selectedMonth))
              .reduce((sum, t) => sum + t.amount, 0);
            const limitPct = card.totalLimit > 0 ? Math.round((cardSpent / card.totalLimit) * 100) : 0;

            return (
              <div
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`p-6 rounded-3xl cursor-pointer transition-all relative overflow-hidden text-white flex flex-col justify-between h-52 select-none border ${
                  isSelected
                    ? 'border-emerald-500/80 shadow-2xl shadow-emerald-500/10 scale-[1.02]'
                    : 'border-white/10 opacity-80 hover:opacity-100 hover:scale-[1.01]'
                }`}
                style={{
                  background: `linear-gradient(135deg, ${card.color || '#8B5CF6'} 0%, #0A0A0B 100%)`,
                }}
              >
                {/* Chip & Brand */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-7 rounded-md bg-amber-300/80 border border-amber-400/60 shadow-xs flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/40 rounded-xs" />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-semibold text-white/80">
                      {card.brand || 'Mastercard'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide text-white">
                      {card.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardToDelete(card);
                      }}
                      className="p-1.5 rounded-lg text-white/70 hover:text-rose-400 hover:bg-black/40 transition-colors"
                      title={`Excluir cartão ${card.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Invoice Value & Card Number */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/70">
                    Fatura Atual ({selectedMonth})
                  </p>
                  <p className="text-2xl font-bold tracking-tight">
                    {formatCurrency(cardSpent, user.hideValues)}
                  </p>
                </div>

                {/* Dates & Limit Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-white/80">
                    <span>Fecha dia {card.closingDay}</span>
                    <span>Vence dia {card.dueDay}</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        limitPct > 80 ? 'bg-rose-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, limitPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Card Detailed Panel */}
      {activeCard && (
        <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-6">
          {/* Card Overview & Pay Invoice CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Detalhes do Cartão Selecionado
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {activeCard.name} ({activeCard.bank})
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {payingCardId === activeCard.id ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-slate-100 dark:bg-[#202024] rounded-2xl border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Pagar com:
                  </span>
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="text-xs px-2 py-1.5 bg-white dark:bg-[#161618] rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (R$ {acc.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPayingCardId(null)}
                    className="px-2 py-1 text-xs text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handlePayInvoice(activeCard.id)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-xs"
                  >
                    Confirmar Quitação
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPayingCardId(activeCard.id)}
                  disabled={currentInvoiceSpent <= 0}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
                    currentInvoiceSpent > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-100 dark:bg-[#202024] text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pagar Fatura ({formatCurrency(currentInvoiceSpent, user.hideValues)})</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 Metric Cards for this Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5">
              <span className="text-xs text-slate-400">Limite Total</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(activeCard.totalLimit, user.hideValues)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Limite aprovado pelo banco</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5">
              <span className="text-xs text-slate-400">Limite Disponível</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {formatCurrency(availableLimit, user.hideValues)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{100 - usagePercentage}% do total</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5">
              <span className="text-xs text-slate-400">Saldo Parcelado Futuro</span>
              <p className="text-lg font-bold text-purple-400 mt-1">
                {formatCurrency(futureInstallmentsTotal, user.hideValues)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Comprometido nos próximos meses</p>
            </div>
          </div>

          {/* Section: Controle de Compras Parceladas */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Controle de Parcelamentos Ativos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acompanhe quantas parcelas já foram pagas e o cronograma restante
                  </p>
                </div>
              </div>
            </div>

            {cardItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#202024] rounded-2xl">
                Nenhum parcelamento ativo neste cartão.
              </div>
            ) : (
              <div className="space-y-3">
                {cardItems.map(item => {
                  const remainingInstallments = item.installmentsCount - item.currentPaidInstallments;
                  const remainingValue = remainingInstallments * item.installmentValue;
                  const progressPct = Math.round((item.currentPaidInstallments / item.installmentsCount) * 100);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.description}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {item.currentPaidInstallments} de {item.installmentsCount} pagas ({progressPct}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full max-w-md h-2 bg-slate-200 dark:bg-[#161618] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Comprado em {formatDate(item.purchaseDate)} • Categoria: {item.category}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-white/5">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Parcela Mensal
                          </span>
                          <p className="text-base font-bold text-slate-900 dark:text-white">
                            {formatCurrency(item.installmentValue, user.hideValues)} /mês
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 sm:mt-1">
                          Faltam {remainingInstallments}x ({formatCurrency(remainingValue, user.hideValues)})
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161618] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Cadastrar Cartão de Crédito
            </h3>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nome do Cartão (ex: Nubank Ultravioleta)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank Black"
                  value={newCardName}
                  onChange={e => setNewCardName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Instituição / Banco
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank"
                    value={newCardBank}
                    onChange={e => setNewCardBank(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Bandeira
                  </label>
                  <select
                    value={newCardBrand}
                    onChange={e => setNewCardBrand(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="mastercard">Mastercard</option>
                    <option value="visa">Visa</option>
                    <option value="elo">Elo</option>
                    <option value="amex">Amex</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Limite Total (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="5000,00"
                  value={newCardLimit}
                  onChange={e => setNewCardLimit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Dia de Fechamento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={newCardClosing}
                    onChange={e => setNewCardClosing(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Dia de Vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={newCardDue}
                    onChange={e => setNewCardDue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#161618] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Excluir Cartão de Crédito
                  </h3>
                  <p className="text-xs text-slate-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingCard && setCardToDelete(null)}
                disabled={isDeletingCard}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202024] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Cartão</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {cardToDelete.name} ({cardToDelete.bank})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Limite</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {formatCurrency(cardToDelete.totalLimit, user.hideValues)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Vencimento</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dia {cardToDelete.dueDay} (Fecha dia {cardToDelete.closingDay})
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tem certeza que deseja remover o cartão <strong className="text-slate-900 dark:text-white">{cardToDelete.name}</strong>? Compras parceladas associadas a ele também serão excluídas do banco de dados.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCardToDelete(null)}
                disabled={isDeletingCard}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202024] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCardConfirm}
                disabled={isDeletingCard}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isDeletingCard ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Cartão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Feedback */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
