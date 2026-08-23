import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { buildComprehensiveFinancialContext } from '../utils/aiFinancialContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAdvisorView: React.FC = () => {
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
    categories,
    selectedMonth,
  } = useFinance();

  const [aiDiagnosis, setAiDiagnosis] = useState<string>('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: `Olá ${user.name ? user.name.split(' ')[0] : ''}! Sou o Consultor Financeiro Inteligente do Vfinance. Analiso seus dados reais cadastrados (saldo, contas, transações, cartões, parcelas, contas fixas e metas) para responder suas dúvidas com total precisão. Como posso te ajudar hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Build full grounded context from current Supabase data
  const getFinancialContext = () =>
    buildComprehensiveFinancialContext({
      user,
      accounts,
      transactions,
      fixedBills,
      creditCards,
      cardPurchases,
      goals,
      debts,
      budgets,
      categories,
      selectedMonth,
    });

  const fetchDiagnosis = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialData: getFinancialContext() }),
      });
      const data = await res.json();
      if (data.advice) {
        setAiDiagnosis(data.advice);
      }
    } catch (e) {
      console.error('Erro ao buscar diagnóstico:', e);
      setAiDiagnosis(
        'Não foi possível conectar ao assistente de IA no momento. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    fetchDiagnosis();
  }, [selectedMonth]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          financialData: getFinancialContext(),
        }),
      });
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text:
          data.reply ||
          'Não consegui processar a resposta no momento. Por favor, tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error('Erro ao enviar mensagem para IA:', e);
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: 'Ocorreu uma falha de comunicação com o servidor. Por favor, tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const promptSuggestions = [
    'Quanto eu gastei este mês?',
    'Quanto tenho disponível?',
    'Quanto recebi este mês?',
    'Como estão minhas finanças?',
    'Quanto ainda tenho para pagar no cartão?',
    'Quanto vou gastar nos próximos meses?',
    'Quanto gastei com alimentação?',
    'Posso comprar algo de R$ 500?',
    'Estou gastando demais?'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Assistente IA Vfinance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gemini Powered
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Diagnósticos inteligentes, sugestões de economia e consultoria financeira personalizada
          </p>
        </div>

        <button
          onClick={fetchDiagnosis}
          disabled={isDiagnosing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161618] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202024] transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isDiagnosing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Atualizar Diagnóstico</span>
        </button>
      </div>

      {/* Diagnosis Card */}
      <div className="bg-[#161618] border border-white/5 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-base font-bold text-emerald-400">
              Diagnóstico de Saúde Financeira
            </h3>
            {isDiagnosing ? (
              <div className="space-y-2 py-2">
                <div className="h-4 bg-white/10 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-full" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {aiDiagnosis || 'Carregando diagnóstico financeiro...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white dark:bg-[#161618] rounded-3xl border border-slate-200/80 dark:border-white/5 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Consultoria Vfinance
              </p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online & Conectado aos seus dados
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-xs shadow-xs'
                    : 'bg-slate-100 dark:bg-[#202024] text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/50 dark:border-white/5'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>
                <span
                  className={`block text-[9px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-slate-950/70' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-start gap-2">
              <div className="p-3 bg-slate-100 dark:bg-[#202024] rounded-2xl flex items-center gap-1.5 border border-slate-200/50 dark:border-white/5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce delay-200" />
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar flex gap-2">
          {promptSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="px-3 py-1 bg-slate-50 dark:bg-[#202024] hover:bg-slate-100 dark:hover:bg-[#28282C] text-slate-600 dark:text-slate-300 text-xs rounded-full whitespace-nowrap transition-colors border border-slate-200/60 dark:border-white/10 flex items-center gap-1 shrink-0"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>{s}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#161618]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Pergunte sobre seus gastos, dívidas ou metas..."
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-[#202024] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-2xl shadow-md shadow-emerald-500/20 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
