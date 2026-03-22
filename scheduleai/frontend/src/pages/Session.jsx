import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import { playBowl, playNewStep, playRestChime, playSessionDone, playCountdownBeep, playPrepareStart } from '../lib/sounds.js';
import { speak, stop as stopSpeech } from '../lib/tts.js';

const PHASE = {
  prepare: { label: 'GET READY', bg: '#c05000' },
  work:    { label: 'WORK',      bg: '#1a7a40' },
  rest:    { label: 'REST',      bg: '#1060b0' },
};

export default function Session() {
  const { dayId } = useParams();
  const navigate = useNavigate();
  const { schedule, settings, completeSession } = useStore();

  const day = schedule?.days?.find(d => d.id === dayId);
  const steps = day?.steps || [];

  const restSeconds = schedule?.restSeconds ?? 30;
  const prepareSeconds = settings.prepareSeconds ?? 5;
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);

  const intervalRef = useRef(null);
  const stateRef = useRef({ stepIndex: 0, currentSet: 1, phase: 'prepare', timeLeft: prepareSeconds > 0 ? prepareSeconds : (steps[0]?.durationMinutes || 5) * 60 });

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

  const initStep = useCallback((idx, set = 1) => {
    const s = steps[idx];
    if (!s) return;
    const startPhase = prepareSeconds > 0 ? 'prepare' : 'work';
    const startTime = startPhase === 'prepare' ? prepareSeconds : s.durationMinutes * 60;
    setStepIndex(idx);
    setCurrentSet(set);
    setPhase(startPhase);
    setTimeLeft(startTime);
    setShowInstructions(false);
    if (startPhase === 'prepare' && soundEnabled) playPrepareStart(volume);
    if (startPhase === 'work' && voiceEnabled && s.instructions) {
      setTimeout(() => speak(`${s.title}. ${s.instructions}`, { rate: settings.voiceRate, pitch: settings.voicePitch, voiceName: settings.voiceName }), 500);
    }
  }, [steps, prepareSeconds, soundEnabled, voiceEnabled, volume, settings]);

  useEffect(() => {
    if (steps.length > 0) initStep(0);
  }, []);

  const onPhaseComplete = useCallback(() => {
    const { stepIndex: si, currentSet: cs, phase: ph } = stateRef.current;
    const step = steps[si];
    if (!step) return;
    const totalSets = step.sets || 1;
    stopSpeech();

    if (ph === 'prepare') {
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
        const nextIdx = si + 1;
        if (nextIdx < steps.length) {
          setTimeout(() => initStep(nextIdx), 800);
        } else {
          setTimeout(() => {
            if (soundEnabled) playSessionDone(volume);
            releaseWakeLock();
            setRunning(false);
            setShowDone(true);
          }, 800);
        }
      } else {
        if (soundEnabled) playRestChime(volume);
        setPhase('rest');
        setTimeLeft(restSeconds);
      }

    } else if (ph === 'rest') {
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

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          const next = t - 1;
          if (next <= finalCount && next > 0 && soundEnabled) playCountdownBeep(volume);
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

  const toggleRunning = () => {
    if (showInstructions) { setShowInstructions(false); return; }
    setRunning(r => !r);
  };

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
    initStep(Math.max(0, stepIndex - 1));
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

  if (showDone) {
    return (
      <div className="min-h-screen bg-[#f0f2ff] dark:bg-[#0c0e16] flex flex-col">
        <div className="max-w-lg mx-auto w-full px-4 pt-16 pb-8 flex flex-col items-center text-center flex-1">
          <div className="w-20 h-20 bg-[#6366f1] rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a] dark:text-[#f1f5f9] mb-2">Session complete!</h2>
          <p className="text-[#64748b] dark:text-[#94a3b8] mb-8">
            {day.name} · {steps.reduce((a, s) => a + s.durationMinutes * (s.sets || 1), 0)} min
          </p>
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
            className="w-full py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {saving ? 'Saving...' : 'Save & finish'}
          </button>
        </div>
      </div>
    );
  }

  const step = steps[stepIndex];
  const totalSets = step?.sets || 1;
  const config = PHASE[phase] || PHASE.work;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');
  const hasInstructions = step?.instructions?.trim();

  // Progress: fraction of exercises done
  const progressPct = (stepIndex / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 flex flex-col select-none transition-colors duration-500"
      style={{ backgroundColor: config.bg }}
      onClick={toggleRunning}
    >
      {/* Thin progress bar at very top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className="h-full bg-white/40 transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={() => { stopSpeech(); clearInterval(intervalRef.current); navigate('/'); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Exercise position */}
        <p className="text-white/50 text-xs font-bold tracking-widest uppercase">
          {stepIndex + 1} / {steps.length}
        </p>

        {/* Info button — only during work with instructions */}
        {hasInstructions ? (
          <button
            onClick={() => setShowInstructions(v => !v)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showInstructions ? 'bg-white/30' : 'bg-white/10 active:bg-white/20'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none px-6">

        {/* Phase label */}
        <p
          className="text-white font-black uppercase tracking-[0.18em] mb-2"
          style={{ fontSize: 'clamp(1.3rem, 6vw, 2.5rem)' }}
        >
          {config.label}
        </p>

        {/* Set info */}
        {totalSets > 1 && (
          <p
            className="text-white/55 font-bold tracking-widest uppercase mb-3"
            style={{ fontSize: 'clamp(0.75rem, 3vw, 1.1rem)' }}
          >
            SET {currentSet} / {totalSets}
          </p>
        )}

        {/* Countdown */}
        <p
          className="text-white font-black tabular-nums leading-none"
          style={{ fontSize: 'clamp(5.5rem, 26vw, 13rem)', letterSpacing: '-0.04em' }}
        >
          {mins}:{secs}
        </p>

        {/* Exercise name */}
        <p
          className="text-white/65 font-semibold mt-6 text-center"
          style={{ fontSize: 'clamp(0.95rem, 4vw, 1.4rem)' }}
        >
          {step?.title || 'Exercise'}
        </p>

        {/* Tap hint when paused */}
        {!running && (
          <p className="text-white/35 text-xs font-semibold tracking-widest uppercase mt-4">
            TAP TO {timeLeft === (prepareSeconds > 0 ? prepareSeconds : (step?.durationMinutes || 5) * 60) && !running ? 'START' : 'RESUME'}
          </p>
        )}
      </div>

      {/* Instructions sheet */}
      {showInstructions && (
        <div
          className="absolute inset-x-0 bottom-0 z-20"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-black/75 backdrop-blur-md rounded-t-3xl px-6 pt-4 pb-10">
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-5" />
            <p className="text-white/45 text-xs font-bold uppercase tracking-widest mb-2">{step?.title}</p>
            <p className="text-white/90 text-[15px] leading-relaxed">{step?.instructions}</p>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 rounded-2xl bg-white/15 active:bg-white/25 text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!showInstructions && (
        <div
          className="flex flex-col items-center pb-14 gap-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Dot indicators */}
          <div className="flex gap-2 items-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === stepIndex ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: i < stepIndex
                    ? 'rgba(255,255,255,0.45)'
                    : i === stepIndex
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.18)',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-8">
            {/* Prev */}
            <button
              onClick={prevExercise}
              className="w-14 h-14 rounded-full bg-white/10 active:bg-white/25 flex items-center justify-center transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={toggleRunning}
              className="w-20 h-20 rounded-full bg-white/20 active:bg-white/35 flex items-center justify-center transition-colors"
            >
              {running ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <rect x="5" y="4" width="4" height="16" rx="1.5"/>
                  <rect x="15" y="4" width="4" height="16" rx="1.5"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ marginLeft: '3px' }}>
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={skipPhase}
              className="w-14 h-14 rounded-full bg-white/10 active:bg-white/25 flex items-center justify-center transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
