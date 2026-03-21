import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import NavBar from '../components/NavBar.jsx';

export default function Schedule() {
  const navigate = useNavigate();
  const { schedule, log, streak, fetchSchedule, loading } = useStore();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    if (!schedule) fetchSchedule();
  }, []);

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

  if (!schedule) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16] flex flex-col items-center justify-center px-5 pb-24">
        <div className="w-16 h-16 bg-[#eef2ff] dark:bg-[#1e2040] rounded-2xl flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2 text-[#0f172a] dark:text-[#f1f5f9]">No schedule yet</h2>
        <p className="text-[#64748b] dark:text-[#94a3b8] mb-8 text-center">Create your first schedule to get started.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold active:scale-95 transition-all shadow-sm"
        >
          Get started
        </button>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-5 pt-8 pb-28">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider mb-1">My Schedule</p>
            <h1 className="text-2xl font-bold text-[#0f172a] dark:text-[#f1f5f9] truncate">{schedule.title}</h1>
            {schedule.description && (
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8] mt-1 truncate">{schedule.description}</p>
            )}
            {schedule.restSeconds != null && (
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">{schedule.restSeconds}s rest between exercises</p>
            )}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-base">🔥</span>
                <span className="text-sm font-semibold text-[#c2410c] dark:text-[#fb923c]">{streak} day streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Day list */}
        <div className="space-y-2 mb-8">
          {(schedule.days || []).map((day) => {
            const isToday = day.name === todayName;
            const done = todayLog(day);
            const totalMin = (day.steps || []).reduce((a, s) => a + s.durationMinutes, 0);
            const stepCount = (day.steps || []).length;

            return (
              <div
                key={day.id}
                className={`bg-white dark:bg-[#131720] rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isToday
                    ? 'border-[#6366f1] shadow-md'
                    : 'border-[#e2e8f4] dark:border-[#1e2235]'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#0f172a] dark:text-[#f1f5f9] text-base">{day.name}</h3>
                        {isToday && (
                          <span className="text-[10px] font-bold bg-[#6366f1] text-white px-2 py-0.5 rounded-full tracking-wide uppercase">
                            Today
                          </span>
                        )}
                        {done && (
                          <span className="text-[10px] font-bold bg-[#10b981] text-white px-2 py-0.5 rounded-full tracking-wide uppercase flex items-center gap-1">
                            <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                      className={`flex-shrink-0 w-full max-w-[120px] py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all ${
                        stepCount === 0
                          ? 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#94a3b8] cursor-not-allowed'
                          : isToday
                          ? 'bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-sm'
                          : 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8]'
                      }`}
                    >
                      {stepCount === 0 ? 'Empty' : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          Start
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/schedule/import')}
            className="w-full py-3.5 px-6 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import new schedule
          </button>
          <button
            onClick={() => navigate('/schedule/new')}
            className="w-full py-3.5 px-6 bg-white dark:bg-[#131720] border border-[#e2e8f4] dark:border-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:border-[#6366f1] dark:hover:border-[#6366f1] active:scale-[0.98] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
