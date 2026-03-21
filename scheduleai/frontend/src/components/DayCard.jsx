import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';

const TYPE_COLORS = {
  active: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  rest: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  evening: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function DayCard({ day, isToday, editMode, onAddStep }) {
  const navigate = useNavigate();
  const { log, updateStep, removeStep } = useStore();
  const [editingStepId, setEditingStepId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const todayLog = log.find(
    (l) => l.dayId === day.id && l.date === new Date().toISOString().split('T')[0]
  );
  const totalMin = day.steps.reduce((a, s) => a + s.durationMinutes, 0);

  const startEdit = (step) => {
    setEditingStepId(step.id);
    setEditForm({ ...step });
  };

  const saveEdit = () => {
    updateStep(day.id, editingStepId, editForm);
    setEditingStepId(null);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden transition-all ${isToday ? 'border-[#8b7355]' : 'border-[#e0dbd0] dark:border-gray-700'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#2c2a24] dark:text-gray-100">{day.name}</h3>
              {isToday && <span className="text-xs bg-[#3d3420] text-white px-2 py-0.5 rounded-full">Today</span>}
              {todayLog && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Done</span>}
            </div>
            <p className="text-sm text-[#9a9486] dark:text-gray-400 mt-0.5">{day.theme}</p>
          </div>
          <div className="text-right text-sm text-[#9a9486] dark:text-gray-400">
            <div className="font-semibold text-[#2c2a24] dark:text-gray-200">{totalMin} min</div>
            <div>{day.steps.length} steps</div>
          </div>
        </div>

        {!editMode && (
          <button
            onClick={() => navigate(`/session/${day.id}`)}
            className="mt-3 w-full py-2.5 bg-[#3d3420] text-white rounded-xl font-semibold text-sm hover:bg-[#2c2412] active:scale-95 transition-all"
          >
            Start Session →
          </button>
        )}
      </div>

      {editMode && (
        <div className="border-t border-[#f0ece4] dark:border-gray-700">
          {day.steps.map((step, i) => (
            <div key={step.id} className="border-b border-[#f7f4ef] dark:border-gray-700 last:border-0">
              {editingStepId === step.id ? (
                <div className="p-3 bg-[#faf7f2] dark:bg-gray-700 space-y-2">
                  <input
                    className="w-full border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
                    value={editForm.title || ''}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Step title"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-24 border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
                      value={editForm.durationMinutes || ''}
                      onChange={e => setEditForm(f => ({ ...f, durationMinutes: +e.target.value }))}
                      placeholder="Min"
                    />
                    <select
                      className="flex-1 border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
                      value={editForm.type || 'active'}
                      onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                    >
                      <option value="active">Active</option>
                      <option value="rest">Rest</option>
                      <option value="evening">Evening</option>
                    </select>
                  </div>
                  <textarea
                    className="w-full border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
                    rows={3}
                    value={editForm.instructions || ''}
                    onChange={e => setEditForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="Instructions"
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
                    value={editForm.source || ''}
                    onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                    placeholder="Source (optional)"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 py-1.5 bg-[#3d3420] text-white rounded-lg text-sm font-medium">Save</button>
                    <button onClick={() => setEditingStepId(null)} className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-[#9a9486] text-sm w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#2c2a24] dark:text-gray-100 truncate">{step.title}</div>
                    <div className="text-xs text-[#9a9486] dark:text-gray-400">{step.durationMinutes} min · {step.type}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(step)} className="text-[#8b7355] hover:text-[#3d3420] text-lg">✏️</button>
                    <button onClick={() => removeStep(day.id, step.id)} className="text-red-400 hover:text-red-600 text-lg">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => onAddStep(day.id)}
            className="w-full py-3 text-sm text-[#8b7355] dark:text-amber-400 hover:bg-[#faf7f2] dark:hover:bg-gray-700 font-medium transition-colors"
          >
            + Add step
          </button>
        </div>
      )}
    </div>
  );
}
