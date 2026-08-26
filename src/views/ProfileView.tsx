import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Lock,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Database,
  LogIn,
  LogOut,
  Cloud
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { exportToCSV, exportToJSON } from '../utils/formatters';

export const ProfileView: React.FC = () => {
  const {
    user,
    updateUserProfile,
    resetAllData,
    transactions,
    fixedBills,
    creditCards,
    goals,
    debts,
    accounts,
    budgets,
    setIsAuthModalOpen,
    isSyncing,
    refreshData,
  } = useFinance();

  const { user: authUser, signOut, isConfigured } = useAuth();

  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user.monthlyIncome ? String(user.monthlyIncome) : '');
  const [financialStyle, setFinancialStyle] = useState(user.financialStyle || 'individual');
  const [primaryGoal, setPrimaryGoal] = useState(user.primaryGoal || '');

  // PIN settings
  const [isPinEnabled, setIsPinEnabled] = useState(user.isPinEnabled);
  const [newPin, setNewPin] = useState(user.pinCode || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setName(user.name || '');
    setEmail(user.email || '');
    setMonthlyIncome(user.monthlyIncome ? String(user.monthlyIncome) : '');
    setFinancialStyle(user.financialStyle || 'individual');
    setPrimaryGoal(user.primaryGoal || '');
    setIsPinEnabled(user.isPinEnabled);
    if (user.pinCode) setNewPin(user.pinCode);
  }, [user]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      email,
      monthlyIncome: parseFloat(monthlyIncome.replace(',', '.')) || 0,
      financialStyle: financialStyle as any,
      primaryGoal,
      isPinEnabled,
      pinCode: newPin,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportFullJSON = () => {
    const fullBackup = {
      exportedAt: new Date().toISOString(),
      user,
      transactions,
      fixedBills,
      creditCards,
      goals,
      debts,
      accounts,
      budgets,
    };
    exportToJSON(`vfinance_backup_completo_${new Date().toISOString().split('T')[0]}`, fullBackup);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Perfil, Segurança & Configurações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Personalize seu perfil, ative proteção por senha e gerencie seus backups
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-2xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configurações salvas!</span>
          </div>
        )}
      </div>

      {/* Supabase Cloud Account Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-teal-950/40 p-6 rounded-3xl border border-emerald-500/20 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Sincronização em Nuvem (Supabase)
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  authUser
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {authUser ? 'Conectado' : 'Modo Convidado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {authUser
                  ? `Sessão ativa com o e-mail: ${authUser.email}`
                  : 'Faça login ou cadastre-se para manter seus dados seguros em nuvem'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authUser ? (
              <>
                <button
                  type="button"
                  onClick={() => refreshData()}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar ou Criar Conta</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          <span>Informações Pessoais</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Renda Mensal Base (R$)</label>
            <input
              type="text"
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Estilo de Gestão</label>
            <select
              value={financialStyle}
              onChange={e => setFinancialStyle(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="individual">Individual (Finanças Pessoais)</option>
              <option value="couple">Casal / Familiar (Conjunta)</option>
              <option value="family">Família</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Principal Objetivo Financeiro</label>
          <input
            type="text"
            value={primaryGoal}
            onChange={e => setPrimaryGoal(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            Salvar Alterações
          </button>
        </div>
      </form>

      {/* Theme & Appearance Settings */}
      <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-5 h-5 text-emerald-400" />
          <span>Aparência & Tema</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Escolha entre o modo escuro para conforto visual ou modo claro para alta luminosidade.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => updateUserProfile({ themeMode: 'dark' })}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
              user.themeMode === 'dark'
                ? 'bg-slate-900 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-[#202024] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-500/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Modo Escuro (Dark)</p>
              <p className="text-[11px] text-slate-400">Fundo escuro, ideal para ambientes com pouca luz</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateUserProfile({ themeMode: 'light' })}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
              user.themeMode === 'light'
                ? 'bg-white text-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-[#202024] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-500/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-amber-500 shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Modo Claro (Light)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Fundo limpo e cards brancos</p>
            </div>
          </button>
        </div>
      </div>

      {/* Security & PIN Settings */}
      <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>Segurança & Bloqueio por PIN</span>
        </h2>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10">
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Exigir PIN de 4 dígitos ao abrir o app
            </p>
            <p className="text-[11px] text-slate-400">
              Protege seus dados e saldos caso outra pessoa acesse seu dispositivo
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPinEnabled}
              onChange={e => {
                const checked = e.target.checked;
                setIsPinEnabled(checked);
                updateUserProfile({ isPinEnabled: checked });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-[#28282C] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>

        {isPinEnabled && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Código PIN (4 dígitos numéricos)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-32 px-4 py-2 bg-white dark:bg-[#161618] border border-slate-200 dark:border-white/10 rounded-xl text-center text-lg tracking-widest font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  updateUserProfile({ pinCode: newPin });
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2000);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Atualizar PIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backup & Export */}
      <div className="bg-white dark:bg-[#161618] p-6 rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-400" />
          <span>Backup & Exportação de Dados</span>
        </h2>

        <p className="text-xs text-slate-400">
          Você tem total controle sobre seus dados. Exporte seus registros em formato compatível com planilhas Excel/Google Sheets ou faça um backup completo em JSON.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportFullJSON}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#202024] text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Backup Completo (JSON)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#202024] text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Imprimir / Gerar PDF do Extrato</span>
          </button>
        </div>
      </div>

      {/* Reset & Danger Zone */}
      <div className="bg-rose-50/40 dark:bg-rose-500/5 p-6 rounded-3xl border border-rose-200 dark:border-rose-500/20 space-y-4">
        <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Gerenciamento de Dados</span>
        </h2>

        <p className="text-xs text-slate-400">
          Precisa reiniciar suas movimentações ou restaurar os dados de demonstração do sistema?
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Deseja restaurar os dados de exemplo do Vfinance?')) {
                resetAllData();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#161618] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Restaurar Dados de Exemplo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
