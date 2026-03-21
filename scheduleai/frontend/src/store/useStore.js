import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api.js';

const useStore = create(
  persist(
    (set, get) => ({
      schedule: null,
      settings: {
        notifEnabled: false,
        notifTime: '08:00',
        notifDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        notifMessage: 'Time for your session!',
        voiceEnabled: true,
        voiceName: '',
        voiceRate: 0.92,
        voicePitch: 1.0,
        voiceAutoRead: true,
        soundsEnabled: true,
        soundVolume: 0.8,
        theme: 'light',
        keepScreenOn: true,
      },
      log: [],
      streak: 0,
      loading: false,
      error: null,

      session: {
        dayId: null,
        currentStepIndex: 0,
        running: false,
        timeLeft: 0,
        totalTime: 0,
        isResting: false,
        restTimeLeft: 0,
        startedAt: null,
      },

      fetchSchedule: async () => {
        try {
          set({ loading: true, error: null });
          const schedule = await api.getActiveSchedule();
          set({ schedule, loading: false });
          return schedule;
        } catch (err) {
          set({ loading: false, error: err.message });
          return null;
        }
      },

      fetchSettings: async () => {
        try {
          const s = await api.getSettings();
          set({
            settings: {
              notifEnabled: s.notifEnabled,
              notifTime: s.notifTime,
              notifDays: Array.isArray(s.notifDays) ? s.notifDays : JSON.parse(s.notifDays || '[]'),
              notifMessage: s.notifMessage,
              voiceEnabled: s.voiceEnabled,
              voiceName: s.voiceName,
              voiceRate: s.voiceRate,
              voicePitch: s.voicePitch,
              voiceAutoRead: s.voiceAutoRead,
              soundsEnabled: s.soundsEnabled,
              soundVolume: s.soundVolume,
              theme: s.theme,
              keepScreenOn: s.keepScreenOn,
            }
          });
        } catch (err) {
          console.warn('Could not fetch settings:', err.message);
        }
      },

      saveSettings: async (updates) => {
        const newSettings = { ...get().settings, ...updates };
        set({ settings: newSettings });
        try {
          await api.updateSettings(newSettings);
        } catch (err) {
          console.warn('Could not save settings:', err.message);
        }
      },

      fetchLog: async () => {
        try {
          const log = await api.getSessions();
          set({ log });
        } catch (err) {
          console.warn('Could not fetch log:', err.message);
        }
      },

      fetchStreak: async () => {
        try {
          const { streak } = await api.getStreak();
          set({ streak });
        } catch (err) {}
      },

      setSchedule: (schedule) => set({ schedule }),

      startSession: (dayId) => {
        const day = get().schedule?.days?.find(d => d.id === dayId);
        if (!day?.steps?.length) return;
        const firstStep = day.steps[0];
        set({
          session: {
            dayId,
            currentStepIndex: 0,
            running: false,
            timeLeft: firstStep.durationMinutes * 60,
            totalTime: firstStep.durationMinutes * 60,
            isResting: false,
            restTimeLeft: 0,
            startedAt: Date.now(),
          },
        });
      },

      setSessionStep: (index) => {
        const state = get();
        const day = state.schedule?.days?.find(d => d.id === state.session.dayId);
        if (!day) return;
        const step = day.steps[index];
        if (!step) return;
        set({
          session: {
            ...state.session,
            currentStepIndex: index,
            running: false,
            timeLeft: step.durationMinutes * 60,
            totalTime: step.durationMinutes * 60,
            isResting: false,
            restTimeLeft: 0,
          },
        });
      },

      startRest: () => {
        const restSeconds = get().schedule?.restSeconds ?? 30;
        set((state) => ({
          session: {
            ...state.session,
            running: false,
            isResting: true,
            restTimeLeft: restSeconds,
          },
        }));
      },

      tickSession: () =>
        set((state) => {
          if (!state.session.running) return state;
          if (state.session.isResting) {
            const newRest = Math.max(0, state.session.restTimeLeft - 1);
            return { session: { ...state.session, restTimeLeft: newRest } };
          }
          const newTime = Math.max(0, state.session.timeLeft - 1);
          return { session: { ...state.session, timeLeft: newTime } };
        }),

      pauseSession: () =>
        set((state) => ({ session: { ...state.session, running: false } })),

      resumeSession: () =>
        set((state) => ({ session: { ...state.session, running: true } })),

      completeSession: async (notes) => {
        const state = get();
        const day = state.schedule?.days?.find(d => d.id === state.session.dayId);
        if (!day) return;
        try {
          await api.logSession({
            dayId: day.id,
            completedSteps: day.steps.length,
            totalSteps: day.steps.length,
            durationMinutes: day.steps.reduce((a, s) => a + s.durationMinutes, 0),
            notes: notes || '',
          });
          get().fetchLog();
          get().fetchStreak();
        } catch (err) {
          console.warn('Could not log session:', err.message);
        }
        set({
          session: {
            dayId: null,
            currentStepIndex: 0,
            running: false,
            timeLeft: 0,
            totalTime: 0,
            isResting: false,
            restTimeLeft: 0,
            startedAt: null,
          },
        });
      },
    }),
    {
      name: 'scheduleai-storage',
      partialize: (state) => ({
        schedule: state.schedule,
        settings: state.settings,
      }),
    }
  )
);

export default useStore;
