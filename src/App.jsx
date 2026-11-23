import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ChevronDown, Send, AlertTriangle } from 'lucide-react';

// ============================================================================
// НАСТРОЙКИ ПОДКЛЮЧЕНИЯ К GOOGLE ТАБЛИЦЕ (через Apps Script)
// ============================================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-tFsTrpz3iqxIESVW1LsHhv51aoVDqHdOdM1aGcvZiYfFXqWPuIiLWmrATGF325h-9Q/exec';
// Код клиента берётся из адреса страницы: ?token=КОД. Если его нет — используется код по умолчанию.
// Коды лежат в листе «_Клиенты», колонка C.

const DEFAULT_TOKEN = '5de8cc34cafa4f08b469bc46391858dc';

const POLL_MS = 12000;

// ============================================================================
// JSONP: единственный способ, который стабильно работает с Apps Script из браузера (без CORS)
// ============================================================================
function jsonp(params, timeoutMs = 45000) {
  return new Promise((resolve) => {
    const cb = 'solid_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    const s = document.createElement('script');
    let done = false;
    let timer = null;
    const end = (r) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
      resolve(r);
    };
    timer = setTimeout(() => end({ ok: false, error: 'network' }), timeoutMs);
    window[cb] = end;
    s.onerror = () => end({ ok: false, error: 'network' });
    const q = Object.keys(params)
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
    s.src = `${SCRIPT_URL}?client=1&${q}&callback=${cb}&_t=${Date.now()}`;
    document.body.appendChild(s);
  });
}

// ============================================================================
// ПРИЧИНЫ ОТКАЗОВ: на случай старых названий в данных
// ============================================================================
function normalizeReasonKey(raw) {
  const clean = String(raw || '').trim();
  if (!clean) return 'Другое';
  const l = clean.toLowerCase();
  if (/зарплат|оплат|бюджет|\bзп\b/.test(l)) return 'Зарплатные ожидания';
  if (/опыт/.test(l)) return 'Недостаточно опыта';
  if (/соискател|кандидат|кондидат/.test(l)) return 'Отказ кандидата';
  if (/локац|удален|график/.test(l)) return 'Локация / график';
  if (/не выходит|связ|недозвон/.test(l)) return 'Не выходит на связь';
  if (/заказчик/.test(l)) return 'Отклонен заказчиком';
  return clean;
}

function mergeReasons(obj = {}) {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    const n = Number(v) || 0;
    if (n <= 0) return;
    const key = normalizeReasonKey(k);
    out[key] = (out[key] || 0) + n;
  });
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

const SHORT_STAGE = {
  'Отобрано по резюме': 'Отобрано',
  'На оценке': 'Оценка',
  'На согласовании у клиента': 'На согласовании у вас',
  'Интервью с клиентом': 'Интервью',
  'Решение по кандидату': 'Решение',
  Оффер: 'Оффер',
  'Вышел на работу': 'Вышли на работу',
};

const isReject = (s) => /^отказ/i.test(String(s || ''));

function stageTone(status) {
  const s = String(status || '').toLowerCase();
  if (isReject(s)) return 'bg-[#F3E6E6] text-[#9B2C2C]';
  if (/оффер|вышел/.test(s)) return 'bg-[#E3F1E4] text-[#035A07]';
  if (/соглас|интервью|решени/.test(s)) return 'bg-[#E1F2F0] text-[#0E8C7F]';
  if (/оценк|скрининг/.test(s)) return 'bg-[#FBF0DC] text-[#8A5A14]';
  return 'bg-[#F0F1F1] text-[#444]';
}

const ERR_TEXT = {
  forbidden: 'Ссылка недействительна. Обратитесь к вашему менеджеру.',
  network: 'Нет связи с сервером. Проверьте интернет или адрес веб-приложения.',
  server: 'Ошибка на сервере. Попробуйте позже.',
  busy: 'Сервер занят, повторите через минуту.',
  rate: 'Слишком часто. Подождите пару секунд.',
  limit: 'Достигнут лимит сообщений в час.',
  empty: 'Введите текст сообщения.',
  state: 'Статус встречи уже изменился.',
  not_found: 'Встреча не найдена.',
  when_required: 'Укажите, когда вам удобно.',
};
const errText = (c) => ERR_TEXT[c] || 'Не удалось выполнить запрос.';

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const token = (params.get('token') || DEFAULT_TOKEN).trim();
  const [portal, setPortal] = useState(null); // { vacancies, meetings }
  const [analytics, setAnalytics] = useState(null);
  const [portalErr, setPortalErr] = useState('');
  const [analyticsErr, setAnalyticsErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVacancy, setSelectedVacancy] = useState('__all__');
  const [tab, setTab] = useState('active');

  // Чат
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [chatNote, setChatNote] = useState('');
  const lastTs = useRef(0);
  const seen = useRef({});
  const chatBox = useRef(null);

  // Встречи
  const [proposeId, setProposeId] = useState(null);
  const [propWhen, setPropWhen] = useState('');
  const [propComment, setPropComment] = useState('');
  const [busyMeeting, setBusyMeeting] = useState('');

  useEffect(() => {
    const id = 'solid-hr-jost-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // ------------------------------------------------------------- загрузка данных
  const loadPortal = useCallback(async () => {
    const r = await jsonp({ token });
    if (r && r.error) { setPortalErr(r.error); return; }
    if (r && Array.isArray(r.vacancies)) { setPortal(r); setPortalErr(''); } else setPortalErr('server');
  }, [token]);

  const loadAnalytics = useCallback(async () => {
    const r = await jsonp({ token, action: 'analytics' });
    if (r && r.ok && r.data) { setAnalytics(r.data); setAnalyticsErr(''); }
    else setAnalyticsErr((r && r.error) || 'server');
  }, [token]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPortal(), loadAnalytics()]);
    setLoading(false);
  }, [loadPortal, loadAnalytics]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ------------------------------------------------------------- чат
  const mergeMessages = useCallback((list, fromPoll) => {
    let added = 0;
    const fresh = [];
    (list || []).forEach((m) => {
      if (!m || seen.current[m.id]) return;
      seen.current[m.id] = true;
      fresh.push(m);
      added++;
    });
    if (fromPoll) (list || []).forEach((m) => { if (m && m.ts > lastTs.current) lastTs.current = m.ts; });
    if (added) setMessages((prev) => [...prev, ...fresh].sort((a, b) => a.ts - b.ts));
  }, []);

  useEffect(() => {
    let stop = false;
    let busy = false;
    const poll = async () => {
      if (busy || document.hidden || stop) return;
      busy = true;
      const r = await jsonp({ token, action: 'chat_get', since: lastTs.current }, 20000);
      busy = false;
      if (r && r.ok) mergeMessages(r.messages, true);
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, [token, mergeMessages]);

  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setChatNote('Отправляю…');
    const r = await jsonp({ token, action: 'chat_send', text }, 20000);
    if (r && r.ok) {
      setDraft('');
      if (r.message) mergeMessages([r.message], false);
      setChatNote('Сообщение отправлено рекрутёру');
    } else setChatNote(errText(r && r.error));
    setTimeout(() => setChatNote(''), 3500);
  };

  // ------------------------------------------------------------- встречи
  const replyMeeting = async (id, reply, when = '', comment = '') => {
    setBusyMeeting(id);
    const r = await jsonp({ token, action: 'meeting', id, reply, when, comment }, 30000);
    setBusyMeeting('');
    if (!(r && r.ok)) alert(errText(r && r.error));
    setProposeId(null); setPropWhen(''); setPropComment('');
    loadPortal();
  };

  // ------------------------------------------------------------- производные данные
  const vacancies = portal?.vacancies || [];
  const meetings = portal?.meetings || [];

  const vacancyNames = useMemo(() => [...new Set(vacancies.map((v) => v.vacancy))], [vacancies]);

  const shownVacancies = useMemo(
    () => (selectedVacancy === '__all__' ? vacancies : vacancies.filter((v) => v.vacancy === selectedVacancy)),
    [vacancies, selectedVacancy]
  );

  const stats = useMemo(() => {
    if (!analytics) return null;
    if (selectedVacancy === '__all__') return analytics.overall;
    return (analytics.vacancies || []).find((v) => v.vacancy === selectedVacancy) || analytics.overall;
  }, [analytics, selectedVacancy]);

  const reasons = useMemo(() => (stats ? mergeReasons(stats.reasons) : []), [stats]);
  const maxFunnel = Math.max(1, ...((stats?.funnel || []).map((f) => f.count)));
  const maxWeek = Math.max(1, ...(stats?.weekly?.added || [1]), ...(stats?.weekly?.presented || [1]));
  const maxReason = Math.max(1, ...reasons.map(([, n]) => n));

  const totalCandidates = shownVacancies.reduce((a, v) => a + (v.candidates || []).length, 0);
  const totalRejects = shownVacancies.reduce((a, v) => a + (v.candidates || []).filter((c) => isReject(c.status)).length, 0);
     const isFinal = (s) => /^(оффер|вышел)/i.test(String(s || ''));
  const finalCount = shownVacancies.reduce(
    (a, v) => a + (v.candidates || []).filter((c) => isFinal(c.status)).length, 0);
  const waitingClient = shownVacancies.reduce(
    (a, v) => a + (v.candidates || []).filter((c) => /соглас|интервью|решени/i.test(c.status)).length, 0);
  const inWork = totalCandidates - totalRejects - finalCount;
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // ------------------------------------------------------------- состояния ошибок
  if (portalErr === 'forbidden') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-[Jost,sans-serif] text-center px-6">
        <div>
          <AlertTriangle className="w-8 h-8 mx-auto text-[#D9962B]" />
          <p className="mt-4 text-lg">{errText('forbidden')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] font-[Jost,sans-serif]">
      {/* Шапка */}
      <header className="sticky top-0 z-30 bg-[#F6F7F8]/95 backdrop-blur border-b border-[#E5E7E6]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="text-base font-semibold tracking-tight">
            Solid <span className="text-[#0E8C7F]">HR.</span>
          </div>
          <nav className="hidden sm:flex items-center gap-7 text-sm">
            <button type="button" onClick={() => scrollTo('candidates')} className="hover:text-[#035A07]">Кандидаты</button>
            <button type="button" onClick={() => scrollTo('chat')} className="hover:text-[#035A07]">Чат</button>
            <button type="button" onClick={() => scrollTo('analytics')} className="hover:text-[#035A07]">Аналитика</button>
          </nav>
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 bg-[#035A07] text-white hover:bg-[#024605] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#035A07] text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12">
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">Кабинет заказчика</p>
          <h1 className="text-3xl sm:text-5xl font-light mt-3">{portal?.company || 'Загрузка…'}</h1>
          <p className="text-sm opacity-80 mt-4">
            {portal
              ? `Обновлено: ${vacancies[0]?.updated || '—'}`
              : portalErr
              ? errText(portalErr)
              : 'Загружаем данные из таблицы…'}
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div><p className="text-3xl font-light">{totalCandidates}</p><p className="text-xs opacity-80 mt-1">Всего кандидатов</p></div>
            <div><p className="text-3xl font-light">{inWork}</p><p className="text-xs opacity-80 mt-1">В работе</p></div>
            <div><p className="text-3xl font-light">{waitingClient + finalCount}</p><p className="text-xs opacity-80 mt-1">У вас / финал</p></div>
            <div><p className="text-3xl font-light">{totalRejects}</p><p className="text-xs opacity-80 mt-1">Отказы</p></div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
        {portalErr && portalErr !== 'forbidden' && (
          <div className="mt-6 p-4 border-l-2 border-[#D9962B] bg-[#F6F7F8] text-sm flex items-center justify-between gap-4">
            <span>{errText(portalErr)}</span>
            <button type="button" onClick={refreshAll} className="underline underline-offset-4">Повторить</button>
          </div>
        )}

        {/* Фильтр вакансий */}
        <div className="pt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="relative">
            <select
              value={selectedVacancy}
              onChange={(e) => setSelectedVacancy(e.target.value)}
              className="appearance-none bg-[#F6F7F8] border border-[#B8C2BB] text-sm pl-4 pr-9 py-2.5 outline-none cursor-pointer"
            >
              <h1 className="text-3xl sm:text-5xl font-light mt-3">{portal?.company || 'Загрузка…'}</h1>
              {vacancyNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-[#6B6F6E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Собеседования */}
        {meetings.length > 0 && (
          <section className="pt-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Собеседования</p>
            <ul className="mt-4 divide-y divide-[#E5E7E6] border-y border-[#E5E7E6]">
              {meetings.map((m) => (
                <li key={m.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p><b className="font-medium">{m.candidate}</b> <span className="text-[#6B6F6E] text-sm">· {m.vacancy}</span></p>
                    <span className="text-xs px-2 py-0.5 bg-[#F6F7F8] border border-[#E5E7E6]">{m.status}</span>
                  </div>
                  <p className="text-sm mt-1">
                    {m.date}{m.time ? `, ${m.time}` : ''}{m.weekday ? ` (${m.weekday})` : ''}
                  </p>
                  <p className="text-xs text-[#6B6F6E] mt-1">
                    {[m.format, m.place, m.interviewer ? `Проводит: ${m.interviewer}` : ''].filter(Boolean).join(' · ')}
                  </p>
                  {m.proposed && (
                    <p className="text-xs text-[#0E8C7F] mt-1">Вы предложили: {m.proposed}{m.comment ? ` — ${m.comment}` : ''}</p>
                  )}
                  {(m.canConfirm || m.canPropose) && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {m.canConfirm && (
                        <button
                          type="button"
                          disabled={busyMeeting === m.id}
                          onClick={() => replyMeeting(m.id, 'confirm')}
                          className="text-sm px-4 py-2 bg-[#035A07] text-white hover:bg-[#024605] disabled:opacity-60"
                        >
                          {busyMeeting === m.id ? 'Отправляю…' : 'Подтвердить'}
                        </button>
                      )}
                      {m.canPropose && (
                        <button
                          type="button"
                          onClick={() => setProposeId(proposeId === m.id ? null : m.id)}
                          className="text-sm px-4 py-2 border border-[#B8C2BB] hover:border-[#111111]"
                        >
                          Другое время
                        </button>
                      )}
                    </div>
                  )}
                  {proposeId === m.id && (
                    <div className="mt-3 space-y-2 max-w-md">
                      <input
                        value={propWhen}
                        onChange={(e) => setPropWhen(e.target.value)}
                        maxLength={60}
                        placeholder="Когда вам удобно? Например: 7 ноября, 16:00"
                        className="w-full border border-[#B8C2BB] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                      />
                      <input
                        value={propComment}
                        onChange={(e) => setPropComment(e.target.value)}
                        maxLength={300}
                        placeholder="Комментарий (необязательно)"
                        className="w-full border border-[#B8C2BB] px-3 py-2 text-sm outline-none focus:border-[#111111]"
                      />
                      <button
                        type="button"
                        disabled={!propWhen.trim() || busyMeeting === m.id}
                        onClick={() => replyMeeting(m.id, 'propose', propWhen.trim(), propComment.trim())}
                        className="text-sm px-4 py-2 bg-[#111111] text-white disabled:opacity-50"
                      >
                        Отправить
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Кандидаты */}
        <section id="candidates" className="pt-14">
          <div className="flex gap-7 text-sm border-b border-[#E5E7E6] mb-4">
            {[
              ['all', 'Все кандидаты'],
              ['active', 'В работе'],
              ['reject', 'Отказы'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`pb-3 -mb-px border-b-2 ${tab === key ? 'border-[#111111]' : 'border-transparent text-[#6B6F6E] hover:text-[#111111]'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {!portal && !portalErr && <p className="py-10 text-center text-[#6B6F6E]">Загружаем кандидатов…</p>}

          {shownVacancies.map((v, i) => {
            const list = (v.candidates || []).filter((c) =>
              tab === 'all' ? true : tab === 'reject' ? isReject(c.status) : !isReject(c.status));
            return (
              <details key={`${v.company}-${v.vacancy}-${i}`} open={i === 0} className="border border-[#E5E7E6] mb-4">
                <summary className="cursor-pointer select-none px-4 py-3 bg-[#F6F7F8] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{v.vacancy}</span>
                  <span className="text-xs text-[#6B6F6E]">Показано: {list.length} из {(v.candidates || []).length}</span>
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-[#6B6F6E] border-b border-[#E5E7E6]">
                        <th className="px-4 py-2 font-normal">Кандидат</th>
                        <th className="px-4 py-2 font-normal">Этап</th>
                        <th className="px-4 py-2 font-normal">Дата этапа</th>
                        <th className="px-4 py-2 font-normal">SLA</th>
                        <th className="px-4 py-2 font-normal">Комментарий рекрутёра</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-[#6B6F6E]">Нет кандидатов в выбранном фильтре</td></tr>
                      ) : list.map((c, k) => (
                        <tr key={k} className="border-b border-[#EEF0EF]">
                          <td className="px-4 py-3 font-medium">{c.fio}</td>
                          <td className="px-4 py-3"><span className={`text-xs px-2 py-1 ${stageTone(c.status)}`}>{c.status}</span></td>
                          <td className="px-4 py-3 text-[#6B6F6E] whitespace-nowrap">{c.date}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{c.sla || '—'}</td>
                          <td className="px-4 py-3 text-[#444] max-w-sm">{c.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </section>

        {/* Чат */}
        <section id="chat" className="pt-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Чат с рекрутёром</p>
          <div ref={chatBox} className="mt-4 max-h-80 overflow-y-auto space-y-3 border border-[#E5E7E6] p-4">
            {messages.length === 0 && <p className="text-sm text-[#6B6F6E] text-center py-6">Сообщений пока нет.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 text-sm ${m.from === 'client' ? 'bg-[#035A07] text-white' : 'bg-[#F6F7F8] border border-[#E5E7E6]'}`}>
                  <p className={`text-[11px] mb-0.5 ${m.from === 'client' ? 'text-white/70' : 'text-[#0E8C7F]'}`}>{m.name}{m.when ? ` · ${m.when}` : ''}</p>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="mt-4 flex gap-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder="Напишите сообщение рекрутёру…"
              className="flex-1 border-b border-[#B8C2BB] focus:border-[#111111] outline-none py-2 text-sm"
            />
            <button type="submit" className="inline-flex items-center gap-2 text-sm px-5 py-2 border border-[#111111] hover:bg-[#111111] hover:text-white">
              <Send className="w-3.5 h-3.5" /> Отправить
            </button>
          </form>
          {chatNote && <p className="text-xs text-[#0E8C7F] mt-2">{chatNote}</p>}
        </section>

        {/* Аналитика */}
        <section id="analytics" className="pt-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Аналитика подбора</p>

          {analyticsErr && (
            <div className="mt-4 p-4 border-l-2 border-[#D9962B] bg-[#F6F7F8] text-sm flex items-center justify-between gap-4">
              <span>Аналитику не удалось загрузить: {errText(analyticsErr)}</span>
              <button type="button" onClick={loadAnalytics} className="underline underline-offset-4">Повторить</button>
            </div>
          )}
          {!stats && !analyticsErr && <p className="py-10 text-[#6B6F6E]">Считаем данные…</p>}

          {stats && (
            <>
              <h2 className="text-2xl sm:text-3xl font-light mt-2">{stats.vacancy}</h2>
              <p className="text-xs text-[#6B6F6E] mt-1">
                {stats.since ? `В работе с ${stats.since} (${stats.daysOpen} дн.) · ` : ''}Обновлено: {analytics.generated}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 py-8 border-b border-[#E5E7E6]">
                {[
                  [stats.total, 'Кандидатов всего'],
                  [stats.active, 'Активно в работе'],
                  [stats.presented, 'Представлено вам'],
                  [`${stats.offers} / ${stats.hired}`, 'Офферы / вышли'],
                  [stats.rejected, 'Отказов'],
                ].map(([val, label]) => (
                  <div key={label}>
                    <p className="text-3xl font-light">{val}</p>
                    <p className="text-xs text-[#6B6F6E] mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Воронка */}
              <div className="py-10 border-b border-[#E5E7E6] space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E] mb-4">Воронка и конверсия</p>
                {(stats.funnel || []).map((row, idx) => (
                  <div key={row.stage} className="grid grid-cols-12 items-center gap-3 text-sm">
                    <div className="col-span-5 sm:col-span-3 truncate">{SHORT_STAGE[row.stage] || row.stage}</div>
                    <div className="col-span-4 sm:col-span-6">
                      <div className="h-2.5 bg-[#F6F7F8]">
                        <div className={idx >= 5 ? 'h-full bg-[#035A07]' : 'h-full bg-[#0E8C7F]'}
                          style={{ width: `${row.count > 0 ? Math.max(2, Math.round((row.count / maxFunnel) * 100)) : 0}%` }} />
                      </div>
                    </div>
                    <div className="col-span-3 flex justify-end items-baseline gap-2">
                      <span className="tabular-nums">{row.count}</span>
                      <span className="text-[11px] text-[#6B6F6E] hidden sm:inline w-24">
                        {row.conv === null || row.conv === undefined ? '' : `${row.conv}% от пред.`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Сроки и недели */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-10 border-b border-[#E5E7E6]">
                <div className="lg:col-span-5 space-y-4 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Сроки</p>
                  <p>
                    {stats.waitingNow?.count > 0
                      ? `Ожидают вашего решения: ${stats.waitingNow.count} (в среднем ${stats.waitingNow.avgDays} дн.)`
                      : 'Нет кандидатов, ожидающих вашего решения.'}
                  </p>
                  {stats.waitDone?.count >= 3 && <p>Среднее время вашего решения: {stats.waitDone.avg} дн. (случаев: {stats.waitDone.count})</p>}
                  <p className="text-[#6B6F6E]">
                    {stats.offerDays?.count >= 3
                      ? `До оффера: ${stats.offerDays.median} дн. (медиана, случаев: ${stats.offerDays.count})`
                      : `Время до оффера: накапливаем данные (нужно не меньше 3 случаев, пока ${stats.offerDays?.count || 0}).`}
                  </p>
                </div>
                <div className="lg:col-span-7">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Динамика по неделям</p>
                  <div className="mt-4 h-44 flex items-end justify-between gap-2 px-2 bg-[#F6F7F8]/60 border border-[#E5E7E6] pt-4">
                    {(stats.weekly?.labels || []).map((label, i) => {
                      const a = stats.weekly.added[i] || 0;
                      const p = stats.weekly.presented[i] || 0;
                      return (
                        <div key={label} className="flex-1 flex flex-col items-center">
                          <div className="flex items-end gap-1 h-32">
                            <div className="w-3 sm:w-4 bg-[#0E8C7F]" title={`Новые: ${a}`} style={{ height: `${a > 0 ? Math.max(6, (a / maxWeek) * 120) : 2}px` }} />
                            <div className="w-3 sm:w-4 bg-[#035A07]" title={`Представлено: ${p}`} style={{ height: `${p > 0 ? Math.max(6, (p / maxWeek) * 120) : 2}px` }} />
                          </div>
                          <span className="text-[10px] text-[#6B6F6E] mt-2">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[#6B6F6E] mt-2">
                    <span className="inline-block w-2.5 h-2.5 bg-[#0E8C7F] mr-1" />новые кандидаты &nbsp;
                    <span className="inline-block w-2.5 h-2.5 bg-[#035A07] mr-1" />представлено вам
                  </p>
                </div>
              </div>

              {/* Причины отказов */}
              {reasons.length > 0 && (
                <div className="py-10">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E] mb-4">
                    Причины отказов (всего: {stats.rejected})
                  </p>
                  <div className="space-y-3">
                    {reasons.map(([name, n]) => (
                      <div key={name} className="grid grid-cols-12 items-center gap-3 text-sm">
                        <div className="col-span-5 sm:col-span-3 truncate">{name}</div>
                        <div className="col-span-5 sm:col-span-7">
                          <div className="h-2.5 bg-[#F6F7F8]">
                            <div className="h-full bg-[#111111]/80" style={{ width: `${Math.max(2, Math.round((n / maxReason) * 100))}%` }} />
                          </div>
                        </div>
                        <div className="col-span-2 text-right tabular-nums">{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-[#6B6F6E] pt-6 border-t border-[#E5E7E6] leading-relaxed">
                {analytics.journalSince ? `Журнал этапов ведётся с ${analytics.journalSince}: конверсия и сроки уточняются по мере накопления данных. ` : ''}
                Персональные данные кандидатов скрыты.
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-[#E5E7E6] py-8 text-center text-xs text-[#6B6F6E]">
        Solid HR · Кабинет клиента
      </footer>
    </div>
  );
}