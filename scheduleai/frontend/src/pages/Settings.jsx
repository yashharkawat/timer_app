import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import useStore from '../store/useStore.js';
import NavBar from '../components/NavBar.jsx';
import { api } from '../lib/api.js';
import { initVoices, speak } from '../lib/tts.js';

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { settings, saveSettings, log, fetchLog } = useStore();
  const [voices, setVoices] = useState([]);
  const [notifStatus, setNotifStatus] = useState('');
  const [pushSub, setPushSub] = useState(null);

  useEffect(() => {
    initVoices(setVoices);
    fetchLog();
    // Check existing push subscription and re-sync to backend in case DB lost it
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(async sub => {
          if (sub) {
            setPushSub(sub);
            try { await api.subscribePush(sub.toJSON()); } catch {}
          }
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setNotifStatus('VAPID key not configured — set VITE_VAPID_PUBLIC_KEY in .env');
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await api.subscribePush(sub.toJSON());
      setPushSub(sub);
      setNotifStatus('Push notifications enabled!');
      setTimeout(() => setNotifStatus(''), 3000);
    } catch (err) {
      setNotifStatus('Error: ' + err.message);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (pushSub) {
        await api.unsubscribePush(pushSub.endpoint);
        await pushSub.unsubscribe();
        setPushSub(null);
      }
      setNotifStatus('Unsubscribed from push notifications');
      setTimeout(() => setNotifStatus(''), 3000);
    } catch (err) {
      setNotifStatus('Error: ' + err.message);
    }
  };

  const handleTestNotif = async () => {
    try {
      await api.testNotification();
      setNotifStatus('Test notification sent!');
    } catch (err) {
      setNotifStatus('Error: ' + err.message);
    }
    setTimeout(() => setNotifStatus(''), 3000);
  };

  const exportLog = () => {
    if (!log.length) return;
    const header = 'date,dayId,completedSteps,totalSteps,durationMinutes,notes';
    const rows = log.map(l => {
      const date = new Date(l.completedAt).toISOString().split('T')[0];
      return `${date},${l.dayId || l.day?.name || ''},${l.completedSteps},${l.totalSteps},${l.durationMinutes},"${(l.notes || '').replace(/"/g, '""')}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scheduleai-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-[#6366f1]' : 'bg-[#e2e8f4] dark:bg-[#1e2235]'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'left-6' : 'left-0.5'}`} />
    </button>
  );

  const Section = ({ title, children }) => (
    <div className="mb-5">
      <h2 className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider mb-2">{title}</h2>
      <div className="bg-white dark:bg-[#131720] rounded-2xl border shadow-[0_1px_3px_rgba(99,102,241,0.08),0_2px_8px_rgba(99,102,241,0.05)] dark:shadow-none border-[#dde1ef] dark:border-[#1e2235] overflow-hidden">
        {children}
      </div>
    </div>
  );

  const Row = ({ label, sublabel, right }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235] last:border-0">
      <div>
        <div className="text-sm font-medium text-[#0f172a] dark:text-[#f1f5f9]">{label}</div>
        {sublabel && <div className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">{sublabel}</div>}
      </div>
      {right && <div className="ml-4 flex-shrink-0">{right}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f0f2ff] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        <h1 className="text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-6">Settings</h1>

        {user && (
          <Section title="Account">
            <Row
              label={user.fullName || user.emailAddresses?.[0]?.emailAddress || 'Signed in'}
              sublabel={user.emailAddresses?.[0]?.emailAddress}
            />
            <div className="px-4 py-3">
              <button
                onClick={() => signOut(() => navigate('/sign-in'))}
                className="w-full py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] transition-colors"
              >
                Sign out
              </button>
            </div>
          </Section>
        )}

        <Section title="Schedule">
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] dark:text-[#818cf8] rounded-xl text-sm font-medium hover:bg-[#e0e7ff] dark:hover:bg-[#232550] active:scale-[0.98] transition-colors"
            >
              Create new schedule
            </button>
          </div>
        </Section>

        <Section title="Notifications">
          <Row
            label="Enable daily reminders"
            sublabel="On iOS, add to home screen first"
            right={<Toggle value={settings.notifEnabled} onChange={v => saveSettings({ notifEnabled: v })} />}
          />
          <div className="px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235]">
            <label className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-1 block">Remind me at</label>
            <input
              type="time"
              className="border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-3 py-1.5 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:border-[#6366f1] transition-colors"
              value={settings.notifTime}
              onChange={e => saveSettings({ notifTime: e.target.value })}
            />
          </div>
          <div className="px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235]">
            <label className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-2 block">Days</label>
            <div className="flex gap-2 flex-wrap">
              {['mon','tue','wed','thu','fri','sat','sun'].map(d => {
                const active = (settings.notifDays || []).includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => {
                      const days = active
                        ? settings.notifDays.filter(x => x !== d)
                        : [...(settings.notifDays || []), d];
                      saveSettings({ notifDays: days });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                      active
                        ? 'bg-[#6366f1] text-white'
                        : 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8]'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235]">
            <label className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-1 block">Message</label>
            <input
              className="w-full border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-3 py-1.5 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] focus:outline-none focus:border-[#6366f1] transition-colors"
              value={settings.notifMessage}
              onChange={e => saveSettings({ notifMessage: e.target.value })}
            />
          </div>
          {notifStatus && (
            <div className="px-4 py-2 text-xs text-[#64748b] dark:text-[#94a3b8] bg-[#f0f2ff] dark:bg-[#0c0e16]">
              {notifStatus}
            </div>
          )}
          <div className="px-4 py-3 flex gap-2">
            {pushSub ? (
              <button
                onClick={unsubscribeFromPush}
                className="flex-1 py-2.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl text-sm font-medium hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] active:scale-[0.98] transition-colors"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={subscribeToPush}
                className="flex-1 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-colors"
              >
                Enable push
              </button>
            )}
            <button
              onClick={handleTestNotif}
              disabled={!pushSub}
              className="flex-1 py-2.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl text-sm font-medium hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] disabled:opacity-40 active:scale-[0.98] transition-colors"
            >
              Test now
            </button>
          </div>
        </Section>

        <Section title="Voice">
          <Row
            label="Voice instructions"
            right={<Toggle value={settings.voiceEnabled} onChange={v => saveSettings({ voiceEnabled: v })} />}
          />
          <Row
            label="Auto-read when step starts"
            right={<Toggle value={settings.voiceAutoRead} onChange={v => saveSettings({ voiceAutoRead: v })} />}
          />
          <div className="px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235]">
            <label className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-1 block">Voice</label>
            <select
              className="w-full border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-3 py-1.5 text-sm bg-[#f0f2ff] dark:bg-[#1e2235] text-[#0f172a] dark:text-[#f1f5f9] focus:outline-none focus:border-[#6366f1] transition-colors"
              value={settings.voiceName}
              onChange={e => saveSettings({ voiceName: e.target.value })}
            >
              <option value="">Default</option>
              {voices.map(v => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang}){v.default ? ' ★' : ''}</option>
              ))}
            </select>
          </div>
          <div className="px-4 py-3 border-b border-[#dde1ef] dark:border-[#1e2235] space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#64748b] dark:text-[#94a3b8] w-12">Speed</label>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={settings.voiceRate}
                onChange={e => saveSettings({ voiceRate: +e.target.value })}
                className="flex-1 accent-[#6366f1]"
              />
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8] w-8 text-right">{settings.voiceRate}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-[#64748b] dark:text-[#94a3b8] w-12">Pitch</label>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={settings.voicePitch}
                onChange={e => saveSettings({ voicePitch: +e.target.value })}
                className="flex-1 accent-[#6366f1]"
              />
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8] w-8 text-right">{settings.voicePitch}</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <button
              onClick={() => speak('This is a test of the voice instructions.', {
                rate: settings.voiceRate,
                pitch: settings.voicePitch,
                voiceName: settings.voiceName,
              })}
              className="w-full py-2.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl text-sm font-medium hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] active:scale-[0.98] transition-colors flex items-center justify-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Test voice
            </button>
          </div>
        </Section>

        <Section title="Sounds">
          <Row
            label="Sounds"
            right={<Toggle value={settings.soundsEnabled} onChange={v => saveSettings({ soundsEnabled: v })} />}
          />
          <div className="px-4 py-3 flex items-center gap-3">
            <label className="text-xs text-[#64748b] dark:text-[#94a3b8] w-16">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={e => saveSettings({ soundVolume: +e.target.value })}
              className="flex-1 accent-[#6366f1]"
            />
            <span className="text-xs text-[#64748b] dark:text-[#94a3b8] w-8 text-right">{Math.round(settings.soundVolume * 100)}%</span>
          </div>
        </Section>

        <Section title="Session">
          <Row
            label="Prepare countdown"
            sublabel="Seconds before each exercise starts"
            right={
              <div className="flex items-center gap-2">
                <button onClick={() => saveSettings({ prepareSeconds: Math.max(0, (settings.prepareSeconds ?? 5) - 1) })} className="w-7 h-7 rounded-lg bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] font-bold text-sm flex items-center justify-center">−</button>
                <span className="w-6 text-center text-sm font-semibold text-[#0f172a] dark:text-[#f1f5f9]">{settings.prepareSeconds ?? 5}</span>
                <button onClick={() => saveSettings({ prepareSeconds: Math.min(30, (settings.prepareSeconds ?? 5) + 1) })} className="w-7 h-7 rounded-lg bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] font-bold text-sm flex items-center justify-center">+</button>
              </div>
            }
          />
          <Row
            label="Final countdown beeps"
            sublabel="Beep for last N seconds of each phase"
            right={
              <div className="flex items-center gap-2">
                <button onClick={() => saveSettings({ finalCount: Math.max(0, (settings.finalCount ?? 3) - 1) })} className="w-7 h-7 rounded-lg bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] font-bold text-sm flex items-center justify-center">−</button>
                <span className="w-6 text-center text-sm font-semibold text-[#0f172a] dark:text-[#f1f5f9]">{settings.finalCount ?? 3}</span>
                <button onClick={() => saveSettings({ finalCount: Math.min(10, (settings.finalCount ?? 3) + 1) })} className="w-7 h-7 rounded-lg bg-[#eef2ff] dark:bg-[#1e2040] text-[#6366f1] font-bold text-sm flex items-center justify-center">+</button>
              </div>
            }
          />
          <Row
            label="Skip last rest"
            sublabel="No rest after final set of each exercise"
            right={<Toggle value={settings.skipLastRest ?? false} onChange={v => saveSettings({ skipLastRest: v })} />}
          />
        </Section>

        <Section title="Display">
          <Row
            label="Keep screen on during sessions"
            right={<Toggle value={settings.keepScreenOn} onChange={v => saveSettings({ keepScreenOn: v })} />}
          />
          <Row
            label="Theme"
            sublabel="Auto follows your device setting"
            right={
              <div className="flex rounded-xl overflow-hidden border border-[#dde1ef] dark:border-[#1e2235] text-xs font-semibold">
                {['auto', 'light', 'dark'].map(t => (
                  <button
                    key={t}
                    onClick={() => saveSettings({ theme: t })}
                    className={`px-3 py-1.5 capitalize transition-colors ${settings.theme === t ? 'bg-[#6366f1] text-white' : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#eef2ff] dark:hover:bg-[#1e2040]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            }
          />
        </Section>

        <Section title="Server">
          <Row
            label="Keep server awake"
            sublabel="Pings backend every 8 min to prevent Render sleep"
            right={<Toggle value={settings.keepAlive} onChange={v => saveSettings({ keepAlive: v })} />}
          />
        </Section>

        <Section title="Data">
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={exportLog}
              className="w-full py-2.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl text-sm font-medium hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] active:scale-[0.98] transition-colors"
            >
              Export log as CSV ({log.length} sessions)
            </button>
          </div>
        </Section>
      </div>

      <NavBar />
    </div>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
