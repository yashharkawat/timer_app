import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import { playBowl, playNewStep, playRestChime, playSessionDone, playCountdownBeep, playPrepareStart } from '../lib/sounds.js';
import { speak, stop as stopSpeech } from '../lib/tts.js';

const PHASE = {
  prepare: { label: 'PREPARE', bg: '#b84a0a' },
  work:    { label: 'WORK',    bg: '#1a6b3a' },
  rest:    { label: 'REST',    bg: '#1455a6' },
};

export default function Session() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { schedule, settings, completeSession } = useStore();

  const day = schedule?.days?.find(d => d.id === dayId);
  const steps = day?.steps || [];

  const restSeconds = schedule?.restSeconds ?? 30;
  const prepareSeconds = settings.prepareSeconds ?? 5;
  const skipLastRest = settings.skipLastRest ?? false;
  const finalCount = settings.finalCount ?? 3;
  const soundEnabled = settings.soundsEnabled;
  const voiceEnabled = settings.voiceEnabled;
  const volume = settings.soundVolume;

  const [stepIndex, setStepIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState('prepare');
  const [timeLeft, setTimeLeft] = useState(prepareSeconds > 0 ? prepareSeconds : (steps[0]?.durationMinutes || 5) * 60);
  const [running, setRunning] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [doneNote, setDoneNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  const intervalRef = useRef(null);
  const stateRef = useRef({ stepIndex: 0, currentSet: 1, phase: 'prepare', timeLeft: prepareSeconds > 0 ? prepareSeconds : (steps[0]?.durationMinutes || 5) * 60 });

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = { stepIndex, currentSet, phase, timeLeft };
  }, [stepIndex, currentSet, phase, timeLeft]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && settings.keepScreenOn) {
        const wl = await navigator.wakeLock.request('screen');
        setWakeLock(wl);
      }
    } catch {}
  };

  const releaseWakeLock = () => {
    try { wakeLock?.release(); } catch {}
  };

  // Initialize a step
  const initStep = useCallback((idx, set = 1, ph = null) => {
    const s = steps[idx];
    if (!s) return;
    const startPhase = ph || (prepareSeconds > 0 ? 'prepare' : 'work');
    const startTime = startPhase === 'prepare' ? prepareSeconds : s.durationMinutes * 60;
    setStepIndex(idx);
    setCurrentSet(set);
    setPhase(startPhase);
    setTimeLeft(startTime);
    if (startPhase === 'prepare' && soundEnabled) playPrepareStart(volume);
    if (startPhase === 'work' && voiceEnabled && s.instructions) {
      setTimeout(() => speak(`${s.title}. ${s.instructions}`, { rate: settings.voiceRate, pitch: settings.voicePitch, voiceName: settings.voiceName }), 500);
    }
  }, [steps, prepareSeconds, soundEnabled, voiceEnabled, volume, settings]);

  // Init on mount
  useEffect(() => {
    if (steps.length > 0) initStep(0);
  }, []);

  // Transition when a phase ends
  const onPhaseComplete = useCallback(() => {
    const { stepIndex: si, currentSet: cs, phase: ph } = stateRef.current;
    const step = steps[si];
    if (!step) return;
    const totalSets = step.sets || 1;

    stopSpeech();

    if (ph === 'prepare') {
      // Start work
      if (soundEnabled) playNewStep(volume);
      if (voiceEnabled && step.instructions) {
        setTimeout(() => speak(`${step.title}. ${step.instructions}`, { rate: settings.voiceRate, pitch: settings.voicePitch, voiceName: settings.voiceName }), 300);
      }
      setPhase('work');
      setTimeLeft(step.durationMinutes * 60);

    } else if (ph === 'work') {
      if (soundEnabled) playBowl(volume);
      const isLastSet = cs >= totalSets;
      if (isLastSet) {
        // Move to next exercise or finish
        const nextIdx = si + 1;
        if (nextIdx < steps.length) {
          setTimeout(() => initStep(nextIdx), 800);
        } else {
          // Done
          setTimeout(() => {
            if (soundEnabled) playSessionDone(volume);
            releaseWakeLock();
            setRunning(false);
            setShowDone(true);
          }, 800);
        }
      } else {
        // More sets: go to rest
        if (soundEnabled) playRestChime(volume);
        setPhase('rest');
        setTimeLeft(restSeconds);
      }

    } else if (ph === 'rest') {
      // Next set
      const nextSet = cs + 1;
      setCurrentSet(nextSet);
      setPhase('work');
      setTimeLeft(step.durationMinutes * 60);
      if (soundEnabled) playNewStep(volume);
      if (voiceEnabled && step.instructions) {
        setTimeout(() => speak(`Set ${nextSet}. ${step.title}.`, { rate: settings.voiceRate, pitch: settings.voicePitch, voiceName: settings.voiceName }), 300);
      }
    }
  }, [steps, soundEnabled, voiceEnabled, volume, restSeconds, settings, initStep]);

  // Interval tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          const next = t - 1;
          // Final count beeps
          if (next <= finalCount && next > 0 && soundEnabled) {
            playCountdownBeep(volume);
          }
          if (next <= 0) {
            clearInterval(intervalRef.current);
            onPhaseComplete();
            return 0;
          }
          return next;
        });
      }, 1000);
      requestWakeLock();
    } else {
      clearInterval(intervalRef.current);
      releaseWakeLock();
    }
    return () => clearInterval(intervalRef.current);
  }, [running, onPhaseComplete, finalCount, soundEnabled, volume]);

  useEffect(() => () => { clearInterval(intervalRef.current); stopSpeech(); releaseWakeLock(); }, []);

  const toggleRunning = () => setRunning(r => !r);

  const skipPhase = (e) => {
    e?.stopPropagation();
    clearInterval(intervalRef.current);
    setRunning(false);
    onPhaseComplete();
    setTimeout(() => setRunning(true), 100);
  };

  const prevExercise = (e) => {
    e?.stopPropagation();
    clearInterval(intervalRef.current);
    stopSpeech();
    setRunning(false);
    const prev = Math.max(0, stepIndex - 1);
    initStep(prev);
    setTimeout(() => setRunning(true), 100);
  };

  const handleSaveFinish = async () => {
    setSaving(true);
    await completeSession(doneNote);
    navigate('/');
  };

  if (!day || steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#0c0e16] flex items-center justify-center">
        <p className="text-white/60">No exercises found.</p>
      </div>
    );
  }

  const step = steps[stepIndex];
  const totalSets = step?.sets || 1;
  const config = PHASE[phase] || PHASE.work;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const progressPct = ((stepIndex + (phase === 'prepare' ? 0 : currentSet / totalSets)) / steps.length) * 100;

  // Done screen
  if (showDone) {
    return (
      <div className="min-h-screen bg-[#f0f2ff] dark:bg-[#0c0e16] flex flex-col">
        <div className="max-w-lg mx-auto w-full px-4 pt-16 pb-8 flex flex-col items-center text-center flex-1">
          <div className="w-20 h-20 bg-[#6366f1] rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-2">Session complete</h2>
          <p className="text-[#64748b] dark:text-[#94a3b8] mb-8">{day.name} — {steps.reduce((a, s) => a + s.durationMinutes * (s.sets || 1), 0)} min total</p>
          <textarea
            className="w-full border border-[#dde1ef] dark:border-[#1e2235] rounded-xl px-4 py-3 text-sm mb-5 bg-white dark:bg-[#131720] text-[#0f172a] dark:text-[#f1f5f9] placeholder-[#94a3b8] resize-none focus:outline-none focus:border-[#6366f1]"
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

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none transition-colors duration-500"
      style={{ backgroundColor: config.bg }}
      onClick={toggleRunning}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div className="h-full bg-white/50 transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Back button */}
      <button
        onClick={(e) => { e.stopPropagation(); stopSpeech(); clearInterval(intervalRef.current); navigate('/'); }}
        className="absolute top-8 left-5 flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Exit
      </button>

      {/* Exercise name */}
      <p className="absolute top-8 left-0 right-0 text-center text-white/70 text-xs font-bold uppercase tracking-[0.2em] px-20">
        {step?.title || 'Exercise'}
      </p>

      {/* Content */}
      <div className="flex flex-col items-center pointer-events-none">
        {/* Set number */}
        {totalSets > 1 && (
          <p className="text-white/50 font-bold mb-2" style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)', lineHeight: 1 }}>
            {currentSet}
          </p>
        )}

        {/* Big countdown */}
        <p className="text-white font-black tabular-nums" style={{ fontSize: 'clamp(5rem, 22vw, 11rem)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {mins}:{secs}
        </p>

        {/* Phase label */}
        <p className="font-black uppercase tracking-[0.12em] mt-3" style={{ fontSize: 'clamp(2rem, 9vw, 5rem)', color: 'rgba(255,255,255,0.18)', lineHeight: 1 }}>
          {config.label}
        </p>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-10 flex items-center gap-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Prev */}
        <button
          onClick={prevExercise}
          className="w-12 h-12 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={toggleRunning}
          className="w-16 h-16 rounded-full bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
        >
          {running ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        {/* Next / skip phase */}
        <button
          onClick={skipPhase}
          className="w-12 h-12 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Exercise list indicator (dots) */}
      <div className="absolute bottom-28 flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === stepIndex ? '16px' : '6px',
              height: '6px',
              backgroundColor: i === stepIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>

      {/* Pause overlay */}
      {!running && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <p className="text-white/80 text-lg font-semibold tracking-wider uppercase">Paused — tap to resume</p>
        </div>
      )}
    </div>
  );
}
