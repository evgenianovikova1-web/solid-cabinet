import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  ArrowUpRight,
  Clock,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Link2,
  Info,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// НОРМАЛИЗАЦИЯ ПРИЧИН ОТКАЗОВ
// Объединяет «Недостаточная оплата», «Не устроила ЗП» и аналоги в «Зарплатные ожидания»
// ============================================================================
const REASON_ALIASES = {
  'недостаточная оплата': 'Зарплатные ожидания',
  'недостаточно оплаты': 'Зарплатные ожидания',
  'не устроила зп': 'Зарплатные ожидания',
  'не сошлись по зп': 'Зарплатные ожидания',
  'финансовые ожидания': 'Зарплатные ожидания',
  'высокие зарплатные ожидания': 'Зарплатные ожидания',
  'зарплата': 'Зарплатные ожидания',
  'зп': 'Зарплатные ожидания',
  'зарплатные ожидания': 'Зарплатные ожидания',
  'недостаточно опыта': 'Недостаточно опыта',
  'мало опыта': 'Недостаточно опыта',
  'отказ кандидата': 'Отказ кандидата',
  'кандидат отказался': 'Отказ кандидата',
  'принял другой оффер': 'Отказ кандидата',
  'отклонен заказчиком': 'Отклонен заказчиком',
  'отказ клиента': 'Отклонен заказчиком',
  'не выходит на связь': 'Не выходит на связь',
  'недозвон': 'Не выходит на связь',
  'локация / график': 'Локация / график',
  'локация': 'Локация / график',
  'график работы': 'Локация / график',
};

function normalizeReasonKey(rawKey) {
  const clean = String(rawKey || '').trim();
  if (!clean) return 'Другое';
  const lower = clean.toLowerCase();
  if (REASON_ALIASES[lower]) return REASON_ALIASES[lower];
  if (
    lower.includes('оплат') ||
    lower.includes('зарплат') ||
    lower.includes('зп') ||
    lower.includes('ожидан') ||
    lower.includes('деньг')
  ) {
    return 'Зарплатные ожидания';
  }
  if (lower.includes('опыт') || lower.includes('квалифик')) {
    return 'Недостаточно опыта';
  }
  if (lower.includes('локац') || lower.includes('график') || lower.includes('удален')) {
    return 'Локация / график';
  }
  if (lower.includes('связ') || lower.includes('недозвон') || lower.includes('пропал')) {
    return 'Не выходит на связь';
  }
  return clean;
}

function mergeRejectReasons(reasonsObj = {}) {
  const merged = {};
  Object.entries(reasonsObj).forEach(([key, count]) => {
    const val = Number(count) || 0;
    if (val <= 0) return;
    const norm = normalizeReasonKey(key);
    merged[norm] = (merged[norm] || 0) + val;
  });
  return merged;
}

// ============================================================================
// ДЕМО-ДАННЫЕ КАНДИДАТОВ И АНАЛИТИКИ (соответствуют формату getAnalytics_ из Analytics.gs)
// ============================================================================
const INITIAL_CANDIDATES = [
  {
    id: 1,
    name: 'Алексей Смирнов',
    vacancy: 'Старший дизайнер продукции',
    role: 'Senior Product Designer',
    experience: '7 лет',
    salary: '280 000 ₽',
    location: 'Москва (удаленно / гибрид)',
    status: 'action_required',
    daysWaiting: 3,
    addedDate: '11.11.2026',
    solidSummary:
      'Опыт в fintech и SaaS-продуктах. Системный подход к дизайн-системам, сильная продуктовая аналитика и защита решений на языке метрик.',
    tags: ['Figma', 'Design Systems', 'UX Research', 'Fintech'],
    cvUrl: '#cv-1',
  },
  {
    id: 2,
    name: 'Мария Кузнецова',
    vacancy: 'Старший дизайнер продукции',
    role: 'Senior Product Designer',
    experience: '5 лет',
    salary: '250 000 ₽',
    location: 'Санкт-Петербург',
    status: 'interview_scheduled',
    daysWaiting: 1,
    addedDate: '08.11.2026',
    interviewTime: 'Завтра, 17 ноября в 15:00',
    solidSummary:
      'Сильный визуал и опыт проектирования сложных B2B-дашбордов. Успешно защитила продуктовый кейс на техническом скрининге.',
    tags: ['B2B SaaS', 'Figma', 'Web & Mobile', 'Prototyping'],
    cvUrl: '#cv-2',
  },
  {
    id: 3,
    name: 'Дмитрий Волков',
    vacancy: 'Старший дизайнер продукции',
    role: 'Lead / Senior Product Designer',
    experience: '6 лет',
    salary: '270 000 ₽',
    location: 'Москва (гибрид)',
    status: 'action_required',
    daysWaiting: 2,
    addedDate: '13.11.2026',
    solidSummary:
      'Вел редизайн клиентского портала в крупном e-commerce (+18% к конверсии чекаута). Самостоятельно проводит глубинные интервью.',
    tags: ['E-commerce', 'CJM', 'JTBD', 'Design Tokens'],
    cvUrl: '#cv-3',
  },
  {
    id: 4,
    name: 'Екатерина Орлова',
    vacancy: 'Руководитель отдела продаж',
    role: 'Head of B2B Sales',
    experience: '8 лет',
    salary: '320 000 ₽',
    location: 'Москва (офис)',
    status: 'interview_requested',
    daysWaiting: 1,
    addedDate: '05.11.2026',
    solidSummary:
      'Построила отдел корпоративных продаж с нуля до 14 человек. Выполнение годового плана 116%, опыт внедрения CRM и воронки.',
    tags: ['B2B Sales', 'Управленческий учет', 'amoCRM', 'Enterprise'],
    cvUrl: '#cv-4',
  },
];

// Пресеты аналитики в точном формате ответа getAnalytics_() из Google Apps Script
const ANALYTICS_PRESETS = {
  penoterm: {
    companyTitle: 'Пенотерм',
    recruiter: 'Надежда',
    heroVacancy: 'Производственный и коммерческий подбор',
    deadlineNote: 'Активно 4 вакансии · Обновление из таблицы в реальном времени',
    analytics: {
      generated: '16.11.2026 11:38',
      journalSince: '26.10.2026',
      journalDays: 21,
      overall: {
        vacancy: 'Все вакансии компании (Пенотерм)',
        since: '28.09.2026',
        daysOpen: 49,
        total: 439,
        active: 50,
        rejected: 389,
        presented: 12,
        offers: 2,
        hired: 1,
        funnel: [
          { stage: 'Отобрано по резюме', count: 439, conv: null },
          { stage: 'На оценке', count: 29, conv: 7 },
          { stage: 'На согласовании у клиента', count: 12, conv: 41 },
          { stage: 'Интервью с клиентом', count: 6, conv: 50 },
          { stage: 'Решение по кандидату', count: 3, conv: 50 },
          { stage: 'Оффер', count: 2, conv: 67 },
          { stage: 'Вышел на работу', count: 1, conv: 50 },
        ],
        waitingNow: { count: 1, avgDays: 3 },
        // Включаем «Недостаточная оплата» специально, чтобы показать автоматическое слияние с «Зарплатные ожидания»
        reasons: {
          'Отказ кандидата': 197,
          'Зарплатные ожидания': 72,
          'Недостаточная оплата': 15,
          'Недостаточно опыта': 43,
          'Другое': 25,
          'Отклонен заказчиком': 22,
          'Не выходит на связь': 12,
          'Локация / график': 3,
        },
        weekly: {
          labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
          added: [34, 48, 62, 58, 74, 83, 40, 40],
          presented: [1, 1, 2, 2, 2, 2, 1, 1],
        },
        offerDays: { count: 2, median: 18.5 },
        waitDone: { count: 9, avg: 2.6 },
      },
      vacancies: [
        {
          vacancy: 'Инженер-технолог полимерного производства',
          since: '28.09.2026',
          daysOpen: 49,
          total: 184,
          active: 19,
          rejected: 165,
          presented: 5,
          offers: 1,
          hired: 1,
          funnel: [
            { stage: 'Отобрано по резюме', count: 184, conv: null },
            { stage: 'На оценке', count: 14, conv: 8 },
            { stage: 'На согласовании у клиента', count: 5, conv: 36 },
            { stage: 'Интервью с клиентом', count: 3, conv: 60 },
            { stage: 'Решение по кандидату', count: 2, conv: 67 },
            { stage: 'Оффер', count: 1, conv: 50 },
            { stage: 'Вышел на работу', count: 1, conv: 100 },
          ],
          waitingNow: { count: 1, avgDays: 3 },
          reasons: {
            'Отказ кандидата': 82,
            'Зарплатные ожидания': 34,
            'Недостаточная оплата': 8,
            'Недостаточно опыта': 21,
            'Другое': 10,
            'Отклонен заказчиком': 7,
            'Не выходит на связь': 3,
          },
          weekly: {
            labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
            added: [18, 22, 29, 24, 31, 28, 16, 16],
            presented: [0, 1, 1, 1, 1, 0, 1, 0],
          },
          offerDays: { count: 3, median: 21.0 },
          waitDone: { count: 5, avg: 2.8 },
        },
        {
          vacancy: 'Региональный менеджер по B2B-продажам',
          since: '12.10.2026',
          daysOpen: 35,
          total: 255,
          active: 31,
          rejected: 224,
          presented: 7,
          offers: 1,
          hired: 0,
          funnel: [
            { stage: 'Отобрано по резюме', count: 255, conv: null },
            { stage: 'На оценке', count: 15, conv: 6 },
            { stage: 'На согласовании у клиента', count: 7, conv: 47 },
            { stage: 'Интервью с клиентом', count: 3, conv: 43 },
            { stage: 'Решение по кандидату', count: 1, conv: 33 },
            { stage: 'Оффер', count: 1, conv: 100 },
            { stage: 'Вышел на работу', count: 0, conv: 0 },
          ],
          waitingNow: { count: 0, avgDays: null },
          reasons: {
            'Отказ кандидата': 115,
            'Зарплатные ожидания': 38,
            'Недостаточная оплата': 7,
            'Недостаточно опыта': 22,
            'Другое': 15,
            'Отклонен заказчиком': 15,
            'Не выходит на связь': 9,
            'Локация / график': 3,
          },
          weekly: {
            labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
            added: [16, 26, 33, 34, 43, 55, 24, 24],
            presented: [1, 0, 1, 1, 1, 2, 0, 1],
          },
          offerDays: { count: 1, median: 16.0 },
          waitDone: { count: 4, avg: 2.3 },
        },
      ],
    },
  },
  dom_dereva: {
    companyTitle: 'Дом Дерева',
    recruiter: 'Надежда',
    heroVacancy: 'Старший дизайнер продукции',
    deadlineNote: 'Рекрутер: Надежда · Выход финалиста до 28 ноября',
    analytics: {
      generated: '16.11.2026 11:45',
      journalSince: '26.10.2026',
      journalDays: 21,
      overall: {
        vacancy: 'Все вакансии компании (Дом Дерева)',
        since: '05.10.2026',
        daysOpen: 42,
        total: 146,
        active: 18,
        rejected: 128,
        presented: 9,
        offers: 1,
        hired: 0,
        funnel: [
          { stage: 'Отобрано по резюме', count: 146, conv: null },
          { stage: 'На оценке', count: 24, conv: 16 },
          { stage: 'На согласовании у клиента', count: 9, conv: 38 },
          { stage: 'Интервью с клиентом', count: 5, conv: 56 },
          { stage: 'Решение по кандидату', count: 2, conv: 40 },
          { stage: 'Оффер', count: 1, conv: 50 },
          { stage: 'Вышел на работу', count: 0, conv: 0 },
        ],
        waitingNow: { count: 2, avgDays: 2.5 },
        reasons: {
          'Отказ кандидата': 54,
          'Зарплатные ожидания': 29,
          'Недостаточная оплата': 9,
          'Недостаточно опыта': 19,
          'Отклонен заказчиком': 9,
          'Другое': 5,
          'Локация / график': 3,
        },
        weekly: {
          labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
          added: [0, 14, 22, 26, 24, 28, 19, 13],
          presented: [0, 1, 1, 2, 1, 2, 1, 1],
        },
        offerDays: { count: 3, median: 17.5 },
        waitDone: { count: 7, avg: 1.9 },
      },
      vacancies: [
        {
          vacancy: 'Старший дизайнер продукции',
          since: '05.10.2026',
          daysOpen: 42,
          total: 94,
          active: 11,
          rejected: 83,
          presented: 6,
          offers: 1,
          hired: 0,
          funnel: [
            { stage: 'Отобрано по резюме', count: 94, conv: null },
            { stage: 'На оценке', count: 16, conv: 17 },
            { stage: 'На согласовании у клиента', count: 6, conv: 38 },
            { stage: 'Интервью с клиентом', count: 4, conv: 67 },
            { stage: 'Решение по кандидату', count: 2, conv: 50 },
            { stage: 'Оффер', count: 1, conv: 50 },
            { stage: 'Вышел на работу', count: 0, conv: 0 },
          ],
          waitingNow: { count: 2, avgDays: 2.5 },
          reasons: {
            'Отказ кандидата': 36,
            'Зарплатные ожидания': 24,
            'Недостаточно опыта': 13,
            'Отклонен заказчиком': 6,
            'Другое': 4,
          },
          weekly: {
            labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
            added: [0, 14, 16, 15, 14, 15, 12, 8],
            presented: [0, 1, 1, 1, 1, 1, 1, 0],
          },
          offerDays: { count: 3, median: 17.5 },
          waitDone: { count: 5, avg: 1.8 },
        },
        {
          vacancy: 'Руководитель отдела продаж',
          since: '19.10.2026',
          daysOpen: 28,
          total: 52,
          active: 7,
          rejected: 45,
          presented: 3,
          offers: 0,
          hired: 0,
          funnel: [
            { stage: 'Отобрано по резюме', count: 52, conv: null },
            { stage: 'На оценке', count: 8, conv: 15 },
            { stage: 'На согласовании у клиента', count: 3, conv: 38 },
            { stage: 'Интервью с клиентом', count: 1, conv: 33 },
            { stage: 'Решение по кандидату', count: 0, conv: 0 },
            { stage: 'Оффер', count: 0, conv: null },
            { stage: 'Вышел на работу', count: 0, conv: null },
          ],
          waitingNow: { count: 0, avgDays: null },
          reasons: {
            'Отказ кандидата': 18,
            'Зарплатные ожидания': 14,
            'Недостаточно опыта': 6,
            'Отклонен заказчиком': 3,
            'Локация / график': 3,
            'Другое': 1,
          },
          weekly: {
            labels: ['28.09', '05.10', '12.10', '19.10', '26.10', '02.11', '09.11', '16.11'],
            added: [0, 0, 6, 11, 10, 13, 7, 5],
            presented: [0, 0, 0, 1, 0, 1, 0, 1],
          },
          offerDays: { count: 0, median: null },
          waitDone: { count: 2, avg: 2.1 },
        },
      ],
    },
  },
};

const STATUS = {
  action_required: { label: 'Ждём вашего решения', dot: 'bg-[#D9962B]', color: 'text-[#8A5A14]' },
  interview_requested: { label: 'Согласуем время', dot: 'bg-[#0E8C7F]', color: 'text-[#0E8C7F]' },
  interview_scheduled: { label: 'Встреча назначена', dot: 'bg-[#035A07]', color: 'text-[#035A07]' },
  rejected: { label: 'Не подходит', dot: 'bg-[#9AA39E]', color: 'text-[#6B6F6E]' },
};

const statusText = (c) =>
  c.status === 'interview_scheduled' ? `Встреча: ${c.interviewTime}` : STATUS[c.status].label;

const SHORT_STAGE_NAMES = {
  'Отобрано по резюме': 'Отобрано',
  'На оценке': 'Оценка',
  'На согласовании у клиента': 'На согласовании у вас',
  'Интервью с клиентом': 'Интервью',
  'Решение по кандидату': 'Решение по кандидату',
  'Оффер': 'Оффер',
  'Вышел на работу': 'Вышли на работу',
};

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

export default function App() {
  // Режим отображения: 'portal' (весь кабинет) или 'analytics' (автономная страница аналитики)
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'analytics' ? 'analytics' : 'portal';
  });

  // Выбранный клиентский профиль (Пенотерм из вашего скриншота или Дом Дерева)
  const [clientKey, setClientKey] = useState('penoterm');
  const [selectedVacancy, setSelectedVacancy] = useState('__all__');

  // Состояние кандидатов и чата
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [tab, setTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 101,
      from: 'recruiter',
      author: 'Надежда · Solid HR',
      time: '10:40',
      text: 'Добрый день! Добавила новых кандидатов на согласование и обновила сводку по причинам отказов за неделю.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [sentNote, setSentNote] = useState(false);

  // Живое подключение к Google Apps Script (опционально)
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [scriptUrl, setScriptUrl] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [remoteAnalytics, setRemoteAnalytics] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiNotice, setApiNotice] = useState('');
  const [showCodeTip, setShowCodeTip] = useState(false);

  // Подгружаем шрифт Jost
  useEffect(() => {
    const id = 'solid-hr-jost-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const activePreset = ANALYTICS_PRESETS[clientKey];
  const analyticsRoot = remoteAnalytics || activePreset.analytics;

  // Текущий срез аналитики (Все вакансии или конкретная вакансия)
  const currentStats = useMemo(() => {
    let base = analyticsRoot.overall;
    if (selectedVacancy !== '__all__') {
      const found = (analyticsRoot.vacancies || []).find((v) => v.vacancy === selectedVacancy);
      if (found) base = found;
    }

    // Нормализуем и объединяем причины отказов (например, «Недостаточная оплата» + «Зарплатные ожидания»)
    const mergedReasons = mergeRejectReasons(base.reasons);
    const sortedReasons = Object.entries(mergedReasons).sort((a, b) => b[1] - a[1]);
    const totalRejectionsFromReasons = sortedReasons.reduce((acc, [, n]) => acc + n, 0);

    return {
      ...base,
      sortedReasons,
      rejectedTotal: base.rejected || totalRejectionsFromReasons,
    };
  }, [analyticsRoot, selectedVacancy]);

  const actionCount = candidates.filter((c) => c.status === 'action_required').length;
  const filteredCandidates = candidates.filter(
    (c) => tab === 'all' || c.status === 'action_required'
  );

  const handleApprove = (id) =>
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'interview_requested' } : c))
    );

  const handleReject = (id) =>
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c))
    );

  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    setMessages((prev) => [...prev, { id: Date.now(), text, from: 'me', time: timeStr }]);
    setDraft('');
    setSentNote(true);
    setTimeout(() => setSentNote(false), 2500);
  };

  // Обновление данных (из Google Apps Script если указан URL/токен, либо мгновенное обновление демо-среза)
  const handleRefreshAnalytics = async () => {
    setIsRefreshing(true);
    setApiNotice('');
    try {
      if (scriptUrl.trim() && clientToken.trim()) {
        const sep = scriptUrl.includes('?') ? '&' : '?';
        const url = `${scriptUrl.trim()}${sep}client=1&action=analytics&token=${encodeURIComponent(
          clientToken.trim()
        )}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.ok && json.data) {
          setRemoteAnalytics(json.data);
          setSelectedVacancy('__all__');
          setApiNotice('Данные успешно загружены из вашей Google Таблицы');
        } else {
          setApiNotice('Ответ получен, но токен не найден или доступ закрыт (ошибка forbidden)');
        }
      } else {
        await new Promise((r) => setTimeout(r, 380));
        setApiNotice('Данные аналитики актуальны');
      }
    } catch (err) {
      setApiNotice('Не удалось подключиться к веб-приложению Apps Script — проверьте URL');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setApiNotice(''), 4000);
    }
  };

  const scrollTo = (id) => {
    if (viewMode === 'analytics' && id !== 'analytics') {
      setViewMode('portal');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Максимальные значения для графиков
  const maxFunnelCount = Math.max(
    1,
    ...(currentStats.funnel || []).map((f) => Number(f.count) || 0)
  );
  const maxWeeklyVal = Math.max(
    1,
    ...(currentStats.weekly?.added || [1]),
    ...(currentStats.weekly?.presented || [1])
  );
  const maxReasonVal = Math.max(
    1,
    ...(currentStats.sortedReasons || []).map(([, val]) => val)
  );

  return (
    <div className="min-h-screen bg-white text-[#111111] font-[Jost,sans-serif] selection:bg-[#035A07] selection:text-white">
      {/* Шапка */}
      <header className="sticky top-0 z-30 bg-[#F6F7F8]/95 backdrop-blur border-b border-[#E5E7E6]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setViewMode('portal')}
              className="flex items-center gap-1.5 text-left"
            >
              <span className="text-base font-semibold tracking-tight">Solid</span>
              <span className="text-base font-semibold tracking-tight text-[#0E8C7F]">HR.</span>
            </button>

            {/* Переключатель режима: Весь кабинет / Автономная аналитика */}
            <div className="hidden md:inline-flex items-center bg-white border border-[#E5E7E6] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('portal')}
                className={`px-3 py-1 transition ${
                  viewMode === 'portal'
                    ? 'bg-[#111111] text-white'
                    : 'text-[#6B6F6E] hover:text-[#111111]'
                }`}
              >
                Весь кабинет
              </button>
              <button
                type="button"
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1 transition ${
                  viewMode === 'analytics'
                    ? 'bg-[#035A07] text-white'
                    : 'text-[#6B6F6E] hover:text-[#111111]'
                }`}
              >
                Только аналитика
              </button>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-7 text-sm">
            {viewMode === 'portal' && (
              <>
                <button
                  type="button"
                  onClick={() => scrollTo('candidates')}
                  className="hover:text-[#035A07] transition"
                >
                  Кандидаты
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('chat')}
                  className="hover:text-[#035A07] transition"
                >
                  Чат с рекрутером
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => scrollTo('analytics')}
              className={`transition ${
                viewMode === 'analytics'
                  ? 'text-[#035A07] font-medium'
                  : 'hover:text-[#035A07]'
              }`}
            >
              Аналитика
            </button>
          </nav>

          {/* Переключатель демо-клиента (Пенотерм / Дом Дерева) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#6B6F6E] hidden lg:inline">
              Кабинет:
            </span>
            <div className="inline-flex border border-[#E5E7E6] bg-white text-xs">
              <button
                type="button"
                onClick={() => {
                  setRemoteAnalytics(null);
                  setClientKey('penoterm');
                  setSelectedVacancy('__all__');
                }}
                className={`px-2.5 py-1 transition ${
                  clientKey === 'penoterm'
                    ? 'bg-[#035A07] text-white font-medium'
                    : 'text-[#6B6F6E] hover:text-[#111111]'
                }`}
              >
                Пенотерм
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoteAnalytics(null);
                  setClientKey('dom_dereva');
                  setSelectedVacancy('__all__');
                }}
                className={`px-2.5 py-1 transition ${
                  clientKey === 'dom_dereva'
                    ? 'bg-[#035A07] text-white font-medium'
                    : 'text-[#6B6F6E] hover:text-[#111111]'
                }`}
              >
                Дом Дерева
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero-секция (в режиме полного кабинета) */}
      {viewMode === 'portal' && (
        <section className="relative bg-[#035A07] text-white overflow-hidden">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-14 pb-24 relative z-10">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
              Активный подбор · {activePreset.companyTitle}
            </p>
            <h1 className="text-3xl sm:text-5xl font-light mt-4 leading-tight max-w-2xl">
              {selectedVacancy === '__all__' ? activePreset.heroVacancy : selectedVacancy}
            </h1>
            <p className="text-sm sm:text-base opacity-80 mt-5">{activePreset.deadlineNote}</p>
            {actionCount > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <p className="text-sm">Ждём вашего решения по кандидатам: {actionCount}</p>
                <button
                  type="button"
                  onClick={() => scrollTo('candidates')}
                  className="text-sm border border-white px-5 py-2 hover:bg-white hover:text-[#035A07] transition"
                >
                  Посмотреть кандидатов
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('analytics')}
                  className="text-sm text-white/85 underline underline-offset-4 hover:text-white transition"
                >
                  Открыть полную аналитику
                </button>
              </div>
            )}
          </div>

          {/* Декоративная геометрия в фирменном стиле */}
          <div
            className="absolute top-0 right-0 h-full w-2/5 bg-[#024605] hidden md:block"
            style={{ clipPath: 'polygon(26% 0, 100% 0, 100% 100%, 0 100%)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-10 bg-white"
            style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
          />
        </section>
      )}

      <main className="max-w-5xl mx-auto px-5 sm:px-8 pb-24">
        {/* ВЕРХНЯЯ ЧАСТЬ ПОРТАЛА (скрывается в режиме «Только аналитика») */}
        {viewMode === 'portal' && (
          <>
            {/* Компактная горизонтальная воронка */}
            <section className="pt-10 pb-12 border-b border-[#E5E7E6]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                  Воронка подбора ({currentStats.vacancy})
                </p>
                <button
                  type="button"
                  onClick={() => scrollTo('analytics')}
                  className="text-xs text-[#0E8C7F] hover:underline inline-flex items-center gap-1"
                >
                  Подробная аналитика и причины отказов
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative overflow-x-auto pb-2">
                <div className="min-w-[540px] relative">
                  <div className="absolute top-9 left-0 right-0 h-px bg-[#E5E7E6]" />
                  <div className="relative flex justify-between">
                    {(currentStats.funnel || []).map((item) => (
                      <div
                        key={item.stage}
                        className="flex flex-col items-center w-0 flex-1 min-w-[72px]"
                      >
                        <span className="text-xl sm:text-2xl font-light">{item.count}</span>
                        <span
                          className={`w-3 h-3 rounded-full mt-2 mb-3 transition-colors ${
                            item.count > 0 ? 'bg-[#035A07]' : 'bg-[#E5E7E6]'
                          }`}
                        />
                        <span className="text-[10px] sm:text-xs text-[#6B6F6E] text-center leading-tight px-1">
                          {SHORT_STAGE_NAMES[item.stage] || item.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Список кандидатов */}
            <section id="candidates" className="pt-12">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7E6] mb-2">
                <div className="flex gap-7 text-sm">
                  {[
                    ['all', `Все активные финалисты ${candidates.length}`],
                    ['action', `Ждём решения ${actionCount}`],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`pb-3 -mb-px border-b-2 transition ${
                        tab === key
                          ? 'border-[#111111] text-[#111111]'
                          : 'border-transparent text-[#6B6F6E] hover:text-[#111111]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[#6B6F6E] pb-2">
                  Персональные данные открыты только для кандидатов на этапе согласования
                </span>
              </div>

              {filteredCandidates.length === 0 ? (
                <p className="py-16 text-center text-[#6B6F6E]">
                  Сейчас новых решений нет. Мы сообщим, когда появятся кандидаты.
                </p>
              ) : (
                <ul>
                  {filteredCandidates.map((c) => {
                    const open = expandedId === c.id;
                    const st = STATUS[c.status];
                    const muted = c.status === 'rejected';
                    return (
                      <li key={c.id} className="border-b border-[#E5E7E6] py-6">
                        <div
                          className={`flex flex-col sm:flex-row sm:items-start gap-4 ${
                            muted ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="w-12 h-12 shrink-0 rounded-full bg-[#F6F7F8] text-[#035A07] flex items-center justify-center text-sm font-medium">
                            {initials(c.name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <h2 className="text-xl font-normal">{c.name}</h2>
                              <span className="text-xs text-[#6B6F6E]">Опыт {c.experience}</span>
                              <span className="text-xs text-[#6B6F6E]">· {c.vacancy}</span>
                            </div>
                            <p className="text-xs text-[#6B6F6E] mt-1">
                              {c.role} · {c.location} · Ожидания: {c.salary}
                            </p>
                            <p className="text-sm mt-3 leading-relaxed text-[#111111]/85">
                              {c.solidSummary}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs">
                              <span className={`inline-flex items-center gap-2 ${st.color}`}>
                                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                                {statusText(c)}
                              </span>
                              {c.status === 'action_required' && (
                                <span className="text-[#6B6F6E]">
                                  Ожидает ответа: {c.daysWaiting} дн.
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedId(open ? null : c.id)}
                                className="underline underline-offset-4 decoration-[#B8C2BB] hover:decoration-[#111111]"
                              >
                                {open ? 'Свернуть' : 'Подробнее и резюме'}
                              </button>
                            </div>

                            {open && (
                              <div className="mt-6 pt-6 border-t border-[#E5E7E6] space-y-5">
                                <p className="text-xs uppercase tracking-[0.14em] text-[#6B6F6E]">
                                  Ключевые навыки: <span className="text-[#111111] normal-case tracking-normal">{c.tags.join('  /  ')}</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-4">
                                  <a
                                    href={c.cvUrl}
                                    onClick={(e) => e.preventDefault()}
                                    className="text-sm underline underline-offset-4 decoration-[#B8C2BB] hover:decoration-[#111111]"
                                  >
                                    Открыть полное резюме (PDF)
                                  </a>
                                  {c.status === 'action_required' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleReject(c.id)}
                                        className="text-sm px-5 py-2.5 border border-[#B8C2BB] hover:border-[#111111] transition"
                                      >
                                        Не подходит
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleApprove(c.id)}
                                        className="text-sm px-5 py-2.5 bg-[#035A07] text-white hover:bg-[#024605] transition"
                                      >
                                        Позвать на интервью
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Чат с рекрутером */}
            <section id="chat" className="pt-20 pb-12 border-b border-[#E5E7E6]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                Чат с рекрутером
              </p>
              <h2 className="text-2xl font-light mt-3">Напишите Надежде</h2>

              <div className="mt-8 space-y-3 min-h-[80px]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] px-4 py-3 text-sm ${
                        m.from === 'me'
                          ? 'bg-[#035A07] text-white'
                          : 'bg-[#F6F7F8] text-[#111111] border border-[#E5E7E6]'
                      }`}
                    >
                      {m.author && (
                        <p className="text-[11px] text-[#0E8C7F] font-medium mb-1">{m.author}</p>
                      )}
                      <p className="leading-relaxed">{m.text}</p>
                      {m.time && (
                        <p
                          className={`text-[10px] mt-1.5 ${
                            m.from === 'me' ? 'text-white/70 text-right' : 'text-[#6B6F6E]'
                          }`}
                        >
                          {m.time}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={sendMessage} className="mt-6 flex gap-4 items-end">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ваше сообщение по кандидатам или профилю вакансии..."
                  className="flex-1 bg-transparent border-b border-[#B8C2BB] focus:border-[#111111] outline-none py-2 text-sm"
                />
                <button
                  type="submit"
                  className="text-sm px-5 py-2.5 border border-[#111111] hover:bg-[#111111] hover:text-white transition"
                >
                  Отправить
                </button>
              </form>
              {sentNote && (
                <p className="text-xs text-[#0E8C7F] mt-3">
                  Сообщение отправлено в Telegram рекрутеру
                </p>
              )}
            </section>
          </>
        )}

        {/* ==========================================================================
            ПОЛНАЯ АВТОНОМНАЯ СЕКЦИЯ АНАЛИТИКИ (по схеме Analytics.gs)
           ========================================================================== */}
        <section id="analytics" className={viewMode === 'analytics' ? 'pt-10' : 'pt-20'}>
          {/* Шапка аналитики с фильтром вакансий и кнопкой обновления */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E5E7E6]">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                  Аналитика подбора · {activePreset.companyTitle}
                </p>
                {viewMode === 'analytics' && (
                  <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 bg-[#F6F7F8] border border-[#E5E7E6] text-[#035A07]">
                    Автономный режим
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-4xl font-light mt-2 leading-tight">
                {currentStats.vacancy}
              </h2>
              <p className="text-xs text-[#6B6F6E] mt-2">
                {currentStats.since
                  ? `В работе с ${currentStats.since} (${currentStats.daysOpen} дн.)`
                  : 'Сводные показатели по открытым позициям'}{' '}
                · Обновлено: {analyticsRoot.generated}
              </p>
            </div>

            {/* Панель управления: выбор вакансии + Обновить + Настройка Apps Script */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedVacancy}
                  onChange={(e) => setSelectedVacancy(e.target.value)}
                  className="appearance-none bg-[#F6F7F8] border border-[#B8C2BB] hover:border-[#111111] focus:border-[#111111] text-sm pl-4 pr-9 py-2.5 outline-none transition cursor-pointer"
                >
                  <option value="__all__">
                    Все вакансии компании ({activePreset.companyTitle})
                  </option>
                  {(analyticsRoot.vacancies || []).map((v) => (
                    <option key={v.vacancy} value={v.vacancy}>
                      {v.vacancy}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#6B6F6E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleRefreshAnalytics}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 text-sm px-4 py-2.5 bg-[#035A07] text-white hover:bg-[#024605] transition disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Обновить
              </button>

              <button
                type="button"
                onClick={() => setShowApiConfig((v) => !v)}
                title="Подключить URL вашего Google Apps Script"
                className={`p-2.5 border transition ${
                  showApiConfig
                    ? 'border-[#111111] bg-[#111111] text-white'
                    : 'border-[#B8C2BB] text-[#6B6F6E] hover:text-[#111111] hover:border-[#111111]'
                }`}
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {apiNotice && (
            <div className="mt-4 px-4 py-2.5 bg-[#F6F7F8] border-l-2 border-[#0E8C7F] text-xs text-[#111111]">
              {apiNotice}
            </div>
          )}

          {/* Скрытая панель подключения к реальному Google Apps Script */}
          {showApiConfig && (
            <div className="mt-6 p-5 bg-[#F6F7F8] border border-[#E5E7E6] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#111111]">
                  Прямое подключение к вашему Google Apps Script (?client=1&action=analytics)
                </p>
                <button
                  type="button"
                  onClick={() => setShowApiConfig(false)}
                  className="text-xs text-[#6B6F6E] hover:text-[#111111]"
                >
                  Закрыть
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-[#6B6F6E] mb-1">
                    URL веб-приложения (https://script.google.com/macros/s/.../exec)
                  </label>
                  <input
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-white border border-[#B8C2BB] px-3 py-2 text-xs outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#6B6F6E] mb-1">
                    Токен клиента из листа «_Клиенты» (от 24 символов)
                  </label>
                  <input
                    value={clientToken}
                    onChange={(e) => setClientToken(e.target.value)}
                    placeholder="Вставьте токен компании..."
                    className="w-full bg-white border border-[#B8C2BB] px-3 py-2 text-xs outline-none focus:border-[#111111]"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#6B6F6E]">
                Если поля пустые, страница работает на встроенных данных вашего скриншота («Пенотерм» и «Дом Дерева»).
              </p>
            </div>
          )}

          {/* 1. КЛЮЧЕВЫЕ МЕТРИКИ (KPI STRIP) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-8 py-10 border-b border-[#E5E7E6]">
            <div>
              <p className="text-3xl sm:text-4xl font-light">{currentStats.total}</p>
              <p className="text-xs text-[#6B6F6E] mt-2">Отобрано по резюме</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-light text-[#0E8C7F]">
                {currentStats.active}
              </p>
              <p className="text-xs text-[#6B6F6E] mt-2">Активно в работе</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-light">{currentStats.presented}</p>
              <p className="text-xs text-[#6B6F6E] mt-2">Представлено вам</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-light text-[#035A07]">
                {currentStats.offers}{' '}
                <span className="text-lg text-[#6B6F6E] font-light">/ {currentStats.hired}</span>
              </p>
              <p className="text-xs text-[#6B6F6E] mt-2">Офферы / Вышли</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-light text-[#6B6F6E]">
                {currentStats.rejectedTotal}
              </p>
              <p className="text-xs text-[#6B6F6E] mt-2">Всего отказов</p>
            </div>
          </div>

          {/* 2. ПОДРОБНАЯ ВОРОНКА С КОНВЕРСИЕЙ ЭТАПОВ */}
          <div className="py-12 border-b border-[#E5E7E6]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                Воронка и конверсия этапов
              </p>
              <span className="text-xs text-[#6B6F6E]">
                Накопительный учёт прохождения кандидатов по этапам
              </span>
            </div>

            <div className="space-y-4">
              {(currentStats.funnel || []).map((row, idx) => {
                const pctWidth =
                  row.count > 0 ? Math.max(2, Math.round((row.count / maxFunnelCount) * 100)) : 0;
                const label = SHORT_STAGE_NAMES[row.stage] || row.stage;
                return (
                  <div
                    key={row.stage}
                    className="grid grid-cols-12 items-center gap-3 sm:gap-5 text-sm"
                  >
                    <div className="col-span-5 sm:col-span-3 text-xs sm:text-sm text-[#111111] truncate">
                      {label}
                    </div>

                    <div className="col-span-4 sm:col-span-6">
                      <div className="h-2.5 w-full bg-[#F6F7F8] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            idx === 0
                              ? 'bg-[#0E8C7F]'
                              : idx >= 5
                              ? 'bg-[#035A07]'
                              : 'bg-[#035A07]/80'
                          }`}
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-3 flex items-baseline justify-end gap-2.5 text-right">
                      <span className="text-base sm:text-lg font-normal tabular-nums">
                        {row.count}
                      </span>
                      <span className="text-[11px] text-[#6B6F6E] w-28 hidden sm:inline-block text-left">
                        {idx === 0
                          ? '100% базы'
                          : row.conv !== null && row.conv !== undefined
                          ? `${row.conv}% от пред.`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. СРОКИ И ДИНАМИКА ПО НЕДЕЛЯМ (2 колонки) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 py-12 border-b border-[#E5E7E6]">
            {/* Блок «Сроки» */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                  Сроки и скорость
                </p>
                <h3 className="text-xl font-light mt-2">Скорость прохождения этапов</h3>

                <div className="mt-6 space-y-5">
                  <div className="p-4 bg-[#F6F7F8] border-l-2 border-[#D9962B]">
                    <p className="text-xs text-[#6B6F6E]">Ожидают вашего решения сейчас</p>
                    <p className="text-xl font-normal mt-1">
                      {currentStats.waitingNow?.count > 0 ? (
                        <>
                          {currentStats.waitingNow.count} канд.{' '}
                          <span className="text-sm font-light text-[#6B6F6E]">
                            (в среднем {currentStats.waitingNow.avgDays} дн.)
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-normal text-[#035A07]">
                          Нет зависших согласований
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="border-t border-[#E5E7E6] pt-4">
                    <p className="text-xs text-[#6B6F6E]">Среднее время ответа по кандидату</p>
                    <p className="text-xl font-light mt-1">
                      {currentStats.waitDone?.count > 0
                        ? `${currentStats.waitDone.avg} дн. (на базе ${currentStats.waitDone.count} реш.)`
                        : 'Накапливаем данные'}
                    </p>
                  </div>

                  <div className="border-t border-[#E5E7E6] pt-4">
                    <p className="text-xs text-[#6B6F6E]">Медианное время до оффера</p>
                    <p className="text-sm text-[#111111] mt-1">
                      {currentStats.offerDays?.count >= 3 ? (
                        <span className="text-xl font-light">
                          {currentStats.offerDays.median} дн.
                        </span>
                      ) : (
                        <span className="text-xs text-[#6B6F6E]">
                          Накапливаем данные (нужно не меньше 3 случаев, пока{' '}
                          {currentStats.offerDays?.count || 0})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Блок «Динамика по неделям» */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                    Динамика по неделям
                  </p>
                  <h3 className="text-xl font-light mt-2">Активность за 8 недель</h3>
                </div>

                {/* Легенда */}
                <div className="flex items-center gap-5 text-xs text-[#6B6F6E]">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#0E8C7F] inline-block" />
                    новые кандидаты
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#035A07] inline-block" />
                    представлено вам
                  </span>
                </div>
              </div>

              {/* Вертикальный столбчатый график за 8 недель */}
              <div className="mt-8 pt-6 pb-2 px-4 bg-[#F6F7F8]/60 border border-[#E5E7E6]">
                <div className="h-44 flex items-end justify-between gap-2 sm:gap-4">
                  {(currentStats.weekly?.labels || []).map((label, i) => {
                    const addedVal = currentStats.weekly?.added?.[i] || 0;
                    const presVal = currentStats.weekly?.presented?.[i] || 0;
                    const addedHeight =
                      addedVal > 0 ? Math.max(6, Math.round((addedVal / maxWeeklyVal) * 130)) : 2;
                    const presHeight =
                      presVal > 0 ? Math.max(6, Math.round((presVal / maxWeeklyVal) * 130)) : 2;

                    return (
                      <div key={label} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex items-end justify-center gap-1 h-36">
                          {/* Столбец: Новые кандидаты */}
                          <div className="flex flex-col items-center">
                            {addedVal > 0 && (
                              <span className="text-[10px] text-[#6B6F6E] mb-1 tabular-nums">
                                {addedVal}
                              </span>
                            )}
                            <div
                              className={`w-3 sm:w-4 transition-all duration-500 ${
                                addedVal > 0 ? 'bg-[#0E8C7F]' : 'bg-[#E5E7E6]'
                              }`}
                              style={{ height: `${addedHeight}px` }}
                              title={`Новые кандидаты (${label}): ${addedVal}`}
                            />
                          </div>

                          {/* Столбец: Представлено клиенту */}
                          <div className="flex flex-col items-center">
                            {presVal > 0 && (
                              <span className="text-[10px] text-[#035A07] font-medium mb-1 tabular-nums">
                                {presVal}
                              </span>
                            )}
                            <div
                              className={`w-3 sm:w-4 transition-all duration-500 ${
                                presVal > 0 ? 'bg-[#035A07]' : 'bg-[#E5E7E6]'
                              }`}
                              style={{ height: `${presHeight}px` }}
                              title={`Представлено вам (${label}): ${presVal}`}
                            />
                          </div>
                        </div>

                        <span className="text-[10px] sm:text-xs text-[#6B6F6E] mt-3 tabular-nums">
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 4. ПРИЧИНЫ ОТКАЗОВ (С АВТОМАТИЧЕСКИМ ОБЪЕДИНЕНИЕМ ЗАРПЛАТНЫХ ПРИЧИН) */}
          <div className="py-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">
                  Структура отказов
                </p>
                <h3 className="text-xl font-light mt-2">
                  Причины отказов (всего отказов: {currentStats.rejectedTotal})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowCodeTip((v) => !v)}
                className="text-xs text-[#0E8C7F] hover:underline inline-flex items-center gap-1.5"
              >
                <Info className="w-3.5 h-3.5" />
                {showCodeTip
                  ? 'Скрыть подсказку для Apps Script'
                  : 'Где объединить «Недостаточная оплата» и «Зарплатные ожидания» в Apps Script?'}
              </button>
            </div>

            {/* Подсказка, где поправить группировку в самом Google Apps Script */}
            {showCodeTip && (
              <div className="mb-8 p-5 bg-[#F6F7F8] border border-[#E5E7E6] text-xs space-y-3">
                <p className="font-medium text-[#111111]">
                  На этой странице причины «Недостаточная оплата» и «Зарплатные ожидания» уже автоматически объединены в одну строку (72 + 15 = 87).
                </p>
                <p className="text-[#6B6F6E] leading-relaxed">
                  Если вы также хотите объединить их на стороне сервера Google Apps Script, откройте файл{' '}
                  <code className="px-1.5 py-0.5 bg-white border border-[#E5E7E6] text-[#111111]">
                    Client_api.gs
                  </code>{' '}
                  (функцию, где собирается объект <code className="px-1 bg-white">rejectReasons</code>), и добавьте замену перед подсчётом:
                </p>
                <pre className="p-3 bg-white border border-[#E5E7E6] overflow-x-auto text-[11px] text-[#111111]">
{`if (/оплат|зарплат|зп|ожидан|деньг/i.test(reason)) {
  reason = "Зарплатные ожидания";
}`}
                </pre>
              </div>
            )}

            <div className="space-y-4">
              {currentStats.sortedReasons.map(([reasonName, count]) => {
                const barPct = Math.max(2, Math.round((count / maxReasonVal) * 100));
                const sharePct =
                  currentStats.rejectedTotal > 0
                    ? Math.round((count / currentStats.rejectedTotal) * 100)
                    : 0;

                return (
                  <div
                    key={reasonName}
                    className="grid grid-cols-12 items-center gap-3 sm:gap-5 text-sm"
                  >
                    <div className="col-span-5 sm:col-span-3 text-xs sm:text-sm text-[#111111] truncate">
                      {reasonName}
                    </div>

                    <div className="col-span-5 sm:col-span-7">
                      <div className="h-2.5 w-full bg-[#F6F7F8] overflow-hidden">
                        <div
                          className="h-full bg-[#111111]/80 transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-2 flex items-baseline justify-end gap-2 text-right">
                      <span className="text-base font-normal tabular-nums">{count}</span>
                      <span className="text-[11px] text-[#6B6F6E] w-10 hidden sm:inline-block">
                        {sharePct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Примечание о журнале этапов */}
            <p className="text-xs text-[#6B6F6E] mt-10 pt-6 border-t border-[#E5E7E6] leading-relaxed">
              Журнал этапов ведётся с {analyticsRoot.journalSince || '26.10.2026'}: конверсия и сроки
              уточняются по мере накопления данных, отказавшие до этой даты учитываются на первом
              этапе. Персональные данные кандидатов на этапе первичного отбора скрыты. Обновлено:{' '}
              {analyticsRoot.generated}.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7E6] py-8 px-5 text-center text-xs text-[#6B6F6E]">
        Solid HR · Кабинет клиента и аналитика подбора
      </footer>
    </div>
  );
}