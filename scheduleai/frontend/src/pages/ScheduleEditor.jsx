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
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#9a9486] hover:text-[#3d3420] dark:text-gray-400 text-sm">← Back</button>
        <h1 className="flex-1 text-xl font-bold text-[#2c2a24] dark:text-gray-100">New Schedule</h1>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-[#3d3420] text-white rounded-xl text-sm font-semibold hover:bg-[#2c2412] disabled:opacity-50 transition-all">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Schedule title + rest time */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dbd0] dark:border-gray-700 p-4 mb-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-[#9a9486] dark:text-gray-400 uppercase tracking-wider">Schedule name</label>
          <input
            className="mt-1 w-full border border-[#d4cfc4] dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-[#faf7f2] dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-[#8b7355]"
            placeholder="e.g. Morning routine"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#9a9486] dark:text-gray-400 uppercase tracking-wider">Rest between exercises</label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="number"
              min="0"
              max="300"
              className="w-24 border border-[#d4cfc4] dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm bg-[#faf7f2] dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-[#8b7355]"
              value={restSeconds}
              onChange={e => setRestSeconds(e.target.value)}
            />
            <span className="text-sm text-[#9a9486] dark:text-gray-400">seconds</span>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-3">
        {days.map((day, di) => {
          const totalMin = day.steps.reduce((a, s) => a + (Number(s.durationMinutes) || 0), 0);
          const isOpen = expandedDay === di;

          return (
            <div key={day._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dbd0] dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedDay(isOpen ? -1 : di)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#faf7f2] dark:hover:bg-gray-700 transition-colors"
              >
                <div>
                  <div className="font-semibold text-[#2c2a24] dark:text-gray-100">{day.name}</div>
                  <div className="text-xs text-[#9a9486] dark:text-gray-400 mt-0.5">
                    {day.steps.length} exercise{day.steps.length !== 1 ? 's' : ''}{totalMin > 0 ? ` · ${totalMin} min` : ''}
                  </div>
                </div>
                <span className="text-[#9a9486] dark:text-gray-400">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-[#f0ece4] dark:border-gray-700">
                  {day.steps.map((step, si) => (
                    <div key={step._id} className="border-b border-[#f7f4ef] dark:border-gray-700 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#9a9486] dark:text-gray-400 w-6">#{si + 1}</span>
                        <input
                          className="flex-1 border border-[#d4cfc4] dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-[#faf7f2] dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-[#8b7355]"
                          placeholder="Exercise name"
                          value={step.title}
                          onChange={e => updateStep(di, si, 'title', e.target.value)}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            className="w-16 border border-[#d4cfc4] dark:border-gray-600 rounded-xl px-2 py-2 text-sm bg-[#faf7f2] dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-[#8b7355] text-center"
                            value={step.durationMinutes}
                            onChange={e => updateStep(di, si, 'durationMinutes', e.target.value)}
                          />
                          <span className="text-xs text-[#9a9486] dark:text-gray-400">min</span>
                        </div>
                        <button onClick={() => removeStep(di, si)} className="text-red-400 hover:text-red-600 text-lg w-6 text-center">✕</button>
                      </div>
                      <div className="pl-6">
                        <textarea
                          className="w-full border border-[#d4cfc4] dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-[#faf7f2] dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-[#8b7355] resize-none"
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
                    className="w-full py-3 text-sm text-[#8b7355] dark:text-amber-400 font-medium hover:bg-[#faf7f2] dark:hover:bg-gray-700 transition-colors"
                  >
                    + Add exercise
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="mt-6 w-full py-4 bg-[#3d3420] text-white rounded-2xl font-semibold text-base hover:bg-[#2c2412] disabled:opacity-50 active:scale-95 transition-all">
        {saving ? 'Saving...' : 'Save schedule'}
      </button>
    </div>
  );
}
