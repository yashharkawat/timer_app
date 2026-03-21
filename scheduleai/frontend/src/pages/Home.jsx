import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import NavBar from '../components/NavBar.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { schedule, log, streak, loading } = useStore();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const todayLog = (day) => {
    const today = new Date().toISOString().split('T')[0];
    return log.find(l => l.dayId === day.id && new Date(l.completedAt).toISOString().split('T')[0] === today);
  };

  if (loading && !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0c0e16]">
        <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── NO SCHEDULE ──────────────────────────────────────────────────────────────
  if (!schedule) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16] flex flex-col">
        <div className="flex-1 max-w-lg mx-auto w-full px-5 pt-16 pb-28 flex flex-col items-center justify-center">

          {/* App icon + title */}
          <div className="w-16 h-16 bg-[#6366f1] rounded-2xl flex items-center justify-center mb-5 shadow-lg">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-2 text-center">ScheduleAI</h1>
          <p className="text-[#64748b] dark:text-[#94a3b8] text-base text-center mb-10 leading-relaxed">
            Build your weekly workout schedule and run guided timed sessions.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-3 w-full mb-10">
            <div className="bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] rounded-2xl p-4 text-center">
              <div className="w-9 h-9 bg-[#eef2ff] dark:bg-[#1e2040] rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#0f172a] dark:text-[#f1f5f9] leading-tight">AI Import</p>
            </div>
            <div className="bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] rounded-2xl p-4 text-center">
              <div className="w-9 h-9 bg-[#eef2ff] dark:bg-[#1e2040] rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#0f172a] dark:text-[#f1f5f9] leading-tight">Guided Timer</p>
            </div>
            <div className="bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] rounded-2xl p-4 text-center">
              <div className="w-9 h-9 bg-[#eef2ff] dark:bg-[#1e2040] rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-[#0f172a] dark:text-[#f1f5f9] leading-tight">Streak Tracking</p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="w-full space-y-3">
            <button
              onClick={() => navigate('/schedule/import')}
              className="w-full group bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl py-3.5 px-6 font-semibold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import from document
            </button>

            <button
              onClick={() => navigate('/schedule/new')}
              className="w-full group bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] rounded-xl py-3.5 px-6 font-semibold text-base flex items-center justify-center gap-3 hover:border-[#6366f1] dark:hover:border-[#6366f1] active:scale-[0.98] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Build manually
            </button>
          </div>
        </div>

        <NavBar />
      </div>
    );
  }

  // ── HAS SCHEDULE ─────────────────────────────────────────────────────────────
  const todayDay = (schedule.days || []).find(d => d.name === todayName);
  const otherDays = (schedule.days || []).filter(d => d.name !== todayName);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-28">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">ScheduleAI</h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] text-[#64748b] dark:text-[#94a3b8] hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>

        {/* Streak badge */}
        {streak > 0 && (
          <div className="inline-flex items-center gap-2 bg-[#fff7ed] dark:bg-[#1c1408] border border-[#fed7aa] dark:border-[#431407] rounded-full px-3 py-1.5 mb-5">
            <span className="text-base">🔥</span>
            <span className="text-sm font-semibold text-[#c2410c] dark:text-[#fb923c]">{streak} day streak</span>
          </div>
        )}

        {/* Today's card */}
        {todayDay && (() => {
          const totalMin = (todayDay.steps || []).reduce((a, s) => a + s.durationMinutes, 0);
          const stepCount = (todayDay.steps || []).length;
          const done = todayLog(todayDay);
          return (
            <div className="bg-white dark:bg-[#131720] rounded-2xl border-2 border-[#6366f1] shadow-md mb-5 overflow-hidden">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-[#6366f1] text-white px-2.5 py-0.5 rounded-full tracking-wide uppercase">Today</span>
                  {done && (
                    <span className="text-xs font-bold bg-[#10b981] text-white px-2.5 py-0.5 rounded-full tracking-wide uppercase flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                      Done
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-1">{todayDay.name}</h2>
                <p className="text-sm text-[#64748b] dark:text-[#94a3b8] mb-4">
                  {stepCount} exercise{stepCount !== 1 ? 's' : ''} · {totalMin} min
                </p>
                <button
                  onClick={() => navigate(`/session/${todayDay.id}`)}
                  disabled={stepCount === 0}
                  className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                    stepCount === 0
                      ? 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#94a3b8] cursor-not-allowed'
                      : 'bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-sm'
                  }`}
                >
                  {stepCount === 0 ? 'No exercises' : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      Start session
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Rest of the week */}
        {otherDays.length > 0 && (
          <>
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider mb-3">This week</p>
            <div className="space-y-2">
              {otherDays.map((day) => {
                const totalMin = (day.steps || []).reduce((a, s) => a + s.durationMinutes, 0);
                const stepCount = (day.steps || []).length;
                const done = todayLog(day);
                return (
                  <div
                    key={day.id}
                    className="bg-white dark:bg-[#131720] rounded-2xl border border-[#e2e8f4] dark:border-[#1e2235] flex items-center px-4 py-3 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#0f172a] dark:text-[#f1f5f9]">{day.name}</span>
                        {done && (
                          <span className="text-[10px] font-bold bg-[#d1fae5] dark:bg-[#064e3b] text-[#059669] dark:text-[#34d399] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2 6 5 9 10 3"/>
                            </svg>
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {stepCount} exercise{stepCount !== 1 ? 's' : ''} · {totalMin} min
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/session/${day.id}`)}
                      disabled={stepCount === 0}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-1.5 active:scale-[0.98] transition-all ${
                        stepCount === 0
                          ? 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#94a3b8] cursor-not-allowed'
                          : 'bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] dark:text-[#818cf8] hover:bg-[#6366f1] hover:text-white dark:hover:bg-[#6366f1] dark:hover:text-white'
                      }`}
                    >
                      {stepCount > 0 && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"/>
                        </svg>
                      )}
                      {stepCount === 0 ? 'Empty' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom links */}
        <div className="flex items-center justify-center gap-6 mt-7">
          <button
            onClick={() => navigate('/schedule/import')}
            className="text-sm text-[#6366f1] dark:text-[#818cf8] font-medium hover:underline"
          >
            + New schedule
          </button>
          <span className="text-[#e2e8f4] dark:text-[#1e2235]">|</span>
          <button
            onClick={() => navigate('/schedule/import')}
            className="text-sm text-[#64748b] dark:text-[#94a3b8] font-medium hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-colors"
          >
            Import
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  );
}
