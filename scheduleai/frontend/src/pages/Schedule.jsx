import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import { api } from '../lib/api.js';
import NavBar from '../components/NavBar.jsx';

const DAY_IDS_BY_INDEX = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function Schedule() {
  const navigate = useNavigate();
  const { schedule, log, streak, fetchSchedule, loading } = useStore();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    if (!schedule) fetchSchedule();
  }, []);

  if (loading && !schedule) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#8b7355] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!schedule) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-24 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h2 className="text-xl font-bold mb-2 text-[#2c2a24] dark:text-gray-100">No schedule yet</h2>
        <p className="text-[#9a9486] dark:text-gray-400 mb-6">Create one to get started.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#3d3420] text-white rounded-xl font-semibold hover:bg-[#2c2412] transition-colors">
          Get started
        </button>
        <NavBar />
      </div>
    );
  }

  const todayLog = (day) => {
    const today = new Date().toISOString().split('T')[0];
    return log.find(l => l.dayId === day.id && new Date(l.completedAt).toISOString().split('T')[0] === today);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#2c2a24] dark:text-gray-100">{schedule.title}</h1>
          {schedule.description && <p className="text-sm text-[#9a9486] dark:text-gray-400 mt-0.5">{schedule.description}</p>}
          {streak > 0 && <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 font-medium">🔥 {streak} day streak</p>}
        </div>
        <button
          onClick={() => navigate('/schedule/new')}
          className="px-3 py-1.5 bg-[#f0ece4] dark:bg-gray-700 text-[#5a5548] dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-[#e4dfd4] dark:hover:bg-gray-600 transition-colors"
        >
          New
        </button>
      </div>

      <div className="space-y-3">
        {(schedule.days || []).map((day) => {
          const isToday = day.name === todayName;
          const done = todayLog(day);
          const totalMin = (day.steps || []).reduce((a, s) => a + s.durationMinutes, 0);

          return (
            <div key={day.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden ${isToday ? 'border-[#8b7355]' : 'border-[#e0dbd0] dark:border-gray-700'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-[#2c2a24] dark:text-gray-100">{day.name}</h3>
                      {isToday && <span className="text-xs bg-[#3d3420] text-white px-2 py-0.5 rounded-full">Today</span>}
                      {done && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Done</span>}
                    </div>
                  </div>
                  <div className="text-right text-sm text-[#9a9486] dark:text-gray-400 ml-3 flex-shrink-0">
                    <div className="font-semibold text-[#2c2a24] dark:text-gray-200">{totalMin} min</div>
                    <div>{(day.steps || []).length} exercise{(day.steps || []).length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/session/${day.id}`)}
                  className="mt-3 w-full py-2.5 bg-[#3d3420] text-white rounded-xl font-semibold text-sm hover:bg-[#2c2412] active:scale-95 transition-all"
                >
                  Start Session →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <NavBar />
    </div>
  );
}
