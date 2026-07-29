import React, { useState, useEffect } from 'react';
import { Coffee, User, MapPin, Upload, FileText, CheckCircle, X, Send, Activity, Sparkles, LogOut, ShieldCheck, TrendingUp, AlertTriangle, Plus } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'agent' | 'supervisor' | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const [agents, setAgents] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedPointName, setSelectedPointName] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [isGapAnalyzing, setIsGapAnalyzing] = useState(false);

  // Стейт для модалки нового документа
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agRes, auRes, docRes] = await Promise.all([
        fetch('/api/agents').then(r => r.json()),
        fetch('/api/audits').then(r => r.json()),
        fetch('/api/documents').then(r => r.json())
      ]);
      setAgents(agRes || []);
      setAudits(auRes || []);
      setDocuments(docRes.documents || []);
    } catch (e) {
      console.error('Error fetching data', e);
    }
  };

  const handleSupervisorLogin = () => {
    if (loginPassword === '0000') {
      setRole('supervisor');
      setShowPasswordInput(false);
      setLoginPassword('');
      setReport(null);
    } else {
      alert('Невірний PIN-код! (Підказка: введіть 0000)');
    }
  };

  const handleLogout = () => {
    setRole(null);
    setReport(null);
    setTranscriptText('');
    setAudioFile(null);
    setShowPasswordInput(false);
    setLoginPassword('');
    setSelectedPointName('');
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudioFile(e.target.files[0]);
      setTranscriptText('');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result?.toString().replace(/^data:(.*,)?/, '') || '';
        if ((encoded.length % 4) > 0) {
          encoded += '='.repeat(4 - (encoded.length % 4));
        }
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  };

  const runAnalysis = async () => {
    if (!selectedAgent || !selectedPointName.trim()) return alert('Оберіть агента та впишіть назву торгової точки!');
    if (!transcriptText && !audioFile) return alert('Додайте текст діалогу або аудіофайл!');

    setIsAnalyzing(true);
    try {
      let payload: any = { agentId: selectedAgent, pointName: selectedPointName.trim() };
      
      if (audioFile) {
        payload.audioBase64 = await fileToBase64(audioFile);
        payload.audioMimeType = audioFile.type;
      } else {
        payload.transcriptText = transcriptText;
      }

      const res = await fetch('/api/audits/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        fetchData();
      } else {
        alert('Помилка: ' + data.error);
      }
    } catch (e) {
      console.error(e);
      alert('Помилка з\'єднання з сервером');
    }
    setIsAnalyzing(false);
  };

  const runGapAnalysis = async () => {
    setIsGapAnalyzing(true);
    try {
      const res = await fetch('/api/documents/gap-analysis', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setGapAnalysis(data);
      } else {
        alert('Помилка ШІ-Адвайзера: ' + (data.error || 'Невідома помилка'));
      }
    } catch (e) {
      console.error(e);
      alert('Помилка з\'єднання з сервером при запуску Адвайзера');
    }
    setIsGapAnalyzing(false);
  };

  // Функція для додавання нового регламенту супервайзером
  const handleAddDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      return alert("Заповніть назву та текст правила!");
    }
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newDocTitle, content: newDocContent, category: 'general' })
      });
      const data = await res.json();
      if (data.success) {
        setIsAddDocModalOpen(false);
        setNewDocTitle('');
        setNewDocContent('');
        fetchData(); // Оновлюємо список документів
      }
    } catch (e) {
      console.error('Error saving document:', e);
      alert('Не вдалося зберегти регламент');
    }
  };

  const avgScore = audits.length > 0 ? Math.round(audits.reduce((acc, a) => acc + a.complianceScore, 0) / audits.length) : 0;
  const criticalAudits = audits.filter(a => a.complianceScore < 70).length;

  if (!role) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full text-center animate-fade-in">
          <div className="flex justify-center mb-6">
             <div className="bg-[#3b2f2f] p-4 rounded-full text-[#d4af37] shadow-lg">
               <Coffee size={48} />
             </div>
          </div>
          <h1 className="text-2xl font-black text-[#3b2f2f] uppercase mb-1">Anima Volitiva</h1>
          <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-10">Система ІІ-Аудиту та Розвитку</p>

          {!showPasswordInput ? (
            <div className="space-y-4">
              <button 
                onClick={() => { setRole('agent'); setReport(null); }} 
                className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#3b2f2f] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 group"
              >
                 <User size={20} className="text-gray-400 group-hover:text-[#3b2f2f]" /> 
                 Я ТОРГОВИЙ АГЕНТ
              </button>
              <button 
                onClick={() => setShowPasswordInput(true)} 
                className="w-full bg-[#3b2f2f] hover:bg-black text-[#d4af37] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-md"
              >
                 <ShieldCheck size={20} /> 
                 Я СУПЕРВАЙЗЕР
              </button>
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <h3 className="font-bold text-gray-700">Введіть PIN-код доступу</h3>
              <input 
                type="password" 
                placeholder="****"
                maxLength={4}
                className="w-full text-center text-3xl tracking-[1em] bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-[#d4af37] outline-none"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSupervisorLogin()}
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setShowPasswordInput(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors">
                  НАЗАД
                </button>
                <button onClick={handleSupervisorLogin} className="flex-1 bg-[#d4af37] hover:bg-[#b8952b] text-white font-black py-3 rounded-xl transition-colors shadow-md">
                  УВІЙТИ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans text-gray-800 pb-20 relative">
      <header className="bg-[#3b2f2f] text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee size={32} className="text-[#d4af37]" />
            <div>
              <h1 className="text-xl font-bold tracking-wide">Anima Volitiva <span className="text-[#d4af37]">Hunter AI</span></h1>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-white uppercase">{role === 'agent' ? 'Кабінет Агента' : 'Кабінет Аналітики'}</p>
              <p className="text-xs text-[#d4af37] flex items-center justify-end gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> В системі</p>
            </div>
            <button onClick={handleLogout} className="bg-[#4a3b3b] hover:bg-red-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-gray-600 hover:border-red-800">
              <LogOut size={16} /> ВИЙТИ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 px-4">
        {report ? (
          /* ----- REPORT VIEW ----- */
          <div className="space-y-6 animate-fade-in">
            <button onClick={() => setReport(null)} className="text-gray-500 hover:text-black flex items-center gap-1 mb-4 font-bold">
              <X size={18} /> ПОВЕРНУТИСЯ
            </button>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d4af37] to-[#8c7326]"></div>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Аналітичний звіт візиту</h2>
                  <h1 className="text-3xl font-black text-[#3b2f2f] uppercase">{report.pointName}</h1>
                  <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={16}/> {report.pointAddress}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{report.agentName}</p>
                  <p className="text-xs text-gray-400">Дата: {report.date}</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 mt-8 items-center border-t border-gray-100 pt-6">
                <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center rounded-full border-4 border-[#d4af37] bg-yellow-50">
                  <div className="text-center">
                    <span className="text-4xl font-black text-[#3b2f2f]">{report.complianceScore}%</span>
                    <p className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest">Оцінка</p>
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold text-sm uppercase text-gray-500 mb-2">Вердикт штучного інтелекту:</h3>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">{report.critiqueText}</p>
                </div>
              </div>
            </div>

            {role === 'supervisor' && report.supervisorActions && report.supervisorActions.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-4">
                  <Sparkles size={20} /> ОПЕРАЦІЙНІ ДІЇ ДЛЯ СУПЕРВАЙЗЕРА:
                </h3>
                <div className="space-y-3">
                  {report.supervisorActions.map((act: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start bg-white p-3 rounded-xl shadow-sm border border-orange-50">
                      <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">{i+1}</div>
                      <p className="text-sm text-gray-800 mt-0.5">{act}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-black text-xl text-[#3b2f2f] border-b-2 border-gray-200 pb-2 mt-10">АУДИТ 6 КЛЮЧОВИХ КОМПЕТЕНЦІЙ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.stepsAnalysis?.map((step: any, i: number) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-sm uppercase pr-4 leading-tight">{step.stepTitle}</h4>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-green-100 text-green-700' :
                      step.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 
                      step.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {step.status === 'completed' ? 'ВІДМІННО' : step.status === 'partial' ? 'ЧАСТКОВО' : step.status === 'failed' ? 'ПОМИЛКА' : 'ОЧІКУЄ'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 flex-grow">{step.explanation}</p>
                  {step.detectedPhrases?.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Фрази з аудіо:</p>
                      <ul className="text-xs text-gray-600 space-y-1 font-mono">
                        {step.detectedPhrases.map((ph: string, j: number) => <li key={j}>— "{ph}"</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mt-6">
              <h3 className="font-black text-lg text-[#3b2f2f] mb-4">ПОВНА ТРАНСКРИБАЦІЯ ДІАЛОГУ</h3>
              <div className="bg-[#fcfbf9] p-5 rounded-xl border border-gray-100 h-96 overflow-y-auto font-mono text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{report.transcript}</div>
            </div>
          </div>

        ) : role === 'agent' ? (
          /* ----- AGENT VIEW ----- */
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-black text-[#3b2f2f] mb-8 uppercase flex items-center gap-3">
                <Upload className="text-[#d4af37]"/> Аналіз нової презентації
              </h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Крок 1: Оберіть себе</label>
                  <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#d4af37] outline-none font-semibold text-gray-700">
                    <option value="">-- Список агентів --</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Крок 2: Назва торгової точки</label>
                  <input 
                    type="text"
                    value={selectedPointName} 
                    onChange={e => setSelectedPointName(e.target.value)} 
                    placeholder="Напр., Магазин 'Продукти'"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#d4af37] outline-none font-semibold text-gray-700"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-8 mb-8">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Крок 3: Завантажте аудіо або вставте текст</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${audioFile ? 'border-[#d4af37] bg-yellow-50' : 'border-gray-300 hover:border-[#d4af37] bg-gray-50 hover:bg-white'}`}>
                    <Upload size={32} className={audioFile ? 'text-[#d4af37]' : 'text-gray-400'} />
                    <span className="mt-3 font-bold text-sm text-center text-gray-700">{audioFile ? audioFile.name : 'ЗАВАНТАЖИТИ АУДІО'}</span>
                    <span className="text-xs text-gray-400 mt-1">MP3, M4A до 50MB</span>
                    <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleAudioUpload} />
                  </label>

                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-gray-500">
                      <FileText size={18} />
                      <span className="text-sm font-bold">Вставити готовий текст</span>
                    </div>
                    <textarea 
                      value={transcriptText}
                      onChange={e => { setTranscriptText(e.target.value); setAudioFile(null); }}
                      placeholder="Вставте сюди розшифровку діалогу..."
                      className="w-full flex-grow bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[#d4af37]"
                    ></textarea>
                  </div>
                </div>
              </div>

              <button onClick={runAnalysis} disabled={isAnalyzing || (!transcriptText && !audioFile) || !selectedPointName.trim()} className="w-full bg-[#d4af37] hover:bg-[#b8952b] text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isAnalyzing ? <><Activity className="animate-spin" /> АНАЛІЗУЮ ДІАЛОГ...</> : <><Send size={20} /> ЗАПУСТИТИ ІІ-АУДИТ</>}
              </button>
            </div>
          </div>

        ) : (
          /* ----- SUPERVISOR VIEW ----- */
          <div className="space-y-8 animate-fade-in">
            {/* МЕТРИКИ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Оцінено візитів</p>
                        <p className="text-3xl font-black text-[#3b2f2f]">{audits.length}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-full text-gray-400"><FileText size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Середній бал</p>
                        <p className="text-3xl font-black text-[#d4af37]">{avgScore}%</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-full text-[#d4af37]"><TrendingUp size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Зона ризику (&lt;70%)</p>
                        <p className="text-3xl font-black text-red-500">{criticalAudits}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-full text-red-500"><AlertTriangle size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">База Знань</p>
                        <p className="text-3xl font-black text-[#3b2f2f]">{documents.length}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-full text-gray-400"><CheckCircle size={24}/></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Col: Audits List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-gray-500 uppercase tracking-widest text-sm flex items-center gap-2"><CheckCircle size={16}/> Історія аудитів</h3>
                {audits.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-400 font-bold">Немає оцінених презентацій. Завантажте перший тест.</div>
                ) : (
                  audits.map(a => (
                    <div key={a.id} onClick={() => setReport(a)} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-[#d4af37] hover:shadow-md cursor-pointer transition-all flex justify-between items-center group">
                      <div>
                        <h4 className="font-bold text-[#3b2f2f] text-lg uppercase group-hover:text-[#d4af37] transition-colors">{a.pointName}</h4>
                        <p className="text-sm text-gray-500 font-medium">{a.agentName} • {a.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xl font-black px-4 py-2 rounded-lg ${a.complianceScore >= 80 ? 'bg-green-50 text-green-700' : a.complianceScore >= 50 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                          {a.complianceScore}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Col: Advisor & Knowledge Base */}
              <div className="space-y-6">
                {/* AI Gap Analyzer */}
                <div className="bg-gradient-to-br from-[#3b2f2f] to-[#1a1414] p-6 rounded-2xl shadow-lg text-white">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-[#d4af37] p-2 rounded-lg text-[#3b2f2f]"><Sparkles size={24}/></div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">ШІ-Адвайзер</h3>
                      <p className="text-xs text-gray-300 mt-1 opacity-80">Пошук "сліпих зон" у регламентах</p>
                    </div>
                  </div>
                  <button onClick={runGapAnalysis} disabled={isGapAnalyzing} className="w-full bg-white text-[#3b2f2f] font-black py-3 rounded-xl shadow hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                    {isGapAnalyzing ? <Activity className="animate-spin"/> : 'ЗАПУСТИТИ АУДИТ ПОВНОТИ'}
                  </button>
                  
                  {gapAnalysis && (
                    <div className="mt-4 bg-black/40 p-4 rounded-xl border border-gray-600/50 text-sm">
                      <p className="text-orange-300 font-bold mb-2">💡 Висновок ШІ:</p>
                      <p className="text-gray-200">{gapAnalysis.gap}</p>
                      <p className="text-gray-200 mt-2 font-bold text-green-400">{gapAnalysis.recommendation}</p>
                    </div>
                  )}
                </div>

                {/* Knowledge Base List */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[550px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-500 uppercase tracking-widest text-sm flex items-center gap-2"><FileText size={16}/> База Знань ({documents.length})</h3>
                    {/* КНОПКА ДОДАТИ ДОКУМЕНТ */}
                    <button 
                      onClick={() => setIsAddDocModalOpen(true)}
                      className="bg-gray-100 hover:bg-[#d4af37] hover:text-white text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14}/> Додати
                    </button>
                  </div>
                  <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-sm text-[#3b2f2f] leading-tight pr-2">{doc.title}</h4>
                          <span className="w-2 h-2 rounded-full bg-[#d4af37] mt-1.5 flex-shrink-0"></span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{doc.category}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* МОДАЛКА ДОДАВАННЯ РЕГЛАМЕНТУ */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#3b2f2f] p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><Plus size={18}/> Нове правило / Регламент</h3>
              <button onClick={() => setIsAddDocModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 flex-grow overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Назва (напр. "Правило спілкування з продавцем")</label>
                <input 
                  type="text" 
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#d4af37] outline-none font-semibold text-gray-700"
                  placeholder="Введіть коротку назву..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Суть правила (для ІІ)</label>
                <textarea 
                  value={newDocContent}
                  onChange={e => setNewDocContent(e.target.value)}
                  className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#d4af37] outline-none text-sm text-gray-700 resize-none"
                  placeholder="Опишіть, як ІІ повинен реагувати або що повинен вимагати від агента..."
                />
                <p className="text-xs text-gray-400 mt-2">Цей текст одразу буде завантажений в пам'ять ШІ і застосовуватиметься при наступних аудитах.</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setIsAddDocModalOpen(false)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-xl transition-colors">
                СКАСУВАТИ
              </button>
              <button onClick={handleAddDocument} className="flex-1 bg-[#d4af37] hover:bg-[#b8952b] text-white font-black py-3 rounded-xl transition-colors shadow-md">
                ЗБЕРЕГТИ ПРАВИЛО
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
