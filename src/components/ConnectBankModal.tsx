import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Shield,
  FlaskConical,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface InstitutionOption {
  id: string;
  name: string;
  code: string;
  color: string;
  bgColor: string;
  badge?: string;
  popular?: boolean;
  isSandbox?: boolean;
}

const POPULAR_INSTITUTIONS: InstitutionOption[] = [
  { id: '201', name: 'Pluggy Sandbox Test Bank', code: '201', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', badge: 'SANDBOX', isSandbox: true, popular: true },
  { id: 'nubank', name: 'Nubank', code: '260', color: '#820AD1', bgColor: 'rgba(130, 10, 209, 0.15)', popular: true },
  { id: 'itau', name: 'Itaú Unibanco', code: '341', color: '#EC7000', bgColor: 'rgba(236, 112, 0, 0.15)', popular: true },
  { id: 'bradesco', name: 'Banco Bradesco', code: '237', color: '#CC092F', bgColor: 'rgba(204, 9, 47, 0.15)', popular: true },
  { id: 'santander', name: 'Banco Santander', code: '033', color: '#EA1D25', bgColor: 'rgba(234, 29, 37, 0.15)', popular: true },
  { id: 'bb', name: 'Banco do Brasil', code: '001', color: '#FCDE00', bgColor: 'rgba(252, 222, 0, 0.15)', popular: true },
  { id: 'inter', name: 'Banco Inter', code: '077', color: '#FF7A00', bgColor: 'rgba(255, 122, 0, 0.15)', popular: true },
  { id: 'c6', name: 'C6 Bank', code: '336', color: '#242424', bgColor: 'rgba(255, 255, 255, 0.1)', popular: true },
  { id: 'caixa', name: 'Caixa Econômica', code: '104', color: '#0066B3', bgColor: 'rgba(0, 102, 179, 0.15)', popular: true },
  { id: 'btg', name: 'BTG Pactual', code: '208', color: '#1B365D', bgColor: 'rgba(27, 54, 93, 0.2)' },
  { id: 'xp', name: 'XP Investimentos', code: '102', color: '#000000', bgColor: 'rgba(255, 255, 255, 0.1)' },
  { id: 'sicredi', name: 'Sicredi', code: '748', color: '#008542', bgColor: 'rgba(0, 133, 66, 0.15)' },
  { id: 'sicoob', name: 'Sicoob', code: '756', color: '#003641', bgColor: 'rgba(0, 54, 65, 0.2)' },
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

export const ConnectBankModal: React.FC<ConnectBankModalProps> = ({ isOpen, onClose }) => {
  const { connectBank, isSyncingBank } = useFinance();

  const [step, setStep] = useState<'select' | 'consent' | 'connecting' | 'success'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<InstitutionOption | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<PluggyDiagnostics | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);
  const [showDiagPanel, setShowDiagPanel] = useState(false);

  const fetchDiagnostics = async () => {
    setIsLoadingDiag(true);
    try {
      const res = await fetch('/api/open-finance/diagnostics');
      const data = await res.json();
      setDiagnostics(data);
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
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredInstitutions = POPULAR_INSTITUTIONS.filter(inst =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.code.includes(searchQuery)
  );

  const handleSelectBank = (bank: InstitutionOption) => {
    setSelectedBank(bank);
    setCustomBankName(bank.name);
    setErrorMessage(null);
    setStep('consent');
  };

  const handleQuickSandboxTest = () => {
    const sandboxBank = POPULAR_INSTITUTIONS.find(i => i.isSandbox) || POPULAR_INSTITUTIONS[0];
    handleSelectBank(sandboxBank);
  };

  const handleConfirmConsent = async () => {
    if (!selectedBank) return;
    setStep('connecting');
    setErrorMessage(null);
    setStatusMessage(`Estabelecendo canal seguro com ${selectedBank.name} via Open Finance / Pluggy...`);

    const result = await connectBank(selectedBank.id, selectedBank.name);

    if (result.success) {
      setStep('success');
      setStatusMessage(result.message);
    } else {
      setStep('consent');
      setErrorMessage(result.message || 'Erro ao conectar. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="connect-bank-modal"
        className="bg-white dark:bg-[#161618] w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/10 relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
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
                Sincronização oficial em modo leitura
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSyncingBank}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content based on Step */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
          {/* STEP 1: Select Bank */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Sandbox Quick Connect Action (No real bank needed) */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <FlaskConical className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Teste em Modo Sandbox
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                    SEM CONTA REAL
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Teste o fluxo completo do Pluggy instantaneamente: importa contas corrente e poupança, faturas de cartão de crédito e extrato com movimentações reais simuladas.
                </p>
                <button
                  type="button"
                  onClick={handleQuickSandboxTest}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Testar Agora com Pluggy Sandbox</span>
                </button>
              </div>

              {/* Status da Integração & Secrets Accordion */}
              <div className="bg-slate-50 dark:bg-[#1E1E22] border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowDiagPanel(!showDiagPanel)}
                  className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Status das Chaves Pluggy nos Secrets</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {diagnostics?.isConfigured ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                        Configurado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                        Aguardando Secrets
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
                        {diagnostics?.maskedId || 'Não detectado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>PLUGGY_CLIENT_SECRET:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {diagnostics?.maskedSecret || 'Não detectado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status da Autenticação:</span>
                      <span className={`font-semibold ${diagnostics?.authStatus === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {diagnostics?.authMessage || (isLoadingDiag ? 'Verificando...' : 'Pronto para uso')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Modo de Operação:</span>
                      <span className="font-bold text-emerald-400">
                        Sandbox Ativo (Sem risco)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={fetchDiagnostics}
                      disabled={isLoadingDiag}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingDiag ? 'animate-spin' : ''}`} />
                      <span>Revalidar credenciais da API</span>
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
                  placeholder="Buscar seu banco (Nubank, Itaú, Inter, Bradesco, Sandbox...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Grid of Banks */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Instituições Suportadas
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
          {step === 'consent' && selectedBank && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md"
                  style={{ backgroundColor: selectedBank.color }}
                >
                  {selectedBank.isSandbox ? <FlaskConical className="w-6 h-6" /> : selectedBank.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedBank.name}
                    </h4>
                    {selectedBank.isSandbox && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400">
                        Modo Sandbox
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pronto para sincronizar via Pluggy Open Finance
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
                  Termo de Consentimento e Dados Compartilhados:
                </h5>

                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Saldo em Conta:</strong> Leitura do saldo em tempo real para atualizar o "Saldo Disponível".
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Extrato & PIX:</strong> Importação das movimentações de receitas e despesas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Cartões de Crédito:</strong> Leitura de limites e faturas em aberto.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>
                      <strong className="text-slate-900 dark:text-white">Segurança Total:</strong> Sem permissão para realizar pagamentos ou transferências.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Consentimento válido por 12 meses. Você pode revogar ou desconectar a qualquer momento.
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Connecting Loader */}
          {step === 'connecting' && (
            <div className="py-12 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Sincronizando com {selectedBank?.name}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {statusMessage || 'Validando consentimento e importando saldos e transações...'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Conexão Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sua conta do <strong className="text-emerald-400">{selectedBank?.name}</strong> foi vinculada. O Saldo Disponível, Cartões e Movimentações foram atualizados com os dados.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-left space-y-2 text-slate-300">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status do Consentimento:</span>
                  <span className="text-emerald-400 font-bold">ATIVO</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Provedor:</span>
                  <span className="text-white font-bold">Pluggy Open Finance</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Modo:</span>
                  <span className="text-emerald-400 font-bold">{selectedBank?.isSandbox ? 'Sandbox (Testes)' : 'Open Finance Leitura'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Sincronização:</span>
                  <span className="text-white font-bold">Em Tempo Real</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          {step === 'select' && (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#28282C] text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          )}

          {step === 'consent' && (
            <>
              <button
                onClick={() => setStep('select')}
                className="py-2.5 px-4 bg-slate-100 dark:bg-[#202024] hover:bg-slate-200 dark:hover:bg-[#28282C] text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmConsent}
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
      </div>
    </div>
  );
};
