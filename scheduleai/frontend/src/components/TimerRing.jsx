import React from 'react';

const CIRCUMFERENCE = 2 * Math.PI * 52;

export default function TimerRing({ timeLeft, totalTime, stepType }) {
  const progress = totalTime > 0 ? timeLeft / totalTime : 1;
  const offset = CIRCUMFERENCE * progress;
  const urgent = timeLeft <= 30 && timeLeft > 0;

  const strokeColor = urgent
    ? '#b85c38'
    : stepType === 'rest'
    ? '#5a8a6e'
    : stepType === 'evening'
    ? '#7a5a9e'
    : '#8b7355';

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg width="128" height="128" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        <circle className="fill-none stroke-[#f0ece4] dark:stroke-gray-700" cx="60" cy="60" r="52" strokeWidth="6" />
        <circle
          className="fill-none"
          cx="60" cy="60" r="52"
          strokeWidth="6"
          strokeLinecap="round"
          stroke={strokeColor}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-[#2c2a24] dark:text-gray-100 tracking-tight">{timeStr}</span>
      </div>
    </div>
  );
}
