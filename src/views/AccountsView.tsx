import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  Trash2,
  CheckCircle2,
  PiggyBank,
  ShieldCheck,
  RefreshCw,
  Unlink,
  ExternalLink,
  Shield
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import { ConnectBankModal } from '../components/ConnectBankModal';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    addAccount,
    deleteAccount,
    transferBetweenAccounts,
    totalNetWorth,
    availableBalance,
    user,
    bankConnections,
    syncBankConnection,
    disconnectBank,
    isSyncingBank,
  } = useFinance();

  // Open Finance Connect Bank Modal state
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Transfer Modal state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromAcc, setFromAcc] = useState(accounts[0]?.id || '');
  const [toAcc, setToAcc] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  // Add Account Modal
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccBank, setNewAccBank] = useState('');
  const [newAccType, setNewAccType] = useState<'checking' | 'savings' | 'investment' | 'cash'>('checking');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#10B981');

  const handleSyncBank = async (connId: string) => {
    setSyncingId(connId);
    await syncBankConnection(connId);
    setSyncingId(null);
  };

  const handleDisconnectBank = async (connId: string, bankName: string) => {
    if (window.confirm(`Tem certeza que deseja desconectar o ${bankName}? As contas e movimentações sincronizadas permanecerão salvas historicamente.`)) {
      await disconnectBank(connId);
    }
  };


  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount.replace(',', '.'));
    if (!amt || isNaN(amt) || fromAcc === toAcc) return;

    transferBetweenAccounts(
      fromAcc,
      toAcc,
      amt,
      transferDesc || 'Transferência entre contas',
      new Date().toISOString().split('T')[0]
    );

    setIsTransferOpen(false);
    setTransferAmount('');
    setTransferDesc('');
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(newAccBalance.replace(',', '.')) || 0;
    if (!newAccName) return;

    addAccount({
      name: newAccName,
      bank: newAccBank || newAccName,
      type: newAccType,
      balance: bal,
      color: newAccColor,
      isIncludedInTotal: true,
    });

    setIsAddAccountOpen(false);
    setNewAccName('');
    setNewAccBalance('');
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Conta Corrente';
      case 'savings':
        return 'Poupança';
      case 'investment':
        return 'Investimentos';
      case 'cash':
        return 'Dinheiro / Carteira';
      default:
        return 'Outro';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Contas, Bancos & Patrimônio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gerencie todas as suas contas bancárias, carteiras e investimentos em um só lugar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConnectBankOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>+ Conectar banco</span>
          </button>

          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161618] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Transferência</span>
          </button>

          <button
            onClick={() => setIsAddAccountOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161618] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202024] text-xs font-semibold rounded-2xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Manual</span>
          </button>
        </div>
      </div>

      {/* Connected Banks (Open Finance) Banner */}
      {bankConnections.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-[#161618] to-[#161618] border border-emerald-500/25 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Bancos Conectados (Open Finance)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ATIVO
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Saldos e extratos sincronizados diretamente com seu banco
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsConnectBankOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Conectar Outro Banco</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {bankConnections.map((conn) => {
              const isSyncingThis = syncingId === conn.id || isSyncingBank;
              return (
                <div
                  key={conn.id}
                  className="bg-white/50 dark:bg-[#1C1C20] border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                        {conn.institutionName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {conn.institutionName}
                        </h4>
                        <p className="text-[10px] text-emerald-400 font-medium">
                          Consentimento Ativo • Open Finance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-white/5">
                    <span className="text-slate-400">
                      {conn.lastSyncAt ? `Atualizado ${new Date(conn.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Conectado'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSyncBank(conn.id)}
                        disabled={isSyncingThis}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                        title="Sincronizar agora"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingThis ? 'animate-spin' : ''}`} />
                        <span>{isSyncingThis ? 'Sincronizando...' : 'Sincronizar'}</span>
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => handleDisconnectBank(conn.id, conn.institutionName)}
                        className="text-rose-400 hover:text-rose-300 font-medium hover:underline"
                        title="Desconectar banco"
                      >
                        Desconectar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Net Worth Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#161618] border border-white/5 p-6 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Saldo Líquido Imediato
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">
              {formatCurrency(availableBalance, user.hideValues)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Disponível em contas correntes e carteira
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#161618] border border-white/5 p-6 rounded-3xl text-white shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Patrimônio Líquido Consolidado
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1">
              {formatCurrency(totalNetWorth, user.hideValues)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Soma total de contas, investimentos e reservas
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
            <Landmark className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Accounts List Grid */}
      {accounts.length === 0 ? (
        <div className="bg-white dark:bg-[#161618] p-10 sm:p-12 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nenhuma conta bancária conectada
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Conecte sua conta bancária via Open Finance oficial ou cadastre manualmente para visualizar seus saldos e movimentações.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConnectBankOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Conectar Banco Real</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddAccountOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#202024] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#28282C] text-xs font-semibold rounded-2xl transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Manualmente</span>
            </button>
          </div>
        </div>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map(acc => {
          return (
            <div
              key={acc.id}
              className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs hover:border-white/10 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-950 font-bold shadow-xs bg-emerald-500"
                    >
                      <Building2 className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {acc.bank} • {getAccountTypeLabel(acc.type)}
                      </p>
                    </div>
                  </div>

                  {accounts.length > 1 && (
                    <button
                      onClick={() => deleteAccount(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                      title="Excluir conta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-100 dark:border-white/5">
                  <span className="text-[11px] font-semibold text-slate-400">Saldo Atual</span>
                  <p
                    className={`text-2xl font-bold mt-0.5 ${
                      acc.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(acc.balance, user.hideValues)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {acc.isIncludedInTotal ? 'Incluído na soma geral' : 'Oculto da soma geral'}
                </span>
                <button
                  onClick={() => {
                    setFromAcc(acc.id);
                    setIsTransferOpen(true);
                  }}
                  className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Transferir</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Internal Transfer Modal */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161618] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Transferência entre Contas
            </h3>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Origem</label>
                  <select
                    value={fromAcc}
                    onChange={e => setFromAcc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Destino</label>
                  <select
                    value={toAcc}
                    onChange={e => setToAcc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Transferência para reserva"
                  value={transferDesc}
                  onChange={e => setTransferDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-[#202024] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#28282C]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#161618] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Cadastrar Nova Conta ou Banco
            </h3>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Banco Inter, Poupança Caixa, Carteira"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                    <option value="cash">Dinheiro Físico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-[#202024] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#28282C]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Finance Connect Bank Modal */}
      <ConnectBankModal
        isOpen={isConnectBankOpen}
        onClose={() => setIsConnectBankOpen(false)}
      />
    </div>
  );
};

