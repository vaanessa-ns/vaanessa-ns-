import {
  UserProfile,
  BankAccount,
  Transaction,
  FixedBill,
  CreditCard,
  CardPurchase,
  FinancialGoal,
  DebtItem,
  CategoryBudget,
  CategoryDefinition,
} from '../types';

export interface ComprehensiveFinancialContext {
  period: string;
  periodLabel: string;
  currentDate: string;
  user: {
    name: string;
    email: string;
    monthlyIncome: number;
    primaryGoal: string;
    financialStyle: string;
  };
  summary: {
    availableBalance: number;
    monthIncomes: number;
    monthExpenses: number;
    monthRemaining: number;
    monthSavingsRate: number;
    totalNetWorth: number;
    totalCreditCardLimit: number;
    totalCreditCardUsed: number;
    totalCreditCardAvailable: number;
    totalDebtsRemaining: number;
    pendingFixedBillsTotal: number;
    paidFixedBillsTotal: number;
    totalGoalsTarget: number;
    totalGoalsAccumulated: number;
    hasAnyData: boolean;
  };
  accounts: Array<{
    id: string;
    name: string;
    bank: string;
    type: string;
    balance: number;
    isDefault: boolean;
  }>;
  creditCards: Array<{
    id: string;
    name: string;
    bank: string;
    totalLimit: number;
    closingDay: number;
    dueDay: number;
    brand?: string;
    usedAmount: number;
    availableLimit: number;
  }>;
  cardPurchases: Array<{
    id: string;
    cardName: string;
    description: string;
    totalAmount: number;
    installmentsCount: number;
    installmentValue: number;
    currentPaidInstallments: number;
    remainingInstallments: number;
    remainingAmount: number;
    purchaseDate: string;
    category: string;
  }>;
  futureInstallmentsByMonth: Array<{
    month: string;
    monthLabel: string;
    totalAmount: number;
    purchases: Array<{
      description: string;
      installmentNumber: number;
      totalInstallments: number;
      amount: number;
      cardName: string;
    }>;
  }>;
  fixedBills: Array<{
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    recurrence: string;
    status: string;
    autoDebit: boolean;
    lastPaidDate?: string;
    isPaidThisMonth: boolean;
  }>;
  transactionsThisMonth: Array<{
    id: string;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    amount: number;
    category: string;
    date: string;
    paymentMethod: string;
    isPaid: boolean;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    amount: number;
    category: string;
    date: string;
    paymentMethod: string;
    isPaid: boolean;
  }>;
  categorySpendingThisMonth: Record<string, number>;
  categoryIncomesThisMonth: Record<string, number>;
  budgets: Array<{
    category: string;
    monthlyLimit: number;
    month: string;
    alertThreshold: number;
    currentSpent: number;
    percentageUsed: number;
    remainingBudget: number;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    deadline: string;
    category: string;
    progressPercentage: number;
  }>;
  debts: Array<{
    id: string;
    name: string;
    creditor: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    installmentsTotal: number;
    installmentsPaid: number;
    interestRate: number;
    dueDate: string;
    priority: string;
    category: string;
  }>;
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatMonthLabel(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const [year, month] = yyyyMm.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES_PT[monthIdx] || month;
  return `${monthName} de ${year}`;
}

export function buildComprehensiveFinancialContext(params: {
  user: UserProfile;
  accounts: BankAccount[];
  transactions: Transaction[];
  fixedBills: FixedBill[];
  creditCards: CreditCard[];
  cardPurchases: CardPurchase[];
  goals: FinancialGoal[];
  debts: DebtItem[];
  budgets: CategoryBudget[];
  categories: CategoryDefinition[];
  selectedMonth: string;
}): ComprehensiveFinancialContext {
  const {
    user,
    accounts,
    transactions,
    fixedBills,
    creditCards,
    cardPurchases,
    goals,
    debts,
    budgets,
    selectedMonth,
  } = params;

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const periodLabel = formatMonthLabel(selectedMonth);

  // 1. Available Balance from real accounts
  const availableBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  // 2. Month transactions (filtered by selectedMonth YYYY-MM)
  const monthTxs = transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
  const monthIncomes = monthTxs
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const monthExpenses = monthTxs
    .filter((t) => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const monthRemaining = monthIncomes - monthExpenses;
  const monthSavingsRate = monthIncomes > 0
    ? Math.max(0, Math.min(100, Math.round(((monthIncomes - monthExpenses) / monthIncomes) * 100)))
    : 0;

  // 3. Category Spending & Incomes
  const categorySpendingThisMonth: Record<string, number> = {};
  const categoryIncomesThisMonth: Record<string, number> = {};

  monthTxs.forEach((t) => {
    const val = Number(t.amount) || 0;
    if (t.type === 'expense' && t.isPaid) {
      categorySpendingThisMonth[t.category] = (categorySpendingThisMonth[t.category] || 0) + val;
    } else if (t.type === 'income' && t.isPaid) {
      categoryIncomesThisMonth[t.category] = (categoryIncomesThisMonth[t.category] || 0) + val;
    }
  });

  // 4. Credit Cards and Purchases
  const cardMap = new Map<string, CreditCard>();
  creditCards.forEach((c) => cardMap.set(c.id, c));

  const cardPurchasesFormatted = cardPurchases.map((p) => {
    const card = cardMap.get(p.cardId);
    const count = Number(p.installmentsCount) || 1;
    const paid = Number(p.currentPaidInstallments) || 0;
    const remainingCount = Math.max(0, count - paid);
    const instVal = Number(p.installmentValue) || (Number(p.totalAmount) / count);
    const remainingAmount = remainingCount * instVal;

    return {
      id: p.id,
      cardName: card?.name || 'Cartão',
      description: p.description,
      totalAmount: Number(p.totalAmount) || 0,
      installmentsCount: count,
      installmentValue: instVal,
      currentPaidInstallments: paid,
      remainingInstallments: remainingCount,
      remainingAmount,
      purchaseDate: p.purchaseDate,
      category: p.category,
    };
  });

  const totalCreditCardLimit = creditCards.reduce((sum, c) => sum + (Number(c.totalLimit) || 0), 0);
  const totalCreditCardUsed = cardPurchasesFormatted.reduce((sum, p) => sum + p.remainingAmount, 0);
  const totalCreditCardAvailable = Math.max(0, totalCreditCardLimit - totalCreditCardUsed);

  const creditCardsFormatted = creditCards.map((c) => {
    const purchasesForCard = cardPurchasesFormatted.filter((p) => p.cardName === c.name || cardPurchases.some(cp => cp.id === p.id && cp.cardId === c.id));
    const usedAmount = purchasesForCard.reduce((sum, p) => sum + p.remainingAmount, 0);
    return {
      id: c.id,
      name: c.name,
      bank: c.bank,
      totalLimit: Number(c.totalLimit) || 0,
      closingDay: c.closingDay,
      dueDay: c.dueDay,
      brand: c.brand,
      usedAmount,
      availableLimit: Math.max(0, (Number(c.totalLimit) || 0) - usedAmount),
    };
  });

  // 5. Future Installments Calculation (Next 6 Months)
  const futureInstallmentsByMonth: Array<{
    month: string;
    monthLabel: string;
    totalAmount: number;
    purchases: Array<{
      description: string;
      installmentNumber: number;
      totalInstallments: number;
      amount: number;
      cardName: string;
    }>;
  }> = [];

  const [selYearStr, selMonthStr] = selectedMonth.split('-');
  const baseYear = parseInt(selYearStr, 10) || now.getFullYear();
  const baseMonth = (parseInt(selMonthStr, 10) || (now.getMonth() + 1)) - 1; // 0-indexed

  for (let offset = 1; offset <= 6; offset++) {
    const targetDate = new Date(baseYear, baseMonth + offset, 1);
    const yStr = targetDate.getFullYear();
    const mStr = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetYyyyMm = `${yStr}-${mStr}`;

    const monthPurchases: Array<{
      description: string;
      installmentNumber: number;
      totalInstallments: number;
      amount: number;
      cardName: string;
    }> = [];

    cardPurchases.forEach((p) => {
      const count = Number(p.installmentsCount) || 1;
      const paid = Number(p.currentPaidInstallments) || 0;
      const instVal = Number(p.installmentValue) || (Number(p.totalAmount) / count);
      const card = cardMap.get(p.cardId);

      // If the purchase still has remaining installments in the future
      if (paid + offset <= count) {
        monthPurchases.push({
          description: p.description,
          installmentNumber: paid + offset,
          totalInstallments: count,
          amount: instVal,
          cardName: card?.name || 'Cartão',
        });
      }
    });

    const monthTotal = monthPurchases.reduce((s, mp) => s + mp.amount, 0);

    futureInstallmentsByMonth.push({
      month: targetYyyyMm,
      monthLabel: formatMonthLabel(targetYyyyMm),
      totalAmount: monthTotal,
      purchases: monthPurchases,
    });
  }

  // 6. Fixed Bills
  const fixedBillsFormatted = fixedBills.map((b) => {
    const isPaidThisMonth = Boolean(b.lastPaidDate && b.lastPaidDate.startsWith(selectedMonth));
    return {
      id: b.id,
      name: b.name,
      amount: Number(b.amount) || 0,
      dueDay: b.dueDay,
      category: b.category,
      recurrence: b.recurrence,
      status: isPaidThisMonth ? 'paid' : b.status,
      autoDebit: Boolean(b.autoDebit),
      lastPaidDate: b.lastPaidDate,
      isPaidThisMonth,
    };
  });

  const pendingFixedBillsTotal = fixedBillsFormatted
    .filter((b) => !b.isPaidThisMonth)
    .reduce((sum, b) => sum + b.amount, 0);

  const paidFixedBillsTotal = fixedBillsFormatted
    .filter((b) => b.isPaidThisMonth)
    .reduce((sum, b) => sum + b.amount, 0);

  // 7. Goals
  const goalsFormatted = goals.map((g) => {
    const target = Number(g.targetAmount) || 0;
    const current = Number(g.currentAmount) || 0;
    const progressPercentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      remainingAmount: Math.max(0, target - current),
      deadline: g.deadline,
      category: g.category,
      progressPercentage,
    };
  });

  const totalGoalsTarget = goalsFormatted.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalGoalsAccumulated = goalsFormatted.reduce((sum, g) => sum + g.currentAmount, 0);

  // 8. Debts
  const debtsFormatted = debts.map((d) => {
    const total = Number(d.totalAmount) || 0;
    const paid = Number(d.paidAmount) || 0;
    const remaining = Number(d.remainingAmount) !== undefined ? Number(d.remainingAmount) : Math.max(0, total - paid);
    return {
      id: d.id,
      name: d.name,
      creditor: d.creditor,
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: remaining,
      installmentsTotal: Number(d.installmentsTotal) || 1,
      installmentsPaid: Number(d.installmentsPaid) || 0,
      interestRate: Number(d.interestRate) || 0,
      dueDate: d.dueDate,
      priority: d.priority,
      category: d.category,
    };
  });

  const totalDebtsRemaining = debtsFormatted.reduce((sum, d) => sum + d.remainingAmount, 0);

  // 9. Total Net Worth
  const totalNetWorth = availableBalance + totalGoalsAccumulated - totalDebtsRemaining;

  // 10. Budgets
  const budgetsFormatted = budgets
    .filter((b) => b.month === selectedMonth)
    .map((b) => {
      const limit = Number(b.monthlyLimit) || 0;
      const spent = categorySpendingThisMonth[b.category] || 0;
      const percentageUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return {
        category: b.category,
        monthlyLimit: limit,
        month: b.month,
        alertThreshold: Number(b.alertThreshold) || 80,
        currentSpent: spent,
        percentageUsed,
        remainingBudget: Math.max(0, limit - spent),
      };
    });

  // 11. Recent & Month Transactions
  const transactionsThisMonth = monthTxs.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount) || 0,
    category: t.category,
    date: t.date,
    paymentMethod: t.paymentMethod,
    isPaid: Boolean(t.isPaid),
  }));

  const recentTransactions = transactions.slice(0, 30).map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount) || 0,
    category: t.category,
    date: t.date,
    paymentMethod: t.paymentMethod,
    isPaid: Boolean(t.isPaid),
  }));

  const hasAnyData = accounts.length > 0 || transactions.length > 0 || fixedBills.length > 0 || creditCards.length > 0 || goals.length > 0 || debts.length > 0;

  return {
    period: selectedMonth,
    periodLabel,
    currentDate,
    user: {
      name: user.name || 'Usuário',
      email: user.email || '',
      monthlyIncome: Number(user.monthlyIncome) || 0,
      primaryGoal: user.primaryGoal || '',
      financialStyle: user.financialStyle || 'individual',
    },
    summary: {
      availableBalance,
      monthIncomes,
      monthExpenses,
      monthRemaining,
      monthSavingsRate,
      totalNetWorth,
      totalCreditCardLimit,
      totalCreditCardUsed,
      totalCreditCardAvailable,
      totalDebtsRemaining,
      pendingFixedBillsTotal,
      paidFixedBillsTotal,
      totalGoalsTarget,
      totalGoalsAccumulated,
      hasAnyData,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      bank: a.bank,
      type: a.type,
      balance: Number(a.balance) || 0,
      isDefault: Boolean(a.isDefault),
    })),
    creditCards: creditCardsFormatted,
    cardPurchases: cardPurchasesFormatted,
    futureInstallmentsByMonth,
    fixedBills: fixedBillsFormatted,
    transactionsThisMonth,
    recentTransactions,
    categorySpendingThisMonth,
    categoryIncomesThisMonth,
    budgets: budgetsFormatted,
    goals: goalsFormatted,
    debts: debtsFormatted,
  };
}
