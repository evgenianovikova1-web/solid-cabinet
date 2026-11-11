import React, { useState } from 'react';

const INITIAL_CANDIDATES = [
  {
    id: 1,
    name: 'Алексей Смирнов',
    role: 'Senior Product Designer',
    experience: '7 лет',
    salary: '280 000 ₽',
    location: 'Москва (удаленно / гибрид)',
    status: 'action_required',
    solidSummary:
      'Опыт в fintech и SaaS-продуктах. Системный подход к дизайн-системам, сильная продуктовая аналитика.',
    tags: ['Figma', 'Design Systems', 'UX Research', 'Fintech'],
    cvUrl: '#',
  },
  {
    id: 2,
    name: 'Мария Кузнецова',
    role: 'Senior Product Designer',
    experience: '5 лет',
    salary: '250 000 ₽',
    location: 'Санкт-Петербург',
    status: 'interview_scheduled',
    interviewTime: 'Завтра, 12 ноября в 15:00',
    solidSummary:
      'Сильный визуал и опыт проектирования сложных B2B-дашбордов. Успешно защитила кейс на техническом скрининге.',
    tags: ['B2B SaaS', 'Figma', 'Web & Mobile'],
    cvUrl: '#',
  },
];

const STATUS = {
  action_required: { label: 'Ждём вашего решения', dot: 'bg-[#D9962B]', color: 'text-[#8A5A14]' },
  interview_requested: { label: 'Согласуем время', dot: 'bg-[#0E8C7F]', color: 'text-[#0E8C7F]' },
  interview_scheduled: { label: 'Встреча назначена', dot: 'bg-[#035A07]', color: 'text-[#035A07]' },
  rejected: { label: 'Не подходит', dot: 'bg-[#9AA39E]', color: 'text-[#6B6F6E]' },
};

const statusText = (c) =>
  c.status === 'interview_scheduled' ? `Встреча: ${c.interviewTime}` : STATUS[c.status].label;

const FUNNEL = ['Отобрано', 'Оценка', 'Согласование', 'Интервью', 'Решение', 'Оффер', 'Выход'];

const funnelCounts = (cands) => {
  const total = cands.length;
  const rejected = cands.filter((c) => c.status === 'rejected').length;
  const approved = cands.filter((c) => c.status === 'interview_requested').length;
  const interview = cands.filter((c) => c.status === 'interview_scheduled').length;
  return [total, total - rejected, approved + interview, interview, 0, 0, 0];
};

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');

export default function App() {
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [tab, setTab] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sentNote, setSentNote] = useState(false);

  const actionCount = candidates.filter((c) => c.status === 'action_required').length;
  const list = candidates.filter((c) => tab === 'all' || c.status === 'action_required');
  const counts = funnelCounts(candidates);

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
    setMessages((prev) => [...prev, { id: Date.now(), text, from: 'me' }]);
    setDraft('');
    setSentNote(true);
    setTimeout(() => setSentNote(false), 2500);
  };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-white text-[#111111] font-[Jost,sans-serif]">
      {/* Шапка */}
      <header className="sticky top-0 z-20 bg-[#F6F7F8]/95 backdrop-blur border-b border-[#E5E7E6]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">Solid</span>
            <span className="text-base font-semibold tracking-tight text-[#0E8C7F]">HR.</span>
          </div>
          <nav className="hidden sm:flex items-center gap-7 text-sm">
            <button type="button" onClick={() => scrollTo('candidates')} className="hover:text-[#035A07]">Кандидаты</button>
            <button type="button" onClick={() => scrollTo('chat')} className="hover:text-[#035A07]">Чат с рекрутером</button>
            <button type="button" onClick={() => scrollTo('analytics')} className="hover:text-[#035A07]">Аналитика</button>
          </nav>
          <div className="text-xs text-[#6B6F6E] hidden md:block">Дом Дерева</div>
        </div>
      </header>

      {/* Hero вакансии с диагональным срезом */}
      <section className="relative bg-[#035A07] text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-14 pb-24 relative z-10">
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">Активный подбор</p>
          <h1 className="text-3xl sm:text-5xl font-light mt-4 leading-tight">
            Старший дизайнер продукции
          </h1>
          <p className="text-sm sm:text-base opacity-80 mt-5">
            Рекрутер: Надежда · Выход финалиста до 28 ноября
          </p>
          {actionCount > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <p className="text-sm">Ждём вашего решения по кандидатам: {actionCount}</p>
              <button
                type="button"
                onClick={() => scrollTo('candidates')}
                className="text-sm border border-white px-5 py-2 hover:bg-white hover:text-[#035A07] transition"
              >
                Посмотреть
              </button>
            </div>
          )}
        </div>
        <img
          src="/hero.jpg"
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute top-0 right-0 h-full w-1/2 object-cover hidden md:block opacity-90"
          style={{ clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)' }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-10 bg-white"
          style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)' }}
        />
      </section>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 pb-20">
        {/* Воронка */}
        <section className="pt-10 pb-12 border-b border-[#E5E7E6]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E] mb-8">Воронка подбора</p>
          <div className="relative">
            <div className="absolute top-3 left-0 right-0 h-px bg-[#E5E7E6]" />
            <div className="relative flex justify-between">
              {FUNNEL.map((stage, i) => (
                <div key={stage} className="flex flex-col items-center w-0 flex-1 min-w-[56px]">
                  <span className="text-xl sm:text-2xl font-light">{counts[i]}</span>
                  <span
                    className={`w-3 h-3 rounded-full mt-2 mb-3 ${counts[i] > 0 ? 'bg-[#035A07]' : 'bg-[#E5E7E6]'}`}
                  />
                  <span className="text-[10px] sm:text-xs text-[#6B6F6E] text-center leading-tight">
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Фильтры */}
        <section id="candidates" className="pt-12">
          <div className="flex gap-7 text-sm border-b border-[#E5E7E6] mb-2">
            {[
              ['all', `Все кандидаты ${candidates.length}`],
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

          {/* Список строк */}
          {list.length === 0 ? (
            <p className="py-16 text-center text-[#6B6F6E]">
              Сейчас новых решений нет. Мы сообщим, когда появятся кандидаты.
            </p>
          ) : (
            <ul>
              {list.map((c) => {
                const open = expandedId === c.id;
                const st = STATUS[c.status];
                const muted = c.status === 'rejected';
                return (
                  <li key={c.id} className="border-b border-[#E5E7E6] py-6">
                    <div className={`flex flex-col sm:flex-row sm:items-start gap-4 ${muted ? 'opacity-50' : ''}`}>
                      <div className="w-12 h-12 shrink-0 rounded-full bg-[#F6F7F8] text-[#035A07] flex items-center justify-center text-sm font-medium">
                        {initials(c.name)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h2 className="text-xl font-normal">{c.name}</h2>
                          <span className="text-xs text-[#6B6F6E]">{c.experience}</span>
                        </div>
                        <p className="text-xs text-[#6B6F6E] mt-1">
                          {c.role} · {c.location} · {c.salary}
                        </p>
                        <p className="text-sm mt-3 leading-relaxed text-[#111111]/85">{c.solidSummary}</p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs">
                          <span className={`inline-flex items-center gap-2 ${st.color}`}>
                            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                            {statusText(c)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : c.id)}
                            className="underline underline-offset-4 decoration-[#B8C2BB] hover:decoration-[#111111]"
                          >
                            {open ? 'Свернуть' : 'Подробнее'}
                          </button>
                        </div>

                        {open && (
                          <div className="mt-6 pt-6 border-t border-[#E5E7E6] space-y-5">
                            <p className="text-sm text-[#6B6F6E]">{c.tags.join('  /  ')}</p>
                            <div className="flex flex-wrap items-center gap-4">
                              <a href={c.cvUrl} className="text-sm underline underline-offset-4 decoration-[#B8C2BB] hover:decoration-[#111111]">
                                Полное резюме
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

        {/* Чат */}
        <section id="chat" className="pt-20 pb-12 border-b border-[#E5E7E6]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Чат с рекрутером</p>
          <h2 className="text-2xl font-light mt-3">Напишите Надежде</h2>

          <div className="mt-8 space-y-3 min-h-[80px]">
            {messages.length === 0 ? (
              <p className="text-sm text-[#6B6F6E]">Сообщений пока нет. Если есть вопрос по кандидатам, напишите здесь.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[80%] text-sm bg-[#F6F7F8] rounded-sm px-4 py-3">{m.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={sendMessage} className="mt-6 flex gap-4 items-end">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ваше сообщение"
              className="flex-1 bg-transparent border-b border-[#B8C2BB] focus:border-[#111111] outline-none py-2 text-sm"
            />
            <button type="submit" className="text-sm px-5 py-2.5 border border-[#111111] hover:bg-[#111111] hover:text-white transition">
              Отправить
            </button>
          </form>
          {sentNote && <p className="text-xs text-[#0E8C7F] mt-3">Сообщение отправлено</p>}
        </section>

        {/* Аналитика */}
        <section id="analytics" className="pt-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#6B6F6E]">Аналитика</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-8">
            {[
              ['Кандидатов всего', candidates.length],
              ['Ждём решения', actionCount],
              ['Интервью', counts[3]],
              ['Отказов', candidates.filter((c) => c.status === 'rejected').length],
            ].map(([label, value]) => (
              <div key={label} className="border-t border-[#E5E7E6] pt-4">
                <p className="text-3xl sm:text-4xl font-light">{value}</p>
                <p className="text-xs text-[#6B6F6E] mt-2">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7E6] py-8 text-center text-xs text-[#6B6F6E]">
        Solid HR · Кабинет клиента
      </footer>
    </div>
  );
}