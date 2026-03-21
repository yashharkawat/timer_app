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
    setLocalRunning(true); // run the rest countdown
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
            // Rest done — advance to next step
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

  if (!day || !step) return <div className="p-8 text-center text-[#9a9486]">Loading...</div>;

  if (showDone) {
    const total = day.steps.reduce((a, s) => a + s.durationMinutes, 0);
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 pb-8 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-[#2c2a24] dark:text-gray-100 mb-2">Session complete</h2>
        <p className="text-[#5a5548] dark:text-gray-300 mb-6">{day.name} — {total} minutes. Well done.</p>
        <textarea
          className="w-full border border-[#e0dbd0] dark:border-gray-600 rounded-xl px-4 py-3 text-sm mb-4 bg-white dark:bg-gray-800 dark:text-gray-100 resize-none"
          rows={3}
          placeholder="Add a note (optional)"
          value={doneNote}
          onChange={e => setDoneNote(e.target.value)}
        />
        <button onClick={handleSaveFinish} disabled={saving}
          className="w-full py-3 bg-[#3d3420] text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-[#2c2412] transition-colors">
          {saving ? 'Saving...' : 'Save & finish'}
        </button>
      </div>
    );
  }

  // Rest screen
  if (session.isResting) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setLocalRunning(false); navigate('/schedule'); }} className="text-[#9a9486] hover:text-[#3d3420] text-sm font-medium">← Back</button>
          <div className="flex-1 text-center text-sm text-[#9a9486] dark:text-gray-400">{day.name}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dbd0] dark:border-gray-700 p-8 text-center mb-4">
          <div className="text-4xl mb-3">😮‍💨</div>
          <h2 className="text-xl font-bold text-[#2c2a24] dark:text-gray-100 mb-1">Rest</h2>
          <p className="text-sm text-[#9a9486] dark:text-gray-400 mb-6">Next: {day.steps[session.currentStepIndex + 1]?.title || `Exercise ${session.currentStepIndex + 2}`}</p>
          <div className="text-5xl font-bold text-[#8b7355] mb-6">{session.restTimeLeft}s</div>
          <button
            onClick={() => {
              goToStep(session.currentStepIndex + 1, true);
            }}
            className="w-full py-3 bg-[#f0ece4] dark:bg-gray-700 text-[#5a5548] dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-[#e4dfd4] transition-all"
          >
            Skip rest →
          </button>
        </div>
      </div>
    );
  }

  const progressPct = (session.currentStepIndex / day.steps.length) * 100;

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => { stopSpeech(); setLocalRunning(false); navigate('/schedule'); }} className="text-[#9a9486] hover:text-[#3d3420] dark:text-gray-400 text-sm font-medium">← Back</button>
        <div className="flex-1 text-center text-sm text-[#9a9486] dark:text-gray-400 font-medium">
          {day.name} · {session.currentStepIndex + 1}/{day.steps.length}
        </div>
      </div>

      <div className="h-1 bg-[#e8e3d8] dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-[#8b7355] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dbd0] dark:border-gray-700 overflow-hidden mb-4">
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
        <div className="border-t border-[#f0ece4] dark:border-gray-700 p-5">
          <TimerRing timeLeft={session.timeLeft} totalTime={session.totalTime} stepType="active" />
          <div className="text-center text-sm text-[#9a9486] dark:text-gray-400 mt-2 mb-4">
            {step.durationMinutes} min
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => goToStep(session.currentStepIndex - 1)}
              disabled={session.currentStepIndex === 0}
              className="flex-1 py-3 bg-[#f0ece4] dark:bg-gray-700 text-[#5a5548] dark:text-gray-300 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-[#e4dfd4] transition-all active:scale-95"
            >
              ← Back
            </button>
            <button
              onClick={toggleTimer}
              className="flex-1 py-3 bg-[#3d3420] text-white rounded-xl font-semibold text-sm hover:bg-[#2c2412] transition-all active:scale-95"
            >
              {localRunning ? 'Pause' : session.timeLeft < session.totalTime ? 'Resume' : 'Start'}
            </button>
            <button
              onClick={() => {
                const d = useStore.getState().schedule?.days?.find(dd => dd.id === dayId);
                if (session.currentStepIndex < (d?.steps.length ?? 0) - 1) goToStep(session.currentStepIndex + 1);
                else finishSession();
              }}
              className="flex-1 py-3 bg-[#f8f5ef] dark:bg-gray-700 text-[#9a9486] dark:text-gray-400 border border-[#e0dbd0] dark:border-gray-600 rounded-xl font-semibold text-sm hover:bg-[#f0ece4] transition-all active:scale-95"
            >
              Skip →
            </button>
          </div>
        </div>
      </div>

      <StepList steps={day.steps} currentIndex={session.currentStepIndex} onJump={goToStep} />
    </div>
  );
}
