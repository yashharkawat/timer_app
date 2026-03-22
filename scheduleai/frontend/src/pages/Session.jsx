import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore.js';
import { playBowl, playNewStep, playRestChime, playSessionDone, playCountdownBeep, playPrepareStart } from '../lib/sounds.js';
import { speak, stop as stopSpeech } from '../lib/tts.js';

const PHASE = {
  prepare: { label: 'PREPARE', bg: '#c44800' },
  work:    { label: 'WORK',    bg: '#0a8f2e' },
  rest:    { label: 'REST',    bg: '#1a7acc' },
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
  const [showDoc, setShowDoc] = useState(false);
  const [wakeLock, setWakeLock] = useState(null);
  const docText = localStorage.getItem('scheduleai-doc');

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
  const releaseWakeLock = () => { try { wakeLock?.release(); } catch {} };

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
    if (steps.length > 0) {
      initStep(0);
      setTimeout(() => setRunning(true), 300);
    }
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
          if (next <= 0) { clearInterval(intervalRef.current); onPhaseComplete(); return 0; }
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

  const handleTap = () => {
    if (showInstructions) { setShowInstructions(false); return; }
    if (showDoc) { setShowDoc(false); return; }
    setRunning(r => !r);
  };

  const handleSaveFinish = async () => {
    setSaving(true);
    await completeSession(doneNote);
    navigate('/');
  };

  if (!day || steps.length === 0) {
    return (
      <div className="min-h-screen bg-[#0e2020] flex items-center justify-center">
        <p className="text-white/60">No exercises found.</p>
      </div>
    );
  }

  if (showDone) {
    return (
      <div className="min-h-screen bg-[#f0f5f5] dark:bg-[#0e2020] flex flex-col">
        <div className="max-w-lg mx-auto w-full px-4 pt-16 pb-8 flex flex-col items-center text-center flex-1">
          <div className="w-20 h-20 bg-[#f2c029] rounded-full flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0e2020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-[#0f2828] dark:text-white mb-2">Session complete!</h2>
          <p className="text-[#4a7272] dark:text-[#6a9090] mb-8">
            {day.name} · {steps.reduce((a, s) => a + s.durationMinutes * (s.sets || 1), 0)} min
          </p>
          <textarea
            className="w-full border border-[#c4d8d8] dark:border-[#2e4e4e] rounded-sm px-4 py-3 text-sm mb-5 bg-[#dce8e8] dark:bg-[#1a3535] text-[#0f2828] dark:text-white placeholder-[#8aacac] resize-none focus:outline-none"
            rows={3}
            placeholder="Add a note (optional)"
            value={doneNote}
            onChange={e => setDoneNote(e.target.value)}
          />
          <button
            onClick={handleSaveFinish}
            disabled={saving}
            className="w-full py-4 bg-[#f2c029] text-[#0e2020] font-bold text-base disabled:opacity-50 active:opacity-70 transition-opacity"
          >
            {saving ? 'Saving...' : 'Save & finish'}
          </button>
          <button onClick={() => navigate('/')} className="mt-4 text-[#4a7272] dark:text-[#6a9090] text-sm">
            Skip
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
  return (
    <div
      className="fixed inset-0 flex flex-col select-none"
      style={{ backgroundColor: config.bg }}
      onClick={handleTap}
    >
      {/* Barely-visible exit button */}
      <button
        onClick={(e) => { e.stopPropagation(); stopSpeech(); clearInterval(intervalRef.current); navigate('/'); }}
        className="absolute top-10 left-4 text-white/20 hover:text-white/50 transition-colors p-2 z-10"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Top-right buttons — info (WORK) + doc (always if doc exists) */}
      <div className="absolute top-10 right-4 flex items-center gap-1 z-10">
        {docText && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDoc(v => !v); setShowInstructions(false); }}
            className="text-white/20 hover:text-white/50 transition-colors p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
        )}
        {phase === 'work' && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowInstructions(v => !v); setShowDoc(false); }}
            className="text-white/20 hover:text-white/50 transition-colors p-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>
        )}
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
        {/* Set number */}
        {totalSets > 1 && (
          <p className="text-white font-light mb-2" style={{ fontSize: 'clamp(2.5rem, 12vw, 5rem)', lineHeight: 1 }}>
            {currentSet}
          </p>
        )}

        {/* Big timer — MM:SS with centered dot as colon */}
        <p
          className="text-white font-light tabular-nums leading-none"
          style={{ fontSize: 'clamp(5.5rem, 26vw, 14rem)', letterSpacing: '-0.02em' }}
        >
          {mins}<span style={{ fontSize: '60%', verticalAlign: 'middle', margin: '0 0.04em' }}>·</span>{secs}
        </p>

        {/* Phase label — huge, faded, same color family */}
        <p
          className="font-black uppercase tracking-[0.06em] mt-4"
          style={{
            fontSize: 'clamp(3rem, 14vw, 8rem)',
            color: 'rgba(255,255,255,0.22)',
            lineHeight: 1,
          }}
        >
          {config.label}
        </p>

        {/* Exercise name — subtle */}
        <p className="text-white/40 font-medium mt-6 text-center px-8" style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.2rem)' }}>
          {step?.title}
        </p>
      </div>

      {/* Instructions sheet */}
      {showInstructions && (
        <div
          className="absolute inset-x-0 bottom-0 z-20"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-black/70 backdrop-blur-md rounded-t-2xl px-6 pt-4 pb-10">
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-5" />
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Exercise</p>
            <p className="text-white font-bold text-xl mb-4">{step?.title}</p>
            {step?.instructions?.trim()
              ? <p className="text-white/80 text-[15px] leading-relaxed">{step.instructions}</p>
              : <p className="text-white/40 text-[15px] italic">No instructions for this exercise.</p>
            }
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 rounded-sm bg-white/15 active:bg-white/25 text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Document sheet */}
      {showDoc && docText && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 max-h-[70vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-black/75 backdrop-blur-md rounded-t-2xl px-6 pt-4 pb-10 flex flex-col max-h-[70vh]">
            <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-5 flex-shrink-0" />
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 flex-shrink-0">Document</p>
            <div className="overflow-y-auto flex-1 mb-4">
              <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">{docText}</p>
            </div>
            <button
              onClick={() => setShowDoc(false)}
              className="w-full py-3 rounded-sm bg-white/15 active:bg-white/25 text-white font-semibold text-sm transition-colors flex-shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
