import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  getSupportedInstitutions,
  fetchPluggyItemData,
  generateSandboxBankPayload,
  processPluggyWebhookEvent,
  getRecentWebhookLogs,
  registerPluggyWebhook,
  listPluggyWebhooks,
  deletePluggyWebhook,
  getDefaultWebhookUrl,
  getSanitizedRedirectUri,
} from "./server/openFinanceService";
import {
  createPluggyConnectToken,
  deletePluggyItem,
  getPluggyDiagnostics,
  getPluggyApiKey,
  getConnectTokenErrorLogs,
  getConnectTokenDiagnosticReport,
  getApiLogs,
} from "./api/_lib/pluggyClient";

dotenv.config();

let aiClient: GoogleGenAI | null = null;


function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Health
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      appName: "Vfinance",
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      openFinanceConfigured: Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // Open Finance & Pluggy API Routes
  // ==========================================

  // Diagnostics & Credential Checker
  const handleDiagnostics = async (_req: any, res: any) => {
    try {
      const diag = await getPluggyDiagnostics();
      return res.json(diag);
    } catch (error: any) {
      console.error("Diagnostics error:", error);
      return res.status(500).json({ error: "Failed to run Pluggy diagnostics" });
    }
  };
  app.get("/api/open-finance/diagnostics", handleDiagnostics);
  app.get("/api/pluggy/diagnostics", handleDiagnostics);

  // 1. Connect Token (Starts the Open Finance widget / consent flow)
  const handleConnectToken = async (req: any, res: any) => {
    try {
      const { itemId, clientUserId, oauthRedirectUri, connectorId } = req.body || {};
      const tokenResult = await createPluggyConnectToken({
        itemId,
        clientUserId,
        oauthRedirectUri: getSanitizedRedirectUri(oauthRedirectUri),
        connectorId: connectorId ? Number(connectorId) : undefined,
      });

      if (!tokenResult.success || (!tokenResult.accessToken && !tokenResult.connectToken)) {
        const statusCode = tokenResult.status && tokenResult.status >= 400 && tokenResult.status < 600 ? tokenResult.status : 400;
        const errorMsg = typeof tokenResult.error === 'string'
          ? tokenResult.error
          : (tokenResult.error ? JSON.stringify(tokenResult.error) : 'Falha ao gerar Connect Token na Pluggy');
        return res.status(statusCode).json({
          success: false,
          error: errorMsg,
          details: errorMsg,
          step: tokenResult.step || 'connect_token',
          accessToken: '',
          connectToken: '',
          provider: tokenResult.provider || 'pluggy',
          sandbox: tokenResult.sandbox || false,
        });
      }

      return res.json({
        success: true,
        connectToken: tokenResult.connectToken,
        accessToken: tokenResult.accessToken,
        provider: tokenResult.provider,
        sandbox: tokenResult.sandbox,
      });
    } catch (error: any) {
      console.warn("Error creating connect token:", error);
      const errorDetails = typeof error?.message === 'string' ? error.message : JSON.stringify(error || 'Failed to initialize Open Finance connect token');
      return res.status(500).json({
        success: false,
        error: "Failed to initialize Open Finance connect token",
        details: errorDetails,
        accessToken: "",
        connectToken: "",
        provider: "pluggy",
        sandbox: false,
      });
    }
  };
  app.post("/api/open-finance/connect-token", handleConnectToken);
  app.post("/api/pluggy/connect-token", handleConnectToken);

  // Pluggy Auth Status Verification (Server-Side)
  const handlePluggyAuth = async (_req: any, res: any) => {
    try {
      const authResult = await getPluggyApiKey();
      if (!authResult.apiKey) {
        return res.status(authResult.status || 401).json({
          success: false,
          authenticated: false,
          error: authResult.error || 'Credenciais Pluggy não configuradas ou inválidas.',
          step: 'auth',
        });
      }
      return res.json({
        success: true,
        authenticated: true,
        message: 'Autenticação com Pluggy realizada com sucesso.',
      });
    } catch (error: any) {
      console.error('Error in /api/pluggy/auth:', error);
      return res.status(500).json({
        success: false,
        authenticated: false,
        error: 'Erro interno ao autenticar com Pluggy',
        details: error?.message,
      });
    }
  };
  app.get("/api/pluggy/auth", handlePluggyAuth);
  app.post("/api/pluggy/auth", handlePluggyAuth);

  // 2. Institutions List
  const handleInstitutions = (_req: any, res: any) => {
    try {
      const institutions = getSupportedInstitutions();
      return res.json({ institutions });
    } catch (error: any) {
      console.error("Error fetching institutions:", error);
      return res.status(500).json({ error: "Failed to fetch institutions" });
    }
  };
  app.get("/api/open-finance/institutions", handleInstitutions);
  app.get("/api/pluggy/institutions", handleInstitutions);

  // 3. Synchronize Open Finance Data (Accounts, Transactions, Cards, Invoices)
  const handleSync = async (req: any, res: any) => {
    try {
      const { itemId, institutionId, institutionName } = req.body || {};

      // If itemId is a real Pluggy itemId
      if (itemId && !String(itemId).startsWith("sandbox_")) {
        const realResult = await fetchPluggyItemData(String(itemId));
        if (realResult.success && realResult.data) {
          return res.json({
            success: true,
            provider: "pluggy",
            data: realResult.data,
          });
        } else {
          return res.status(realResult.status || 400).json({
            success: false,
            error: realResult.error || "Falha ao obter dados bancários da Pluggy",
            details: realResult.error,
          });
        }
      }

      // If sandbox or testing mode: generate realistic synchronized Open Finance data
      const sandboxPayload = generateSandboxBankPayload(institutionId || 201, institutionName);
      return res.json({
        success: true,
        provider: "pluggy-sandbox",
        data: sandboxPayload,
      });
    } catch (error: any) {
      console.error("Error synchronizing Open Finance data:", error);
      return res.status(500).json({ success: false, error: "Failed to synchronize bank data" });
    }
  };
  app.post("/api/open-finance/sync", handleSync);
  app.post("/api/pluggy/sync", handleSync);

  // 4. Accounts Endpoint
  app.get("/api/open-finance/accounts", async (req, res) => {
    try {
      const { itemId } = req.query;
      if (itemId && typeof itemId === "string" && !itemId.startsWith("sandbox_")) {
        const realResult = await fetchPluggyItemData(itemId);
        if (realResult.success && realResult.data?.accounts) {
          return res.json({ accounts: realResult.data.accounts });
        }
      }
      const demo = generateSandboxBankPayload("0");
      return res.json({ accounts: demo.accounts });
    } catch (error) {
      return res.status(500).json({ error: "Error fetching accounts" });
    }
  });

  // 5. Transactions Endpoint
  app.get("/api/open-finance/transactions", async (req, res) => {
    try {
      const { itemId } = req.query;
      if (itemId && typeof itemId === "string" && !itemId.startsWith("sandbox_")) {
        const realResult = await fetchPluggyItemData(itemId);
        if (realResult.success && realResult.data?.accounts) {
          const allTx = realResult.data.accounts.flatMap((a: any) => a.transactions || []);
          return res.json({ transactions: allTx });
        }
      }
      const demo = generateSandboxBankPayload("0");
      const allTx = demo.accounts.flatMap((a) => a.transactions || []);
      return res.json({ transactions: allTx });
    } catch (error) {
      return res.status(500).json({ error: "Error fetching transactions" });
    }
  });

  // 6. Cards Endpoint
  app.get("/api/open-finance/cards", async (req, res) => {
    try {
      const { itemId } = req.query;
      if (itemId && typeof itemId === "string" && !itemId.startsWith("sandbox_")) {
        const realResult = await fetchPluggyItemData(itemId);
        if (realResult.success && realResult.data?.cards) {
          return res.json({ cards: realResult.data.cards });
        }
      }
      const demo = generateSandboxBankPayload("0");
      return res.json({ cards: demo.cards });
    } catch (error) {
      return res.status(500).json({ error: "Error fetching cards" });
    }
  });

  // 7. Bills Endpoint
  app.get("/api/open-finance/bills", async (req, res) => {
    try {
      const { itemId } = req.query;
      if (itemId && typeof itemId === "string" && !itemId.startsWith("sandbox_")) {
        const realResult = await fetchPluggyItemData(itemId);
        if (realResult.success && realResult.data?.cards) {
          const allBills = realResult.data.cards.flatMap((c: any) => c.bills || []);
          return res.json({ bills: allBills });
        }
      }
      const demo = generateSandboxBankPayload("0");
      const allBills = demo.cards.flatMap((c) => c.bills || []);
      return res.json({ bills: allBills });
    } catch (error) {
      return res.status(500).json({ error: "Error fetching bills" });
    }
  });

  // 8. Disconnect Endpoint
  app.delete("/api/open-finance/disconnect", async (req, res) => {
    try {
      const { itemId } = req.body || {};
      if (itemId && !itemId.startsWith("sandbox_")) {
        await deletePluggyItem(itemId);
      }
      return res.json({ success: true, message: "Instituição bancária desconectada com sucesso." });
    } catch (error: any) {
      console.error("Error disconnecting bank:", error);
      return res.status(500).json({ error: "Failed to disconnect bank" });
    }
  });

  // 9. Webhook Receiver & Status (Pluggy push notifications)
  const handleWebhookPost = async (req: any, res: any) => {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      body = body || {};

      const eventType = String(body.event || body.type || 'unknown').trim();
      const eventId = String(body.id || body.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      
      let itemId: string | null = null;
      if (body.itemId) {
        itemId = String(body.itemId);
      } else if (body.data?.itemId) {
        itemId = String(body.data.itemId);
      } else if (!eventType.startsWith('connector/') && body.data?.id && typeof body.data.id === 'string') {
        itemId = String(body.data.id);
      }

      console.log(`[Express /api/pluggy/webhook] Recebido evento Pluggy: ${eventType} | itemId: ${itemId || 'N/A'} | eventId: ${eventId}`);

      let processResult: any = { success: true };
      try {
        processResult = await processPluggyWebhookEvent(body);
      } catch (procErr: any) {
        console.error('[Express Webhook] Erro ao processar evento:', procErr);
        processResult = { success: true, error: procErr?.message };
      }

      return res.status(200).json({
        received: true,
        eventId,
        event: eventType,
        itemId: itemId || undefined,
        status: 'acknowledged',
        result: processResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Erro no processamento do webhook:', error);
      return res.status(200).json({
        received: true,
        status: 'error_handled',
        error: error?.message || 'Falha ao processar payload do webhook',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleWebhookGet = (req: any, res: any) => {
    const recentLogs = getRecentWebhookLogs();
    const host = req.headers?.host || 'vanessa-ns.vercel.app';
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';
    return res.status(200).json({
      status: 'active',
      endpoint: `${protocol}://${host}/api/pluggy/webhook`,
      message: 'Endpoint de Webhook da Pluggy operacional e pronto para receber eventos em produção.',
      supportedEvents: [
        'connector/status_updated',
        'item/created',
        'item/updated',
        'item/error',
        'item/deleted',
        'item/waiting_user_input',
        'item/login_error',
        'transactions/created',
        'transactions/updated',
        'transactions/deleted',
        'all',
      ],
      recentEventsCount: recentLogs.length,
      recentEvents: recentLogs.slice(0, 20),
      timestamp: new Date().toISOString(),
    });
  };

  app.post("/api/pluggy/webhook", handleWebhookPost);
  app.get("/api/pluggy/webhook", handleWebhookGet);
  app.post("/api/open-finance/webhook", handleWebhookPost);
  app.get("/api/open-finance/webhook", handleWebhookGet);

  // 10. Webhooks Management (List, Register, Delete on Pluggy API)
  app.get("/api/pluggy/webhooks", async (_req, res) => {
    try {
      const result = await listPluggyWebhooks();
      if (!result.success) {
        return res.status(result.status || 500).json(result);
      }
      return res.json({
        success: true,
        webhooks: result.webhooks || [],
        targetWebhookUrl: getDefaultWebhookUrl(),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post("/api/pluggy/webhooks", async (req, res) => {
    try {
      const { url, event } = req.body || {};
      const targetUrl = url || getDefaultWebhookUrl();
      const result = await registerPluggyWebhook(targetUrl, event || 'all');
      if (!result.success) {
        return res.status(result.status || 500).json(result);
      }
      return res.status(201).json({
        success: true,
        message: 'Webhook registrado com sucesso na Pluggy!',
        webhook: result.webhook,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.delete("/api/pluggy/webhooks", async (req, res) => {
    try {
      const webhookId = (req.query.id as string) || req.body?.id;
      if (!webhookId) {
        return res.status(400).json({ success: false, error: 'Informe o ID do webhook a ser deletado.' });
      }
      const result = await deletePluggyWebhook(webhookId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 11. Disconnect item from Pluggy
  const handleDisconnect = async (req: any, res: any) => {
    try {
      const itemId = (req.query.itemId as string) || req.body?.itemId;
      if (!itemId) {
        return res.status(400).json({ success: false, error: 'itemId é obrigatório.' });
      }
      const result = await deletePluggyItem(String(itemId));
      return res.json({
        success: result.success,
        message: result.success ? 'Conexão bancária desconectada com sucesso.' : result.error,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  };

  // 12. Error and Execution Diagnostic Logs Endpoint
  const handleLogs = async (req: any, res: any) => {
    try {
      const { limit, endpoint, errorsOnly, action, format } = req.query || {};
      const limitNum = limit ? Math.min(Math.max(1, parseInt(String(limit), 10) || 10), 50) : 10;

      if (action === 'test' || req.method === 'POST') {
        await createPluggyConnectToken({ clientUserId: 'diagnostic-probe-user' });
      }

      const connectTokenErrorLogs = getConnectTokenErrorLogs(limitNum);
      const diagnosticReport = getConnectTokenDiagnosticReport();
      const allFilteredLogs = getApiLogs({
        endpoint: typeof endpoint === 'string' ? endpoint : undefined,
        errorsOnly: errorsOnly === 'true' || errorsOnly === '1',
        limit: limitNum,
      });

      if (format === 'text') {
        let textOutput = `=== RELATÓRIO DE DIAGNÓSTICO PLUGGY CONNECT-TOKEN ===\n`;
        textOutput += `Data/Hora: ${diagnosticReport.timestamp}\n`;
        textOutput += `Status Geral: ${diagnosticReport.primaryFailureCause}\n`;
        textOutput += `Ação Recomendada: ${diagnosticReport.recommendedAction}\n`;
        textOutput += `Total de erros registrados: ${diagnosticReport.connectTokenErrorsCount}\n\n`;
        textOutput += `--- ÚLTIMOS ERROS DE EXECUÇÃO (/api/pluggy/connect-token) ---\n`;

        if (connectTokenErrorLogs.length === 0) {
          textOutput += `Nenhum erro registrado recentemente.\n`;
        } else {
          connectTokenErrorLogs.forEach((log, idx) => {
            textOutput += `[${idx + 1}] ${log.timestamp} | Status: HTTP ${log.statusCode} | Etapa: ${log.step}\n`;
            textOutput += `    Endpoint: ${log.endpoint}\n`;
            textOutput += `    Erro: ${log.error || 'N/A'}\n`;
            textOutput += `    Causa Identificada: ${log.pinpointReason || 'N/A'}\n`;
            textOutput += `    Correção: ${log.recommendedFix || 'N/A'}\n`;
            textOutput += `    Duração: ${log.durationMs || 0}ms\n\n`;
          });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(textOutput);
      }

      return res.status(200).json({
        success: true,
        filter: {
          targetEndpoint: '/api/pluggy/connect-token',
          limit: limitNum,
        },
        diagnosticSummary: {
          primaryCause: diagnosticReport.primaryFailureCause,
          recommendedAction: diagnosticReport.recommendedAction,
          statusCodesSummary: diagnosticReport.statusCodesSummary,
          totalErrorsCount: diagnosticReport.connectTokenErrorsCount,
        },
        last10ErrorLogs: connectTokenErrorLogs,
        environment: diagnosticReport.systemEnvironment,
        allRecentLogs: allFilteredLogs,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error fetching diagnostic logs:', error);
      return res.status(500).json({ success: false, error: 'Falha ao recuperar logs de diagnóstico', details: error?.message });
    }
  };

  app.get("/api/pluggy/logs", handleLogs);
  app.post("/api/pluggy/logs", handleLogs);
  app.get("/api/open-finance/logs", handleLogs);
  app.post("/api/open-finance/logs", handleLogs);


  // API - Financial Insights Advisor
  app.post("/api/gemini/advisor", async (req, res) => {
    try {
      const financialData = req.body?.financialData || req.body?.summary || req.body?.context || {};
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          source: "rules_engine",
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
   - Diagnóstico da Saúde Financeira Atual (citando receitas reais, despesas reais e saldo disponível real);
   - Gastos por Categoria e Taxa de Poupança;
   - Alertas e Pontos de Atenção (faturas de cartão, contas fixas pendentes, dívidas ou orçamentos estourados, se existirem);
   - Recomendações Práticas e Próximos Passos personalizados.
5. Responda em português brasileiro com tom profissional, empático, claro e direto.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
      });

      const responseText = response.text || generateStrictRealDataDiagnosis(financialData);

      return res.json({
        source: "gemini",
        advice: responseText,
      });
    } catch (error: any) {
      console.error("Erro no Gemini Advisor:", error);
      const fallbackData = req.body?.financialData || req.body?.summary || req.body?.context || {};
      return res.json({
        source: "rules_engine_fallback",
        advice: generateStrictRealDataDiagnosis(fallbackData),
      });
    }
  });

  // API - Financial Chat Assistant
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const financialData = req.body?.financialData || req.body?.context || {};
      const userMessage = req.body?.message || (Array.isArray(req.body?.messages) && req.body.messages.length > 0 ? req.body.messages[req.body.messages.length - 1]?.content : "") || "";
      const ai = getGeminiClient();

      if (!userMessage.trim()) {
        return res.json({ reply: "Olá! Como posso ajudar na organização das suas finanças hoje?" });
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
3. Se um dado ou categoria não existir ou for zero (ex: sem movimentações na categoria, sem cartões, sem dívidas), declare expressamente que não há registros.
4. SEMPRE informe o período usado na análise quando relevante (ex: "Em ${financialData.periodLabel || 'agosto de 2026'}, você gastou R$ X e recebeu R$ Y").
5. Quando o usuário perguntar:
   - "Quanto eu gastei este mês?" -> informe o total real de despesas pagas no período e destaque as principais categorias.
   - "Quanto tenho disponível?" -> informe o saldo disponível real (somatório das contas bancárias cadastradas) e detalhe por conta se houver mais de uma.
   - "Quanto recebi este mês?" -> informe as receitas reais registradas no período.
   - "Quanto gastei com [categoria]?" (ex: alimentação, lazer, transporte) -> filtre as movimentações da categoria e informe o total real somado.
   - "Como estão minhas finanças?" -> apresente um panorama completo com receitas, despesas, saldo restante, cartões, parcelas, contas fixas e metas.
   - "Posso comprar algo de R$ [valor]?" -> analise o saldo disponível real, as receitas/despesas do mês e compromissos futuros (parcelas/contas fixas) antes de dar sua recomendação.
   - "Quanto ainda tenho para pagar no cartão?" -> analise os limites, compras parceladas e parcelas restantes dos cartões.
   - "Quanto vou gastar nos próximos meses?" -> consulte a projeção de parcelas futuras e contas fixas.
   - "Estou gastando demais?" -> compare os gastos reais com as receitas reais e orçamentos cadastrados.
6. Responda em português brasileiro com tom empático, educado, didático e motivador. Formate valores no padrão brasileiro (R$ 1.234,56).

CONTEXTO FINANCEIRO REAL DO USUÁRIO NO BANCO DE DADOS:
${JSON.stringify(financialData, null, 2)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: userMessage,
        config: {
          systemInstruction,
        },
      });

      return res.json({
        reply: response.text || getStrictRealDataReply(userMessage, financialData),
      });
    } catch (error: any) {
      console.error("Erro no Chat Gemini:", error);
      const userMessage = req.body?.message || (Array.isArray(req.body?.messages) && req.body.messages.length > 0 ? req.body.messages[req.body.messages.length - 1]?.content : "") || "";
      const fallbackData = req.body?.financialData || req.body?.context || {};
      return res.json({
        reply: getStrictRealDataReply(userMessage, fallbackData),
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
          clientPort: 443,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Vfinance Server running on http://0.0.0.0:${PORT}`);
  });
}

function formatBRL(val: any): string {
  const num = typeof val === "number" ? val : parseFloat(val) || 0;
  return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateStrictRealDataDiagnosis(data: any): string {
  if (!data || !data.summary || !data.summary.hasAnyData) {
    return "Você ainda não possui dados financeiros registrados no Vfinance. Cadastre suas contas bancárias, receitas e despesas para que eu possa gerar diagnósticos precisos e consultorias personalizadas.";
  }

  const period = data.periodLabel || "este mês";
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

  // 1. Health Diagnosis
  lines.push(`📊 **Diagnóstico Financeiro (${period})**`);
  lines.push(`• **Saldo Disponível em Contas:** ${formatBRL(availableBalance)}`);
  lines.push(`• **Receitas Recebidas:** ${formatBRL(monthIncomes)}`);
  lines.push(`• **Despesas Pagas:** ${formatBRL(monthExpenses)}`);
  lines.push(`• **Saldo Restante do Mês:** ${formatBRL(monthRemaining)} (Taxa de Poupança: ${monthSavingsRate}%)`);

  // 2. Spending breakdown
  if (data.categorySpendingThisMonth && Object.keys(data.categorySpendingThisMonth).length > 0) {
    const topCats = Object.entries(data.categorySpendingThisMonth)
      .map(([cat, amount]) => ({ cat, amount: Number(amount) || 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    const catStr = topCats.map(c => `${c.cat}: ${formatBRL(c.amount)}`).join(", ");
    lines.push(`\n🏷️ **Principais Gastos por Categoria:** ${catStr}`);
  }

  // 3. Alerts & Obligations
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
    lines.push(`\n⚠️ **Pontos de Atenção:**\n` + alerts.map(a => `• ${a}`).join("\n"));
  }

  // 4. Goals progress
  if (Array.isArray(data.goals) && data.goals.length > 0) {
    const goalsSummary = data.goals
      .map((g: any) => `${g.name} (${formatBRL(g.currentAmount)} de ${formatBRL(g.targetAmount)} - ${g.progressPercentage}%)`)
      .join("; ");
    lines.push(`\n🎯 **Metas em Andamento:** ${goalsSummary}`);
  }

  return lines.join("\n");
}

function getStrictRealDataReply(message: string, data: any): string {
  const lower = (message || "").toLowerCase().trim();
  const period = data?.periodLabel || "este mês";
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

  // 1. "Quanto eu gastei este mês?"
  if (lower.includes("gastei este mês") || lower.includes("gastei este mes") || lower.includes("quanto gastei") || (lower.includes("total") && lower.includes("gastos"))) {
    if (monthExpenses === 0) {
      return `Em ${period}, você não possui nenhuma despesa registrada como paga no Vfinance (total: ${formatBRL(0)}).`;
    }

    let topCategoriesStr = "";
    if (data.categorySpendingThisMonth && Object.keys(data.categorySpendingThisMonth).length > 0) {
      const topCats = Object.entries(data.categorySpendingThisMonth)
        .map(([cat, amt]) => ({ cat, amt: Number(amt) || 0 }))
        .sort((a, b) => b.amt - a.amt);
      topCategoriesStr = `\n\nDetalhamento por categoria:\n` + topCats.map(c => `• **${c.cat}**: ${formatBRL(c.amt)}`).join("\n");
    }

    return `Em ${period}, você gastou o total de **${formatBRL(monthExpenses)}** em despesas pagas.${topCategoriesStr}`;
  }

  // 2. "Quanto tenho disponível?"
  if (lower.includes("disponível") || lower.includes("disponivel") || lower.includes("saldo") || lower.includes("tenho na conta")) {
    let accountsStr = "";
    if (Array.isArray(data.accounts) && data.accounts.length > 0) {
      accountsStr = `\n\nDistribuição por conta bancária:\n` + data.accounts.map((a: any) => `• **${a.name}** (${a.bank}): ${formatBRL(a.balance)}`).join("\n");
    }

    return `Seu saldo total disponível em contas bancárias cadastradas é de **${formatBRL(availableBalance)}**.${accountsStr}`;
  }

  // 3. "Quanto recebi este mês?"
  if (lower.includes("recebi") || lower.includes("receitas") || lower.includes("minhas entradas") || lower.includes("meu salario") || lower.includes("meu salário")) {
    if (monthIncomes === 0) {
      return `Em ${period}, você não possui nenhuma receita registrada no Vfinance (total: ${formatBRL(0)}).`;
    }

    let catIncomeStr = "";
    if (data.categoryIncomesThisMonth && Object.keys(data.categoryIncomesThisMonth).length > 0) {
      catIncomeStr = `\n\nDetalhamento das entradas:\n` + Object.entries(data.categoryIncomesThisMonth)
        .map(([cat, amt]) => `• **${cat}**: ${formatBRL(amt)}`).join("\n");
    }

    return `Em ${period}, suas receitas somam o total de **${formatBRL(monthIncomes)}**.${catIncomeStr}`;
  }

  // 4. "Quanto gastei com [categoria]?"
  const categoryMatch = ["alimentação", "alimentacao", "moradia", "transporte", "saúde", "saude", "educação", "educacao", "lazer", "compras", "assinaturas", "impostos", "viagens", "pets"].find(c => lower.includes(c));
  if (categoryMatch) {
    const matchedCategoryName = Object.keys(data.categorySpendingThisMonth || {}).find(k => k.toLowerCase().includes(categoryMatch.replace(/[ãáàâ]/g, 'a').replace(/[éê]/g, 'e').replace(/[í]/g, 'i').replace(/[ç]/g, 'c'))) || categoryMatch;
    const spent = data.categorySpendingThisMonth?.[matchedCategoryName] || 0;

    const txsOfCategory = (data.transactionsThisMonth || []).filter((t: any) => t.type === 'expense' && t.category.toLowerCase().includes(categoryMatch.slice(0, 4)));

    if (spent === 0 && txsOfCategory.length === 0) {
      return `Em ${period}, você não possui despesas registradas na categoria **${matchedCategoryName}** (total: ${formatBRL(0)}).`;
    }

    const txDetails = txsOfCategory.length > 0
      ? `\n\nMovimentações encontradas:\n` + txsOfCategory.map((t: any) => `• ${t.date}: ${t.description} — ${formatBRL(t.amount)}`).join("\n")
      : "";

    return `Em ${period}, seus gastos na categoria **${matchedCategoryName}** totalizam **${formatBRL(spent)}**.${txDetails}`;
  }

  // 5. "Quanto ainda tenho para pagar no cartão?" / "cartão"
  if (lower.includes("cartão") || lower.includes("cartao") || lower.includes("fatura") || lower.includes("parcelas do cartão") || lower.includes("parcelas do cartao")) {
    if (!data.creditCards || data.creditCards.length === 0) {
      return "Você não possui nenhum cartão de crédito cadastrado no Vfinance no momento.";
    }

    let cardsDetail = data.creditCards.map((c: any) =>
      `• **${c.name}** (${c.bank}): Limite total de ${formatBRL(c.totalLimit)} | Utilizado: ${formatBRL(c.usedAmount)} | Disponível: ${formatBRL(c.availableLimit)} (Vencimento: dia ${c.dueDay})`
    ).join("\n");

    let purchasesDetail = "";
    if (Array.isArray(data.cardPurchases) && data.cardPurchases.length > 0) {
      purchasesDetail = `\n\nCompras parceladas ativas:\n` + data.cardPurchases.map((p: any) =>
        `• **${p.description}** (${p.cardName}): Parcela ${p.currentPaidInstallments}/${p.installmentsCount} de ${formatBRL(p.installmentValue)} (Restante: ${formatBRL(p.remainingAmount)})`
      ).join("\n");
    }

    return `Total comprometido em cartões de crédito (faturas e parcelas futuras): **${formatBRL(totalCreditCardUsed)}** de um limite global de **${formatBRL(totalCreditCardLimit)}**.\n\nSeus cartões:\n${cardsDetail}${purchasesDetail}`;
  }

  // 6. "Quanto vou gastar nos próximos meses?" / "parcelas futuras"
  if (lower.includes("próximos meses") || lower.includes("proximos meses") || lower.includes("meses seguintes") || lower.includes("parcelas futuras")) {
    if (!data.futureInstallmentsByMonth || data.futureInstallmentsByMonth.length === 0) {
      return "Não há parcelas futuras de cartão registradas nos próximos meses.";
    }

    const futureBreakdown = data.futureInstallmentsByMonth.map((fm: any) => {
      const items = fm.purchases.map((p: any) => `${p.description} (${formatBRL(p.amount)})`).join(", ");
      return `• **${fm.monthLabel}**: ${formatBRL(fm.totalAmount)} ${items ? `— [${items}]` : ''}`;
    }).join("\n");

    return `Previsão de parcelas de cartão de crédito para os próximos meses:\n\n${futureBreakdown}`;
  }

  // 7. "Posso comprar algo de R$ 500?" / Simulação de compra
  const buyMatch = lower.match(/(?:posso comprar|posso gastar|consigo comprar|vale a pena comprar).*?(\d+[\.,]?\d*)/);
  if (buyMatch) {
    const buyAmount = parseFloat(buyMatch[1].replace(',', '.')) || 0;
    const canAffordBalance = availableBalance >= buyAmount;
    const canAffordMonthRemaining = monthRemaining >= buyAmount;

    let verdict = "";
    if (canAffordBalance && canAffordMonthRemaining) {
      verdict = `Sim! Você possui saldo disponível de **${formatBRL(availableBalance)}** e uma sobra no mês de ${period} de **${formatBRL(monthRemaining)}**. A compra de **${formatBRL(buyAmount)}** cabe no seu orçamento atual sem comprometer sua reserva.`;
    } else if (canAffordBalance) {
      verdict = `Você possui saldo bancário total de **${formatBRL(availableBalance)}** para cobrir a compra de **${formatBRL(buyAmount)}**, mas o seu saldo operacional de ${period} está em **${formatBRL(monthRemaining)}**. Se fizer essa compra à vista agora, consumirá parte do seu saldo acumulado.`;
    } else {
      verdict = `Atenção: Seu saldo disponível atual é de **${formatBRL(availableBalance)}**, o que é menor que o valor desejado de **${formatBRL(buyAmount)}**. Recomendamos aguardar as próximas entradas ou reavaliar prioridades antes desta despesa.`;
    }

    if (pendingFixedBillsTotal > 0) {
      verdict += `\n\nLembre-se que você ainda possui **${formatBRL(pendingFixedBillsTotal)}** em contas fixas pendentes para este mês.`;
    }

    return verdict;
  }

  // 8. "Estou gastando demais?" / Análise de orçamento
  if (lower.includes("gastando demais") || lower.includes("gastando muito") || lower.includes("estou no limite")) {
    if (monthIncomes === 0 && monthExpenses === 0) {
      return `Em ${period}, não há dados suficientes de receitas e despesas registrados no Vfinance para avaliar o ritmo de gastos.`;
    }

    if (monthExpenses > monthIncomes) {
      return `Sim, alerta importante: Em ${period}, suas despesas pagas (${formatBRL(monthExpenses)}) já ultrapassaram suas receitas (${formatBRL(monthIncomes)}) em ${formatBRL(monthExpenses - monthIncomes)}. Recomenda-se pausar compras não essenciais no cartão e revisar gastos variáveis.`;
    }

    const rate = summary.monthSavingsRate || 0;
    return `Seus gastos estão sob controle em ${period}. Você recebeu ${formatBRL(monthIncomes)} e gastou ${formatBRL(monthExpenses)}, mantendo uma sobra positiva de **${formatBRL(monthRemaining)}** (Taxa de poupança de **${rate}%**).`;
  }

  // 9. "Como estão minhas finanças?" / Panorama Geral
  return `📊 **Panorama Financeiro — ${period}:**
• **Saldo Disponível em Contas:** ${formatBRL(availableBalance)}
• **Receitas no Mês:** ${formatBRL(monthIncomes)}
• **Despesas no Mês:** ${formatBRL(monthExpenses)}
• **Saldo Restante:** ${formatBRL(monthRemaining)}
• **Total Comprometido em Cartão:** ${formatBRL(totalCreditCardUsed)} (Limite Total: ${formatBRL(totalCreditCardLimit)})
• **Contas Fixas Pendentes no Mês:** ${formatBRL(pendingFixedBillsTotal)}
• **Saldo Total de Dívidas:** ${formatBRL(totalDebtsRemaining)}

Como posso te ajudar com mais detalhes sobre seus gastos, metas ou simulações hoje?`;
}

startServer();

