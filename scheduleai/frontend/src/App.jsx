import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, SignIn, SignUp } from '@clerk/clerk-react';
import useStore from './store/useStore.js';
import { setTokenGetter } from './lib/api.js';
import Home from './pages/Home.jsx';
import Schedule from './pages/Schedule.jsx';
import Session from './pages/Session.jsx';
import Settings from './pages/Settings.jsx';
import ScheduleEditor from './pages/ScheduleEditor.jsx';

function AuthGuard({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#8b7355] border-t-transparent rounded-full animate-spin" /></div>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return children;
}

export default function App() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { settings, fetchSchedule, fetchSettings, fetchLog, fetchStreak } = useStore();

  // Give the API layer access to Clerk tokens
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // On sign-in: load everything from backend
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      fetchSettings();
      fetchSchedule();
      fetchLog();
      fetchStreak();
    }
  }, [isSignedIn, isLoaded]);

  // Dark mode
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f4f1eb] dark:bg-gray-900 text-[#2c2a24] dark:text-gray-100">
        <Routes>
          <Route path="/sign-in/*" element={<div className="min-h-screen flex items-center justify-center p-4"><SignIn routing="path" path="/sign-in" afterSignInUrl="/" /></div>} />
          <Route path="/sign-up/*" element={<div className="min-h-screen flex items-center justify-center p-4"><SignUp routing="path" path="/sign-up" afterSignUpUrl="/" /></div>} />
          <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
          <Route path="/schedule" element={<AuthGuard><Schedule /></AuthGuard>} />
          <Route path="/schedule/new" element={<AuthGuard><ScheduleEditor /></AuthGuard>} />
          <Route path="/schedule/edit/:scheduleId" element={<AuthGuard><ScheduleEditor /></AuthGuard>} />
          <Route path="/session/:dayId" element={<AuthGuard><Session /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
