export function formatCurrency(value: number, hide = false): string {
  if (hide) {
    return '••••••';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatMonthYear(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getDaysUntil(dueDay: number, currentMonth = new Date().getMonth(), currentYear = new Date().getFullYear()): {
  text: string;
  days: number;
  isOverdue: boolean;
  isToday: boolean;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(currentYear, currentMonth, dueDay);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Atrasado (${Math.abs(diffDays)}d)`,
      days: diffDays,
      isOverdue: true,
      isToday: false,
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Vence hoje!',
      days: 0,
      isOverdue: false,
      isToday: true,
    };
  }

  if (diffDays === 1) {
    return {
      text: 'Vence amanhã',
      days: 1,
      isOverdue: false,
      isToday: false,
    };
  }

  return {
    text: `Vence em ${diffDays} dias`,
    days: diffDays,
    isOverdue: false,
    isToday: false,
  };
}

export function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    money: 'Dinheiro',
    pix: 'Pix',
    debit: 'Débito',
    credit: 'Cartão de Crédito',
    boleto: 'Boleto Bancário',
    transfer: 'Transferência',
    other: 'Outro',
  };
  return map[method] || method;
}

export function getRecurrenceLabel(recurrence: string): string {
  const map: Record<string, string> = {
    none: 'Única',
    daily: 'Diária',
    weekly: 'Semanal',
    biweekly: 'Quinzenal',
    monthly: 'Mensal',
    yearly: 'Anual',
  };
  return map[recurrence] || recurrence;
}

export function exportToCSV(filename: string, rows: object[]) {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows
      .map((row: any) => {
        return keys
          .map((k) => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
            cell = cell.replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          })
          .join(separator);
      })
      .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(filename: string, data: object) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
