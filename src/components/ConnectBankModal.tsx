import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  FlaskConical,
  KeyRound,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { PluggyConnect } from 'react-pluggy-connect';
import { useFinance } from '../context/FinanceContext';

interface InstitutionOption {
  id: string;
  name: string;
  code: string;
  connectorId?: number;
  color: string;
  bgColor: string;
  badge?: string;
  popular?: boolean;
  isSandbox?: boolean;
}

const POPULAR_INSTITUTIONS: InstitutionOption[] = [
  { id: 'nubank', name: 'Nubank', code: '260', connectorId: 260, color: '#820AD1', bgColor: 'rgba(130, 10, 209, 0.15)', popular: true },
  { id: 'itau', name: 'Itaú Unibanco', code: '341', connectorId: 341, color: '#EC7000', bgColor: 'rgba(236, 112, 0, 0.15)', popular: true },
  { id: 'bradesco', name: 'Banco Bradesco', code: '237', connectorId: 237, color: '#CC092F', bgColor: 'rgba(204, 9, 47, 0.15)', popular: true },
  { id: 'santander', name: 'Banco Santander', code: '033', connectorId: 33, color: '#EA1D25', bgColor: 'rgba(234, 29, 37, 0.15)', popular: true },
  { id: 'bb', name: 'Banco do Brasil', code: '001', connectorId: 1, color: '#FCDE00', bgColor: 'rgba(252, 222, 0, 0.15)', popular: true },
  { id: 'inter', name: 'Banco Inter', code: '077', connectorId: 77, color: '#FF7A00', bgColor: 'rgba(255, 122, 0, 0.15)', popular: true },
  { id: 'c6', name: 'C6 Bank', code: '336', connectorId: 336, color: '#242424', bgColor: 'rgba(255, 255, 255, 0.1)', popular: true },
  { id: 'caixa', name: 'Caixa Econômica', code: '104', connectorId: 104, color: '#0066B3', bgColor: 'rgba(0, 102, 179, 0.15)', popular: true },
  { id: 'btg', name: 'BTG Pactual', code: '208', connectorId: 208, color: '#1B365D', bgColor: 'rgba(27, 54, 93, 0.2)' },
  { id: 'xp', name: 'XP Investimentos', code: '102', connectorId: 102, color: '#000000', bgColor: 'rgba(255, 255, 255, 0.1)' },
  { id: 'sicoob', name: 'Sicoob', code: '756', connectorId: 756, color: '#003641', bgColor: 'rgba(0, 54, 65, 0.2)' },
  { id: 'sicredi', name: 'Sicredi', code: '748', connectorId: 748, color: '#008542', bgColor: 'rgba(0, 133, 66, 0.15)' },
  { id: '201', name: 'Pluggy Sandbox Test Bank', code: '201', connectorId: 201, color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', badge: 'SANDBOX', isSandbox: true, popular: true },
];

interface PluggyDiagnostics {
  isConfigured: boolean;
  maskedId: string | null;
  maskedSecret: string | null;
  authStatus: string;
  authStatusCode: number;
  authMessage: string;
  connectTokenGenerated: boolean;
  connectTokenPreview: string;
  sandboxReady: boolean;
  mode: string;
}

interface ConnectBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'select' | 'consent' | 'requesting_token' | 'pluggy_widget' | 'syncing' | 'success';

export const ConnectBankModal: React.FC<ConnectBankModalProps> = ({ isOpen, onClose }) => {
  const { connectBank, isSyncingBank, authUser } = useFinance();

  const [step, setStep] = useState<ModalStep>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<InstitutionOption | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [syncDetails, setSyncDetails] = useState<{
    institutionName: string;
    accountsCount?: number;
    cardsCount?: number;
    transactionsCount?: number;
  } | null>(null);

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<PluggyDiagnostics | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);
  const [showDiagPanel, setShowDiagPanel] = useState(false);

  const fetchDiagnostics = async () => {
    setIsLoadingDiag(true);
    try {
      const res = await fetch('/api/pluggy/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch (e) {
      console.warn('Failed to fetch Pluggy diagnostics:', e);
    } finally {
      setIsLoadingDiag(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSearchQuery('');
      setSelectedBank(null);
      setErrorMessage(null);
      setStatusMessage('');
      setConnectToken(null);
      setSyncDetails(null);
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredInstitutions = POPULAR_INSTITUTIONS.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.code.includes(searchQuery)
  );

  const handleSelectBank = (bank: InstitutionOption) => {
    setSelectedBank(bank);
    setErrorMessage(null);
    setStep('consent');
  };

  const handleOpenAllInstitutions = () => {
    setSelectedBank(null);
    setErrorMessage(null);
    setStep('consent');
  };

  const handleStartConnection = async () => {
    setStep('requesting_token');
    setErrorMessage(null);
    setStatusMessage('Solicitando token seguro de conexão ao backend Pluggy...');

    try {
      // 1. Request Connect Token from server
      let res = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientUserId: authUser?.id,
          connectorId: selectedBank?.connectorId,
          oauthRedirectUri: window.location.origin,
        }),
      });

      if (!res.ok) {
        res = await fetch('/api/open-finance/connect-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientUserId: authUser?.id,
            connectorId: selectedBank?.connectorId,
            oauthRedirectUri: window.location.origin,
          }),
        });
      }

      const tokenData = await res.json();

      if (!tokenData?.connectToken && !tokenData?.accessToken) {
        throw new Error(tokenData?.error || 'Não foi possível gerar o token do Pluggy.');
      }

      const token = tokenData.connectToken || tokenData.accessToken;
      setConnectToken(token);

      // If sandbox fallback or simulation token
      if (tokenData.sandbox || String(token).startsWith('sandbox_token_')) {
        // Direct sandbox sync
        setStep('syncing');
        setStatusMessage('Sincronizando dados simulados de Open Finance...');
        const result = await connectBank(
          String(selectedBank?.connectorId || 201),
          selectedBank?.name || 'Pluggy Sandbox Test Bank'
        );

        if (result.success) {
          setSyncDetails({
            institutionName: selectedBank?.name || 'Pluggy Sandbox Test Bank',
            accountsCount: 2,
            cardsCount: 1,
            transactionsCount: 6,
          });
          setStep('success');
          setStatusMessage(result.message);
        } else {
          setStep('consent');
          setErrorMessage(result.message || 'Erro ao sincronizar.');
        }
        return;
      }

      // Real Pluggy Connect widget flow
      setStep('pluggy_widget');
    } catch (err: any) {
      console.error('Error starting connection:', err);
      setStep('consent');
      setErrorMessage(err.message || 'Falha ao inicializar o widget da Pluggy.');
    }
  };

  const handlePluggySuccess = async (data: any) => {
    const item = data?.item;
    const itemId = item?.id;
    const institutionName = item?.connector?.name || selectedBank?.name || 'Instituição Conectada';
    const connectorId = String(item?.connector?.id || selectedBank?.connectorId || '0');

    setStep('syncing');
    setStatusMessage(`Importando contas, saldos e movimentações reais de ${institutionName}...`);

    try {
      const result = await connectBank(connectorId, institutionName, itemId);

      if (result.success) {
        setSyncDetails({
          institutionName,
          accountsCount: result.data?.accounts?.length || 1,
          cardsCount: result.data?.cards?.length || 0,
          transactionsCount: result.data?.accounts?.[0]?.transactions?.length || 0,
        });
        setStep('success');
        setStatusMessage(result.message);
      } else {
        setStep('consent');
        setErrorMessage(result.message || 'Erro ao salvar os dados sincronizados.');
      }
    } catch (err: any) {
      setStep('consent');
      setErrorMessage(err.message || 'Falha na sincronização pós-conexão.');
    }
  };

  const handlePluggyError = (error: any) => {
    console.error('Pluggy Connect Error:', error);
    setStep('consent');
    setErrorMessage(
      typeof error === 'string'
        ? error
        : error?.message || 'A conexão foi interrompida ou não autorizada pelo banco.'
    );
  };

  const handlePluggyClose = () => {
    if (step === 'pluggy_widget') {
      setStep('select');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="connect-bank-modal"
        className={`bg-white dark:bg-[#161618] w-full rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 relative flex flex-col transition-all duration-300 ${
          step === 'pluggy_widget'
            ? 'max-w-2xl h-[90vh]'
            : 'max-w-lg max-h-[90vh]'
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Conexão Bancária Pluggy
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  OPEN FINANCE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronização oficial em tempo real (Modo Leitura)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSyncingBank || step === 'syncing'}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: Select Bank */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Primary Connect All Button */}
              <button
                type="button"
                onClick={handleOpenAllInstitutions}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-950">Conectar via Pluggy Open Finance</p>
                    <p className="text-[11px] text-slate-900/80 font-medium">
                      Abre o widget com todas as instituições do Brasil
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Status da Integração & Secrets Accordion */}
              <div className="bg-slate-50 dark:bg-[#1E1E22] border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowDiagPanel(!showDiagPanel)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Status das Chaves Pluggy no Servidor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {diagnostics?.authStatus === 'SUCCESS' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                        Pluggy Live Ativo
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                        Modo Sandbox / Secrets
                      </span>
                    )}
                    {showDiagPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {showDiagPanel && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>PLUGGY_CLIENT_ID:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {diagnostics?.maskedId || 'Não configurado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PLUGGY_CLIENT_SECRET:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {diagnostics?.maskedSecret || 'Não configurado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status da Autenticação:</span>
                      <span
                        className={`font-semibold ${
                          diagnostics?.authStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {diagnostics?.authMessage || (isLoadingDiag ? 'Verificando...' : 'Pronto para uso')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDiagnostics}
                      disabled={isLoadingDiag}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-1 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingDiag ? 'animate-spin' : ''}`} />
                      <span>Revalidar credenciais Pluggy</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Security info */}
              <div className="bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/5 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Conexão Regulamentada Open Finance Brasil
                  </p>
                  <p>
                    O acesso é 100% criptografado e estritamente em modo leitura. Nenhuma movimentação bancária pode ser feita sem sua autorização direta.
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar banco (Nubank, Itaú, Inter, Bradesco, Santander...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Grid of Banks */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Instituições Frequentes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredInstitutions.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => handleSelectBank(inst)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-left group transition-all cursor-pointer ${
                        inst.isSandbox
                          ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#202024] hover:border-emerald-500/50 hover:bg-emerald-500/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs"
                          style={{ backgroundColor: inst.color }}
                        >
                          {inst.isSandbox ? <FlaskConical className="w-4 h-4" /> : inst.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors">
                              {inst.name}
                            </p>
                            {inst.badge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                                {inst.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Cód. {inst.code}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Consent & Permissions */}
          {step === 'consent' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md"
                  style={{ backgroundColor: selectedBank?.color || '#10B981' }}
                >
                  {selectedBank?.isSandbox ? (
                    <FlaskConical className="w-6 h-6" />
                  ) : selectedBank ? (
                    selectedBank.name.charAt(0)
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedBank ? selectedBank.name : 'Pluggy Open Finance Brasil'}
                    </h4>
                    {selectedBank?.isSandbox && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                        Modo Sandbox
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pronto para conectar via Pluggy Connect Widget
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Dados compartilhados em modo leitura:
                </h5>

                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Saldo em Conta:</strong> Leitura em tempo real para atualizar o saldo disponível do Vfinance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Extrato & PIX:</strong> Importação das movimentações para alimentar relatórios e IA.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Cartões de Crédito:</strong> Limites, faturas e parcelas futuras.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Segurança Total:</strong> Sem autorização para pagamentos ou movimentações financeiras.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Consentimento seguro gerenciado pelo Banco Central e Open Finance Brasil.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Requesting Token */}
          {step === 'requesting_token' && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Gerando Sessão Segura
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {statusMessage || 'Solicitando Connect Token à Pluggy...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Pluggy Connect Widget (Live Iframe Component) */}
          {step === 'pluggy_widget' && connectToken && (
            <div className="w-full h-full min-h-[500px] flex flex-col rounded-2xl overflow-hidden animate-in fade-in">
              <PluggyConnect
                connectToken={connectToken}
                includeSandbox={true}
                selectedConnectorId={selectedBank?.connectorId}
                onSuccess={handlePluggySuccess}
                onError={handlePluggyError}
                onClose={handlePluggyClose}
              />
            </div>
          )}

          {/* STEP 5: Syncing Data */}
          {step === 'syncing' && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Sincronizando Dados Bancários
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {statusMessage || 'Importando contas, saldos e movimentações...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 6: Success */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Conexão Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sua conta de <strong className="text-emerald-400">{syncDetails?.institutionName || selectedBank?.name || 'sua instituição'}</strong> foi vinculada. O Saldo Disponível, Cartões e Movimentações foram atualizados.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-left space-y-2 text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Instituição Conectada:</span>
                  <span className="text-white font-bold">{syncDetails?.institutionName || selectedBank?.name || 'Banco'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Contas Importadas:</span>
                  <span className="text-emerald-400 font-bold">{syncDetails?.accountsCount || 1} conta(s)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status do Consentimento:</span>
                  <span className="text-emerald-400 font-bold">ATIVO (Open Finance)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>IA Consultora:</span>
                  <span className="text-white font-bold">Alimentada com dados reais</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'pluggy_widget' && (
          <div className="p-5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0">
            {step === 'select' && (
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#28282C] text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            )}

            {step === 'consent' && (
              <>
                <button
                  onClick={() => setStep('select')}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#28282C] text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={handleStartConnection}
                  disabled={isSyncingBank}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Autorizar e Conectar</span>
                </button>
              </>
            )}

            {step === 'success' && (
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Ver Contas e Saldos Conectados
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
