import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import useStore from '../store/useStore.js';
import NavBar from '../components/NavBar.jsx';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { schedule, loading, fetchSchedule } = useStore();

  useEffect(() => {
    if (schedule) navigate('/schedule');
  }, [schedule]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-16 pb-24">
      <div className="text-center mb-12">
        <div className="text-5xl mb-4">⏱</div>
        <h1 className="text-3xl font-bold text-[#2c2a24] dark:text-gray-100 mb-3">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-[#5a5548] dark:text-gray-300 leading-relaxed">
          Build your weekly practice schedule and run guided timed sessions.
        </p>
      </div>

      <button
        onClick={() => navigate('/schedule/new')}
        className="w-full py-4 bg-[#3d3420] text-white rounded-2xl font-semibold text-base hover:bg-[#2c2412] active:scale-95 transition-all"
      >
        Create your schedule →
      </button>
      <NavBar />
    </div>
  );
}
