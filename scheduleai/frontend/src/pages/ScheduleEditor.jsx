import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import useStore from '../store/useStore.js';

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function emptyStep(index) {
  return {
    _id: `step-${Date.now()}-${index}`,
    title: '',
    durationMinutes: 5,
    instructions: '',
    sets: 1,
  };
}

export default function ScheduleEditor() {
  const navigate = useNavigate();
  const { fetchSchedule } = useStore();

  const [title, setTitle] = useState('');
  const [restSeconds, setRestSeconds] = useState(30);
  const [days, setDays] = useState(
    DEFAULT_DAYS.map((name, i) => ({ _id: `day-${i}`, name, steps: [] }))
  );
  const [expandedDay, setExpandedDay] = useState(0);
  const [saving, setSaving] = useState(false);

  const addStep = (di) => {
    const newDays = [...days];
    newDays[di] = { ...newDays[di], steps: [...newDays[di].steps, emptyStep(newDays[di].steps.length)] };
    setDays(newDays);
  };

  const removeStep = (di, si) => {
    const newDays = [...days];
    const steps = [...newDays[di].steps];
    steps.splice(si, 1);
    newDays[di] = { ...newDays[di], steps };
    setDays(newDays);
  };

  const updateStep = (di, si, field, value) => {
    const newDays = [...days];
    const steps = [...newDays[di].steps];
    steps[si] = { ...steps[si], [field]: value };
    newDays[di] = { ...newDays[di], steps };
    setDays(newDays);
  };

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a schedule title.'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        restSeconds: Number(restSeconds) || 30,
        days: days.map((day) => ({
          name: day.name,
          steps: day.steps.map((step) => ({
            title: step.title || `Exercise`,
            durationMinutes: Number(step.durationMinutes) || 5,
            instructions: step.instructions || null,
            sets: Number(step.sets) || 1,
          })),
        })),
      };
      await api.importSchedule(payload);
      await fetchSchedule();
      navigate('/schedule');
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2ff] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">New Schedule</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Schedule title + rest time */}
        <div className="bg-white dark:bg-[#131720] rounded-2xl border shadow-[0_1px_3px_rgba(99,102,241,0.08),0_2px_8px_rgba(99,102,241,0.05)] dark:shadow-none border-[#dde1ef] dark:border-[#1e2235] p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Schedule name</label>
            <input
              className="mt-1 w-full border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-4 py-2.5 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
              placeholder="e.g. Morning routine"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">Rest between exercises</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="number"
                min="0"
                max="300"
                className="w-24 border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-4 py-2.5 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:border-[#6366f1] transition-colors"
                value={restSeconds}
                onChange={e => setRestSeconds(e.target.value)}
              />
              <span className="text-sm text-[#64748b] dark:text-[#94a3b8]">seconds</span>
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-3">
          {days.map((day, di) => {
            const totalMin = day.steps.reduce((a, s) => a + (Number(s.durationMinutes) || 0), 0);
            const isOpen = expandedDay === di;

            return (
              <div key={day._id} className="bg-white dark:bg-[#131720] rounded-2xl border shadow-[0_1px_3px_rgba(99,102,241,0.08),0_2px_8px_rgba(99,102,241,0.05)] dark:shadow-none border-[#dde1ef] dark:border-[#1e2235] overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isOpen ? -1 : di)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#f0f2ff] dark:hover:bg-[#0c0e16] transition-colors"
                >
                  <div>
                    <div className="font-semibold text-[#0f172a] dark:text-[#f1f5f9]">{day.name}</div>
                    <div className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                      {day.steps.length} exercise{day.steps.length !== 1 ? 's' : ''}{totalMin > 0 ? ` · ${totalMin} min` : ''}
                    </div>
                  </div>
                  <span className="text-[#94a3b8]">
                    {isOpen ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[#dde1ef] dark:border-[#1e2235]">
                    {day.steps.map((step, si) => (
                      <div key={step._id} className="border-b border-[#dde1ef] dark:border-[#1e2235] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#94a3b8] w-6">#{si + 1}</span>
                          <input
                            className="flex-1 border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-3 py-2 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
                            placeholder="Exercise name"
                            value={step.title}
                            onChange={e => updateStep(di, si, 'title', e.target.value)}
                          />
                          {/* Sets stepper */}
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => updateStep(di, si, 'sets', Math.max(1, (step.sets || 1) - 1))}
                              className="w-6 h-6 bg-[#dde1ef] dark:bg-[#1e2235] rounded-lg text-[#64748b] dark:text-[#94a3b8] flex items-center justify-center text-xs font-bold hover:bg-[#6366f1] hover:text-white transition-colors"
                            >−</button>
                            <span className="w-6 text-center text-xs font-semibold text-[#0f172a] dark:text-[#f1f5f9]">{step.sets || 1}x</span>
                            <button
                              onClick={() => updateStep(di, si, 'sets', Math.min(20, (step.sets || 1) + 1))}
                              className="w-6 h-6 bg-[#dde1ef] dark:bg-[#1e2235] rounded-lg text-[#64748b] dark:text-[#94a3b8] flex items-center justify-center text-xs font-bold hover:bg-[#6366f1] hover:text-white transition-colors"
                            >+</button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              className="w-16 border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-2 py-2 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:border-[#6366f1] text-center transition-colors"
                              value={step.durationMinutes}
                              onChange={e => updateStep(di, si, 'durationMinutes', e.target.value)}
                            />
                            <span className="text-xs text-[#94a3b8]">min</span>
                          </div>
                          <button
                            onClick={() => removeStep(di, si)}
                            className="w-7 h-7 flex items-center justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <div className="pl-6">
                          <textarea
                            className="w-full border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-3 py-2 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] resize-none transition-colors"
                            rows={2}
                            placeholder="Description (optional)"
                            value={step.instructions}
                            onChange={e => updateStep(di, si, 'instructions', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addStep(di)}
                      className="w-full py-3 text-sm text-[#6366f1] dark:text-[#818cf8] font-medium hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] transition-colors"
                    >
                      + Add exercise
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
        >
          {saving ? 'Saving...' : 'Save schedule'}
        </button>
      </div>
    </div>
  );
}
