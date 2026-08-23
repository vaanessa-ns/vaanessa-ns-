import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Wallet,
  CreditCard,
  Target,
  Users,
  User,
  HeartHandshake
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { user, updateUserProfile } = useFinance();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(user.monthlyIncome ? String(user.monthlyIncome) : '');
  const [financialStyle, setFinancialStyle] = useState<'individual' | 'couple' | 'family'>(user.financialStyle || 'individual');
  const [primaryGoal, setPrimaryGoal] = useState(user.primaryGoal || '');
  const [hasCreditCard, setHasCreditCard] = useState(user.hasCreditCard);
  const [hasInstallments, setHasInstallments] = useState(user.hasInstallments);

  if (!isOpen) return null;

  const handleFinish = () => {
    updateUserProfile({
      name,
      monthlyIncome: parseFloat(monthlyIncome.replace(',', '.')) || 0,
      financialStyle,
      primaryGoal,
      hasCreditCard,
      hasInstallments,
      onboarded: true,
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#161618] w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 overflow-hidden">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-emerald-500'
                    : s < step
                    ? 'w-4 bg-emerald-400/60'
                    : 'w-4 bg-slate-200 dark:bg-[#202024]'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Passo {step} de 4
          </span>
        </div>

        {/* Step 1: Welcome & Name */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Bem-vindo ao Vfinance!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                "Entenda seu dinheiro. Controle seus gastos. Conquiste seus planos."
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Como gostaria de ser chamado(a)?
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Como você deseja controlar suas finanças?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFinancialStyle('individual')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    financialStyle === 'individual'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#202024]'
                  }`}
                >
                  <User className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Individual</p>
                    <p className="text-[11px] text-slate-400">Minhas finanças pessoais</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFinancialStyle('couple')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                    financialStyle === 'couple'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#202024]'
                  }`}
                >
                  <HeartHandshake className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Casal / Conjunto</p>
                    <p className="text-[11px] text-slate-400">Finanças compartilhadas</p>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>Continuar</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Income */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Qual é a sua renda mensal estimada?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Isso nos ajudará a calcular sua margem de economia e limites recomendados.
              </p>
            </div>

            <div className="pt-2">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  value={monthlyIncome}
                  onChange={e => setMonthlyIncome(e.target.value)}
                  placeholder="4.500,00"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#202024] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Com base na regra financeira 50/30/20:
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• <strong className="text-slate-200">50% (R$ {(parseFloat(monthlyIncome || '0') * 0.5).toFixed(0)})</strong> para gastos essenciais</li>
                <li>• <strong className="text-slate-200">30% (R$ {(parseFloat(monthlyIncome || '0') * 0.3).toFixed(0)})</strong> para estilo de vida</li>
                <li>• <strong className="text-slate-200">20% (R$ {(parseFloat(monthlyIncome || '0') * 0.2).toFixed(0)})</strong> para poupança e metas</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202024]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Cards & Installments */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Cartões e Parcelamentos
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Você utiliza cartão de crédito no seu dia a dia?
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Possui cartão de crédito?
                  </p>
                  <p className="text-xs text-slate-400">Nubank, Itaú, XP, Bradesco, etc.</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasCreditCard}
                  onChange={e => setHasCreditCard(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Possui compras ou contas parceladas?
                  </p>
                  <p className="text-xs text-slate-400">Aparelhos, passagens, cursos, etc.</p>
                </div>
                <input
                  type="checkbox"
                  checked={hasInstallments}
                  onChange={e => setHasInstallments(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202024]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Goals & Finish */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Qual é o seu principal objetivo financeiro?
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ter clareza do seu foco é o primeiro passo para o sucesso.
              </p>
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={primaryGoal}
                onChange={e => setPrimaryGoal(e.target.value)}
                placeholder="Ex: Fazer uma viagem, Criar reserva de emergência"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-300">
                Seu painel financeiro já foi pré-configurado com dados de exemplo realistas para você explorar e personalizar!
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202024]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <span>Acessar Meu Dashboard</span>
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
