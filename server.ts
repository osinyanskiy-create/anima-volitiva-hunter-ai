import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { Agent, ClientPoint, ReferenceScriptStep, AuditReport, KnowledgeDocument } from './src/types.js';

const workspaceRoot = process.cwd();
dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3000;

let agents: Agent[] = [
  { id: 'agent_1', name: 'Журавель Дмитро', email: 'd.zhuravel@av.ua', phone: '+380 (50) 111-22-33', activePoints: 82, photoColor: 'bg-emerald-650' },
  { id: 'agent_2', name: 'Столярчук Олександр', email: 'o.stolyarchuk@av.ua', phone: '+380 (67) 222-33-44', activePoints: 79, photoColor: 'bg-blue-650' },
  { id: 'agent_3', name: 'Морський Дмитро', email: 'd.morskyi@av.ua', phone: '+380 (93) 333-44-55', activePoints: 80, photoColor: 'bg-purple-650' },
  { id: 'agent_4', name: 'Грабійчук Валерій', email: 'v.hrabiychuk@av.ua', phone: '+380 (50) 444-55-66', activePoints: 85, photoColor: 'bg-amber-655' }
];

let points: ClientPoint[] = [
  { id: 'point_1', name: 'Продуктовий маркет «Гурман»', address: 'вул. Хрещатик, 15', type: 'grocery', contactPerson: 'Оксана Миколаївна', averageMonthlySalesKg: 32.5, overdueReceivables: 2400, lastVisitDate: '2026-06-01' },
  { id: 'point_2', name: 'СТО «Преміум Моторс»', address: 'пр-т Бандери, 21', type: 'service_station', contactPerson: 'Ігор', averageMonthlySalesKg: 18.0, overdueReceivables: 0, lastVisitDate: '2026-05-28' }
];

let scriptSteps: ReferenceScriptStep[] = [
  { id: 'step_1', key: 'tech_water_temp', title: 'Критерій 1: Водопідготовка та Захист обладнання', description: 'Обов\'язковий замір води TDS-метром (норма до 180 ppm). Інструктаж ЛПР щодо небезпеки морозів.', weight: 20, idealPhrases: [] },
  { id: 'step_2', key: 'tasting_first_cup', title: 'Критерій 2: Дегустація та Правило першої чашки', description: 'Агент має першу чашку випити сам для перевірки налаштувань. Презентація купажу (9 грам на еспресо).', weight: 15, idealPhrases: [] },
  { id: 'step_3', key: 'finance_no_debt', title: 'Критерій 3: Фінансова дисципліна та Інгредієнти', description: 'Жорстка фіксація роботи без дебіторки (оплата по факту). Заборона сторонніх інгредієнтів.', weight: 20, idealPhrases: [] },
  { id: 'step_4', key: 'contract_2_months', title: 'Критерій 4: Умови суборенди та 2-місячний тест', description: 'Обов\'язкове попередження про аудит через 8 тижнів (орієнтир 4 кг) та сценарії при низькому проливі.', weight: 20, idealPhrases: [] },
  { id: 'step_5', key: 'objections_handling', title: 'Критерій 5: Робота із запереченнями ЛПР', description: 'Згода з клієнтом та переведення фокусу на покупця. Пропозиція тест-драйву.', weight: 15, idealPhrases: [] },
  { id: 'step_6', key: 'upsell_give_to_hand', title: 'Критерій 6: Додаткові продажі (Give to hand)', description: 'Активна пропозиція кави в пачках (120 грн) та чаю (75 грн). Передача товару в руки.', weight: 10, idealPhrases: [] }
];

const DB_FILE = path.resolve(workspaceRoot, 'db-store.json');
let documents: KnowledgeDocument[] = [];
let audits: AuditReport[] = [];

async function saveToDisk() {
  try {
    const payload = { agents, points, scriptSteps, audits, documents };
    await fs.writeFile(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database to disk:', error);
  }
}

async function loadFromDisk() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed.agents && Array.isArray(parsed.agents)) agents = parsed.agents;
    if (parsed.points && Array.isArray(parsed.points)) points = parsed.points;
    if (parsed.audits && Array.isArray(parsed.audits)) audits = parsed.audits;
    if (parsed.documents && Array.isArray(parsed.documents)) documents = parsed.documents;
    
    if (!parsed.scriptSteps || parsed.scriptSteps.length !== 6 || parsed.scriptSteps[0].key !== 'tech_water_temp') {
      await saveToDisk();
    } else {
      scriptSteps = parsed.scriptSteps;
    }
  } catch (error: any) {
    console.error('Error reading DB:', error);
  }
}

app.get('/api/documents', (req, res) => res.json({ success: true, documents }));

app.post('/api/documents', async (req, res) => {
  const { title, content, category } = req.body;
  const newDoc: KnowledgeDocument = {
    id: `doc_${Date.now()}`,
    title: title || 'Новий регламент',
    category: category || 'general',
    isActive: true,
    content: content || ''
  };
  documents.push(newDoc);
  await saveToDisk();
  res.json({ success: true, document: newDoc });
});

app.put('/api/documents/:id/toggle', async (req, res) => {
  const doc = documents.find(d => d.id === req.params.id);
  if (doc) doc.isActive = !doc.isActive;
  await saveToDisk();
  res.json({ success: true, documents });
});

app.delete('/api/documents/:id', async (req, res) => {
  documents = documents.filter(d => d.id !== req.params.id);
  await saveToDisk();
  res.json({ success: true, documents });
});

app.post('/api/documents/gap-analysis', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return res.json({ success: false, error: 'API ключ не знайдено' });

  if (audits.length === 0) {
    return res.json({ 
      success: true, 
      gap: "Немає збережених аудитів для аналізу.", 
      recommendation: "Проведіть хоча б один аудит, щоб ШІ міг знайти 'сліпі зони'." 
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    
    const recentAudits = audits.slice(0, 5).map(a => 
      `Дата: ${a.date}. Помилки агента: ${a.stepsAnalysis.filter((s:any) => s.status === 'failed').map((s:any) => s.explanation).join(' ')}`
    ).join('\n\n');

    const activeDocs = documents.filter(d => d.isActive).map(d => `- [${d.title}]`).join('\n');

    const prompt = `Ти Головний Бізнес-Аналітик компанії. Твоє завдання: порівняти системні помилки агентів з наявною базою знань та знайти "сліпі зони".
    
    БАЗА ЗНАНЬ (існучі документы):
    ${activeDocs || 'Порожньо'}
    
    ПОМИЛКИ З ОСТАННІХ АУДИТІВ:
    ${recentAudits || 'Немає зафіксованих помилок'}
    
    ПРАВИЛА АНАЛІЗУ:
    1. Знайди 1 спільну проблему (де агенти найчастіше плутаються або чого не вистачає в документах).
    2. Запропонуй створити новий регламент або оновити існуючий, щоб вирішити цю проблему.
    
    Поверни СТРОГО у JSON форматі: 
    {"gap": "детальний опис знайденої проблеми", "recommendation": "конкретна назва та суть нового регламенту"}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gap: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          },
          required: ['gap', 'recommendation']
        }
      }
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawText = rawText.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(rawText);
    res.json({ success: true, gap: parsed.gap, recommendation: parsed.recommendation });

  } catch (e: any) {
    console.error('Gap Analysis Error:', e);
    res.json({ success: false, error: e.message || 'Внутрішня помилка ШІ' });
  }
});

app.get('/api/agents', (req, res) => res.json(agents));
app.get('/api/audits', (req, res) => res.json(audits));
app.post('/api/audits/delete', async (req, res) => {
  audits = audits.filter(a => a.id !== req.body.id);
  await saveToDisk();
  res.json({ success: true, id: req.body.id });
});

app.post('/api/audits/:id/chat', async (req, res) => {
  const { question } = req.body;
  const audit = audits.find(a => a.id === req.params.id);
  const apiKey = process.env.GEMINI_API_KEY || '';

  if (!audit) return res.status(404).json({ success: false, error: 'Аудит не знайдено' });

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    
    const prompt = `Ти ШІ-Супервайзер компанії "Anima Volitiva". 
Нижче наведено конспект аудіозапису зустрічі з торговим агентом (${audit.agentName}) на точці "${audit.pointName}".

КОНСПЕКТ РОЗМОВИ:
${audit.transcript}

ЗАПИТАННЯ СУПЕРВАЙЗЕРА:
"${question}"

Дай чітку, конкретну та лаконічну відповідь українською мовою на основі цієї розмови.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ text: prompt }]
    });

    res.json({ success: true, answer: response.text });
  } catch (e: any) {
    console.error('Chat error:', e);
    res.status(500).json({ success: false, error: e.message || 'Помилка ШІ' });
  }
});

app.post('/api/audits/analyze', async (req, res) => {
  const { agentId, pointName, transcriptText, audioBase64, audioMimeType } = req.body;
  const agent = agents.find(a => a.id === agentId);
  const apiKey = process.env.GEMINI_API_KEY || '';

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    let parts: any[] = [];

    if (audioBase64) {
      parts.push({ inlineData: { data: audioBase64, mimeType: audioMimeType || 'audio/mp4' } });
      parts.push({ text: `Аналізуй аудіозапис.` });
    } else {
      parts.push({ text: `Ось текст діалогу для аналізу:\n${transcriptText}` });
    }

    const activeDocs = documents.filter(d => d.isActive).map(d => `[${d.title}]:\n${d.content}`).join('\n\n');
    const criteriaList = scriptSteps.map(s => `- КЛЮЧ: ${s.key} | ${s.title}`).join('\n');

    const systemPrompt = `Ти Супервайзер "Anima Volitiva". Твоя мета - оцінити діалог за 6 критеріями:
${criteriaList}

БАЗА ЗНАНЬ КОМПАНІЇ:
${activeDocs}

ВАЖЛИВЕ ОБМЕЖЕННЯ (ДЛЯ ДОВГИХ АУДІО):
У полі "transcript" НЕ пиши всю розмову слово в слово дослівно, якщо вона дуже довга. Замість цього зроби детальний та структурований КОНСПЕКТ зустрічі з ключовими етапами, цитатами, емоційним станом клієнта та найважливішими репліками. Це збереже пам'ять для якісного аналізу.

ІНСТРУКЦІЯ:
1. ВАЖЛИВО (ПРОДАВЕЦЬ VS ЛПР): Компанія НЕ ШТРАФУЄ агентів. Якщо агент розмовляє ЛИШЕ З ПРОДАВЦЕМ (і мета вийти на власника/директора), обговорення фінансів, води (180 ppm) та умов суборенди НЕ Є ОБОВ'ЯЗКОВИМ. В такому разі для критеріїв Фінанси, Вода, Умови суборенди став статус "completed" і пиши: "Агент спілкувався лише з продавцем, деталі обговорюються з ЛПР."
2. Ти тільки оцінюєш кожен з 6 критеріїв статусами: "completed" (ідеально або не застосовується), "partial" (частково), "failed" (груба помилка).
3. "supervisorActions": Напиши до 3-х дій для супервайзера ВИКЛЮЧНО на основі критеріїв зі статусом "failed" або "partial".

Поверни результат СТРОГО у JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: parts,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING, description: 'Детальний структурований конспект розмови, ключові фрази' },
            stepsAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepKey: { type: Type.STRING },
                  stepTitle: { type: Type.STRING },
                  status: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  detectedPhrases: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['stepKey', 'stepTitle', 'status', 'explanation']
              }
            },
            critiqueText: { type: Type.STRING },
            supervisorActions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['transcript', 'stepsAnalysis', 'critiqueText', 'supervisorActions']
        }
      }
    });

    let rawText = response.text || '{}';
    rawText = rawText.replace(/```(json)?/gi, '').replace(/```/g, '').trim();
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      rawText = rawText.substring(firstBrace, lastBrace + 1);
    }
    const parsedReport = JSON.parse(rawText);

    let totalScore = 0;
    let maxScore = 0;

    const validatedSteps = scriptSteps.map(refStep => {
       const aiStep = parsedReport.stepsAnalysis.find((s:any) => s.stepKey === refStep.key || s.stepTitle.includes(refStep.title)) 
                      || { status: 'failed', explanation: 'ІІ не оцінив цей блок', detectedPhrases: [] };
       
       maxScore += refStep.weight;
       if (aiStep.status === 'completed') totalScore += refStep.weight;
       else if (aiStep.status === 'partial') totalScore += (refStep.weight * 0.5);

       return {
         stepKey: refStep.key,
         stepTitle: refStep.title,
         status: aiStep.status,
         explanation: aiStep.explanation,
         detectedPhrases: aiStep.detectedPhrases || []
       };
    });

    const calculatedComplianceScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const finalReport: AuditReport = {
      id: `audit_${Date.now()}`,
      agentId: agent?.id || 'unknown',
      agentName: agent?.name || 'Невідомий',
      pointId: 'custom',
      pointName: pointName || 'Невідома точка',
      pointAddress: '',
      date: new Date().toISOString().split('T')[0],
      transcript: parsedReport.transcript || 'Транскрибування відсутнє...',
      complianceScore: calculatedComplianceScore,
      stepsAnalysis: validatedSteps,
      upsellAttempted: false,
      upsellSucceeded: false,
      detectedUpsells: [],
      technicalStateDiscussed: false,
      technicalStateClean: false,
      receivablesDiscussed: false,
      receivablesRecoveredAmount: 0,
      critiqueText: parsedReport.critiqueText || 'Аналіз завершено.',
      supervisorActions: (parsedReport.supervisorActions || []).slice(0, 3)
    };

    audits.unshift(finalReport);
    await saveToDisk();

    res.json({ success: true, report: finalReport });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Помилка ШІ: ' + (error.message || error) });
  }
});

async function bootstrap() {
  await loadFromDisk();
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        let template = await fs.readFile(path.resolve(workspaceRoot, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) { vite.ssrFixStacktrace(e as Error); next(e); }
    });
  } else {
    app.use(express.static(path.resolve(workspaceRoot, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(workspaceRoot, 'dist', 'index.html'));
    });
  }
  app.listen(Number(PORT), '0.0.0.0', () => console.log(`App running on port ${PORT}`));
}

bootstrap().catch(console.error);
