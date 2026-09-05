import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

function formatBRL(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateStrictRealDataDiagnosis(data: any): string {
  if (!data || !data.summary || !data.summary.hasAnyData) {
    return 'Você ainda não possui dados financeiros registrados no Vfinance. Cadastre suas contas bancárias, receitas e despesas para que eu possa gerar diagnósticos precisos e consultorias personalizadas.';
  }

  const period = data.periodLabel || 'este mês';
  const {
    availableBalance = 0,
    monthIncomes = 0,
    monthExpenses = 0,
    monthRemaining = 0,
    monthSavingsRate = 0,
    totalCreditCardUsed = 0,
    totalDebtsRemaining = 0,
    pendingFixedBillsTotal = 0,
  } = data.summary || {};

  const lines: string[] = [];
  lines.push(`📊 **Diagnóstico Financeiro (${period})**`);
  lines.push(`• **Saldo Disponível em Contas:** ${formatBRL(availableBalance)}`);
  lines.push(`• **Receitas Recebidas:** ${formatBRL(monthIncomes)}`);
  lines.push(`• **Despesas Pagas:** ${formatBRL(monthExpenses)}`);
  lines.push(`• **Saldo Restante do Mês:** ${formatBRL(monthRemaining)} (Taxa de Poupança: ${monthSavingsRate}%)`);

  if (data.categorySpendingThisMonth && Object.keys(data.categorySpendingThisMonth).length > 0) {
    const topCats = Object.entries(data.categorySpendingThisMonth)
      .map(([cat, amount]) => ({ cat, amount: Number(amount) || 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const catStr = topCats.map((c) => `${c.cat}: ${formatBRL(c.amount)}`).join(', ');
    lines.push(`\n🏷️ **Principais Gastos por Categoria:** ${catStr}`);
  }

  const alerts: string[] = [];
  if (monthExpenses > monthIncomes && monthIncomes > 0) {
    alerts.push(`Suas despesas (${formatBRL(monthExpenses)}) superaram suas receitas (${formatBRL(monthIncomes)}) neste mês.`);
  }
  if (pendingFixedBillsTotal > 0) {
    alerts.push(`Você possui ${formatBRL(pendingFixedBillsTotal)} em contas fixas pendentes de pagamento este mês.`);
  }
  if (totalCreditCardUsed > 0) {
    alerts.push(`Compromissos em faturas e parcelas de cartão somam ${formatBRL(totalCreditCardUsed)}.`);
  }
  if (totalDebtsRemaining > 0) {
    alerts.push(`O saldo devedor de dívidas em aberto totaliza ${formatBRL(totalDebtsRemaining)}.`);
  }

  if (alerts.length > 0) {
    lines.push(`\n⚠️ **Pontos de Atenção:**\n` + alerts.map((a) => `• ${a}`).join('\n'));
  }

  if (Array.isArray(data.goals) && data.goals.length > 0) {
    const goalsSummary = data.goals
      .map((g: any) => `${g.name} (${formatBRL(g.currentAmount)} de ${formatBRL(g.targetAmount)} - ${g.progressPercentage}%)`)
      .join('; ');
    lines.push(`\n🎯 **Metas em Andamento:** ${goalsSummary}`);
  }

  return lines.join('\n');
}

function getStrictRealDataReply(message: string, data: any): string {
  const lower = (message || '').toLowerCase().trim();
  const period = data?.periodLabel || 'este mês';
  const summary = data?.summary || {};
  const {
    availableBalance = 0,
    monthIncomes = 0,
    monthExpenses = 0,
    monthRemaining = 0,
    totalCreditCardUsed = 0,
    totalCreditCardLimit = 0,
    totalDebtsRemaining = 0,
    pendingFixedBillsTotal = 0,
  } = summary;

  if (!data || !summary.hasAnyData) {
    return `Olá! Não encontrei registros de movimentações ou contas no seu perfil do Vfinance para ${period}. Para que eu possa te responder com precisão, adicione suas receitas, despesas e contas bancárias na plataforma.`;
  }

  if (lower.includes('gastei este mês') || lower.includes('gastei este mes') || lower.includes('quanto gastei') || (lower.includes('total') && lower.includes('gastos'))) {
    if (monthExpenses === 0) {
      return `Em ${period}, você não possui nenhuma despesa registrada como paga no Vfinance (total: ${formatBRL(0)}).`;
    }
    let topCategoriesStr = '';
    if (data.categorySpendingThisMonth && Object.keys(data.categorySpendingThisMonth).length > 0) {
      const topCats = Object.entries(data.categorySpendingThisMonth)
        .map(([cat, amt]) => ({ cat, amt: Number(amt) || 0 }))
        .sort((a, b) => b.amt - a.amt);
      topCategoriesStr = `\n\nDetalhamento por categoria:\n` + topCats.map((c) => `• **${c.cat}**: ${formatBRL(c.amt)}`).join('\n');
    }
    return `Em ${period}, você gastou o total de **${formatBRL(monthExpenses)}** em despesas pagas.${topCategoriesStr}`;
  }

  if (lower.includes('disponível') || lower.includes('disponivel') || lower.includes('saldo') || lower.includes('tenho na conta')) {
    let accountsStr = '';
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      accountsStr = `\n\nDistribuição por conta bancária:\n` + data.accounts.map((a: any) => `• **${a.name}** (${a.bank}): ${formatBRL(a.balance)}`).join('\n');
    }
    return `Seu saldo total disponível em contas bancárias cadastradas é de **${formatBRL(availableBalance)}**.${accountsStr}`;
  }

  if (lower.includes('recebi') || lower.includes('receitas') || lower.includes('minhas entradas') || lower.includes('meu salario') || lower.includes('meu salário')) {
    if (monthIncomes === 0) {
      return `Em ${period}, você não possui nenhuma receita registrada no Vfinance (total: ${formatBRL(0)}).`;
    }
    let catIncomeStr = '';
    if (data.categoryIncomesThisMonth && Object.keys(data.categoryIncomesThisMonth).length > 0) {
      catIncomeStr = `\n\nDetalhamento das entradas:\n` + Object.entries(data.categoryIncomesThisMonth)
        .map(([cat, amt]) => `• **${cat}**: ${formatBRL(amt)}`).join('\n');
    }
    return `Em ${period}, suas receitas somam o total de **${formatBRL(monthIncomes)}**.${catIncomeStr}`;
  }

  return `📊 **Panorama Financeiro — ${period}:**
• **Saldo Disponível em Contas:** ${formatBRL(availableBalance)}
• **Receitas no Mês:** ${formatBRL(monthIncomes)}
• **Despesas no Mês:** ${formatBRL(monthExpenses)}
• **Saldo Restante:** ${formatBRL(monthRemaining)}
• **Total Comprometido em Cartão:** ${formatBRL(totalCreditCardUsed)} (Limite Total: ${formatBRL(totalCreditCardLimit)})
• **Contas Fixas Pendentes no Mês:** ${formatBRL(pendingFixedBillsTotal)}
• **Saldo Total de Dívidas:** ${formatBRL(totalDebtsRemaining)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  const url = req.url || '';
  const action = (req.query?.action as string) || '';
  const isChat = action === 'chat' || url.includes('/chat') || Boolean(body.message);

  if (isChat) {
    try {
      const financialData = body?.financialData || body?.context || {};
      const userMessage = body?.message || (Array.isArray(body?.messages) && body.messages.length > 0 ? body.messages[body.messages.length - 1]?.content : '') || '';
      const ai = getGeminiClient();

      if (!userMessage.trim()) {
        return res.json({ reply: 'Olá! Como posso ajudar na organização das suas finanças hoje?' });
      }

      if (!ai) {
        return res.json({
          reply: getStrictRealDataReply(userMessage, financialData),
        });
      }

      const systemInstruction = `Você é o Consultor Financeiro Inteligente do Vfinance, um aplicativo de controle financeiro pessoal.
Você conversa diretamente com o usuário e analisa suas finanças em tempo real.

REGRAS ABSOLUTAS E INEGOCIÁVEIS:
1. Você DEVE responder EXCLUSIVAMENTE com base nos dados financeiros reais do usuário fornecidos neste contexto.
2. NUNCA invente números, valores de saldos, compras ou transações. Não use exemplos fictícios como se fossem do usuário.
3. Se um dado ou categoria não existir ou for zero, declare expressamente que não há registros.
4. Responda em português brasileiro com tom empático, educado, didático e motivador. Formate valores no padrão brasileiro (R$ 1.234,56).

CONTEXTO FINANCEIRO REAL DO USUÁRIO NO BANCO DE DADOS:
${JSON.stringify(financialData, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userMessage,
        config: {
          systemInstruction,
        },
      });

      return res.json({
        reply: response.text || getStrictRealDataReply(userMessage, financialData),
      });
    } catch (error: any) {
      console.warn('Erro no Chat Gemini:', error);
      const userMessage = body?.message || '';
      const fallbackData = body?.financialData || body?.context || {};
      return res.json({
        reply: getStrictRealDataReply(userMessage, fallbackData),
      });
    }
  }

  // Advisor analysis
  try {
    const financialData = body?.financialData || body?.summary || body?.context || {};
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        source: 'rules_engine',
        advice: generateStrictRealDataDiagnosis(financialData),
      });
    }

    const prompt = `Você é o Consultor de Inteligência Financeira do Vfinance.
Sua missão é analisar o diagnóstico financeiro do usuário estritamente com base nos dados reais do Supabase fornecidos abaixo (todos em Reais R$):

${JSON.stringify(financialData, null, 2)}

DIRETRIZES OBRIGATÓRIAS:
1. Baseie sua análise EXCLUSIVAMENTE nos dados acima. NUNCA invente valores, transações, contas ou compras.
2. Se não houver dados suficientes ou o usuário não tiver movimentações cadastradas, informe isso claramente e convide o usuário a registrar suas receitas e despesas.
3. SEMPRE cite o período analisado (exemplo: "Em ${financialData.periodLabel || 'agosto de 2026'}") ao apresentar números.
4. Estruture sua resposta em:
   - Diagnóstico da Saúde Financeira Atual;
   - Gastos por Categoria e Taxa de Poupança;
   - Alertas e Pontos de Atenção;
   - Recomendações Práticas e Próximos Passos personalizados.
5. Responda em português brasileiro com tom profissional, empático, claro e direto.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    const responseText = response.text || generateStrictRealDataDiagnosis(financialData);

    return res.json({
      source: 'gemini',
      advice: responseText,
    });
  } catch (error: any) {
    console.warn('Erro no Gemini Advisor:', error);
    const fallbackData = body?.financialData || body?.summary || body?.context || {};
    return res.json({
      source: 'rules_engine_fallback',
      advice: generateStrictRealDataDiagnosis(fallbackData),
    });
  }
}
