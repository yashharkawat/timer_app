import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import TimerRing from '../components/TimerRing.jsx';
import StepCard from '../components/StepCard.jsx';
import StepList from '../components/StepList.jsx';
import { playBowl, playNewStep, playRestChime, playTick, playSessionDone } from '../lib/sounds.js';
import { speak, stop as stopSpeech, getIsSpeaking } from '../lib/tts.js';

export default function Session() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { schedule, session, settings, startSession, setSessionStep, tickSession, startRest, completeSession } = useStore();

  const [localRunning, setLocalRunning] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [doneNote, setDoneNote] = useState('');
  const [saving, setSaving] = useState(false);

  const intervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  const day = schedule?.days?.find(d => d.id === dayId);
  const step = day?.steps[session.currentStepIndex];
  const restSeconds = schedule?.restSeconds ?? 30;

  const soundEnabled = settings.soundsEnabled;
  const voiceEnabled = settings.voiceEnabled;
  const volume = settings.soundVolume;

  useEffect(() => {
    if (day && (!session.dayId || session.dayId !== dayId)) {
      startSession(dayId);
    }
  }, [dayId]);

  const speakStep = useCallback((s) => {
    if (!voiceEnabled || !s?.instructions) return;
    speak(`${s.title || 'Exercise'}. ${s.instructions}`, {
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
      voiceName: settings.voiceName,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [voiceEnabled, settings.voiceRate, settings.voicePitch, settings.voiceName]);

  const goToStep = useCallback((index, skipRest = false) => {
    stopSpeech();
    setLocalRunning(false);
    clearInterval(intervalRef.current);
    setIsSpeaking(false);

    const d = useStore.getState().schedule?.days?.find(dd => dd.id === dayId);
    if (!d) return;
    const newStep = d.steps[index];
    if (!newStep) return;

    setSessionStep(index);
    if (soundEnabled) playNewStep(volume);
    if (voiceEnabled && settings.voiceAutoRead) {
      setTimeout(() => speakStep(newStep), 800);
    }
  }, [soundEnabled, volume, voiceEnabled, dayId, settings.voiceAutoRead, speakStep]);

  const beginRest = useCallback(() => {
    stopSpeech();
    setLocalRunning(false);
    clearInterval(intervalRef.current);
    setIsSpeaking(false);
    if (soundEnabled) playRestChime(volume);
    startRest();
    setLocalRunning(true);
  }, [soundEnabled, volume, dayId, startRest]);

  const finishSession = useCallback(() => {
    setLocalRunning(false);
    clearInterval(intervalRef.current);
    stopSpeech();
    if (soundEnabled) playSessionDone(volume);
    releaseWakeLock();
    setShowDone(true);
    setTimeout(() => {
      speak('Session complete. Well done.', {
        rate: settings.voiceRate,
        pitch: settings.voicePitch,
        voiceName: settings.voiceName,
      });
    }, 1200);
  }, [soundEnabled, volume, settings]);

  // Main interval tick
  useEffect(() => {
    if (localRunning) {
      intervalRef.current = setInterval(() => {
        const s = useStore.getState().session;
        const d = useStore.getState().schedule?.days?.find(dd => dd.id === dayId);

        if (s.isResting) {
          if (s.restTimeLeft <= 1) {
            clearInterval(intervalRef.current);
            const nextIndex = s.currentStepIndex + 1;
            if (d && nextIndex < d.steps.length) {
              goToStep(nextIndex, true);
            } else {
              finishSession();
            }
          } else {
            tickSession();
          }
        } else {
          if (s.timeLeft <= 1) {
            clearInterval(intervalRef.current);
            if (soundEnabled) playBowl(volume);
            setTimeout(() => {
              const s2 = useStore.getState().session;
              const d2 = useStore.getState().schedule?.days?.find(dd => dd.id === dayId);
              if (!d2) return;
              if (restSeconds > 0 && s2.currentStepIndex < d2.steps.length - 1) {
                beginRest();
              } else if (s2.currentStepIndex < d2.steps.length - 1) {
                goToStep(s2.currentStepIndex + 1, true);
              } else {
                finishSession();
              }
            }, 800);
          } else {
            if (s.timeLeft === 30 && soundEnabled) playTick(volume);
            tickSession();
          }
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [localRunning]);

  const toggleTimer = () => {
    if (localRunning) {
      setLocalRunning(false);
      stopSpeech();
      setIsSpeaking(false);
      releaseWakeLock();
    } else {
      setLocalRunning(true);
      requestWakeLock();
      const s = useStore.getState().session;
      if (!s.isResting && s.timeLeft === s.totalTime) {
        if (soundEnabled) playNewStep(volume);
        if (voiceEnabled && settings.voiceAutoRead && step) {
          setTimeout(() => speakStep(step), 800);
        }
      }
    }
  };

  const handleSaveFinish = async () => {
    setSaving(true);
    await completeSession(doneNote);
    navigate('/schedule');
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && settings.keepScreenOn) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  };

  const releaseWakeLock = () => {
    try { wakeLockRef.current?.release(); } catch (e) {}
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      stopSpeech();
      releaseWakeLock();
    };
  }, []);

  if (!day || !step) return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16] flex items-center justify-center">
      <p className="text-[#64748b] dark:text-[#94a3b8]">Loading...</p>
    </div>
  );

  // ── DONE SCREEN ──────────────────────────────────────────────────────────────
  if (showDone) {
    const total = day.steps.reduce((a, s) => a + s.durationMinutes, 0);
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16] flex flex-col">
        <div className="max-w-lg mx-auto w-full px-4 pt-16 pb-8 flex flex-col items-center text-center flex-1">
          {/* Indigo checkmark circle */}
          <div className="w-20 h-20 bg-[#6366f1] rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-2">Session complete</h2>
          <p className="text-[#64748b] dark:text-[#94a3b8] mb-8">{day.name} — {total} minutes. Well done.</p>
          <textarea
            className="w-full border border-[#e2e8f4] dark:border-[#1e2235] rounded-xl px-4 py-3 text-sm mb-5 bg-white dark:bg-[#131720] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] resize-none focus:outline-none focus:border-[#6366f1]"
            rows={3}
            placeholder="Add a note (optional)"
            value={doneNote}
            onChange={e => setDoneNote(e.target.value)}
          />
          <button
            onClick={handleSaveFinish}
            disabled={saving}
            className="w-full py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm"
          >
            {saving ? 'Saving...' : 'Save & finish'}
          </button>
        </div>
      </div>
    );
  }

  // ── REST SCREEN ──────────────────────────────────────────────────────────────
  if (session.isResting) {
    const nextStep = day.steps[session.currentStepIndex + 1];
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16]">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setLocalRunning(false); navigate('/schedule'); }}
              className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <div className="flex-1 text-center text-sm text-[#64748b] dark:text-[#94a3b8]">{day.name}</div>
          </div>

          <div className="bg-white dark:bg-[#131720] rounded-2xl border border-[#e2e8f4] dark:border-[#1e2235] p-8 text-center">
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider mb-3">Rest</p>
            <div className="text-6xl font-bold text-[#6366f1] mb-4">{session.restTimeLeft}s</div>
            {nextStep && (
              <div className="bg-[#f8fafc] dark:bg-[#0c0e16] rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mb-1">Up next</p>
                <p className="text-sm font-semibold text-[#0f172a] dark:text-[#f1f5f9]">{nextStep.title || `Exercise ${session.currentStepIndex + 2}`}</p>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">{nextStep.durationMinutes} min</p>
              </div>
            )}
            <button
              onClick={() => goToStep(session.currentStepIndex + 1, true)}
              className="w-full py-3.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl font-semibold text-sm hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-all active:scale-[0.98]"
            >
              Skip rest
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SESSION SCREEN ──────────────────────────────────────────────────────
  const progressPct = (session.currentStepIndex / day.steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => { stopSpeech(); setLocalRunning(false); navigate('/schedule'); }}
            className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <div className="flex-1 text-center text-sm text-[#64748b] dark:text-[#94a3b8] font-medium">
            {day.name} · {session.currentStepIndex + 1}/{day.steps.length}
          </div>
        </div>

        <div className="h-1.5 bg-[#e2e8f4] dark:bg-[#1e2235] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[#6366f1] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="bg-white dark:bg-[#131720] rounded-2xl border border-[#e2e8f4] dark:border-[#1e2235] overflow-hidden mb-4">
          <div className="p-5 relative">
            <StepCard
              step={step}
              stepNum={session.currentStepIndex + 1}
              totalSteps={day.steps.length}
              dayName={day.name}
              isSpeaking={isSpeaking}
              onListen={() => {
                if (getIsSpeaking()) { stopSpeech(); setIsSpeaking(false); }
                else speakStep(step);
              }}
            />
          </div>
          <div className="border-t border-[#e2e8f4] dark:border-[#1e2235] p-5">
            <TimerRing timeLeft={session.timeLeft} totalTime={session.totalTime} stepType="active" />
            <div className="text-center text-sm text-[#64748b] dark:text-[#94a3b8] mt-2 mb-4">
              {step.durationMinutes} min
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => goToStep(session.currentStepIndex - 1)}
                disabled={session.currentStepIndex === 0}
                className="flex-1 py-3.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
              <button
                onClick={toggleTimer}
                className="flex-1 py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
              >
                {localRunning ? 'Pause' : session.timeLeft < session.totalTime ? 'Resume' : 'Start'}
              </button>
              <button
                onClick={() => {
                  const d = useStore.getState().schedule?.days?.find(dd => dd.id === dayId);
                  if (session.currentStepIndex < (d?.steps.length ?? 0) - 1) goToStep(session.currentStepIndex + 1);
                  else finishSession();
                }}
                className="flex-1 py-3.5 bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] rounded-xl font-semibold text-sm hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                Skip
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <StepList steps={day.steps} currentIndex={session.currentStepIndex} onJump={goToStep} />
      </div>
    </div>
  );
}
