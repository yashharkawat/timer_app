import React from 'react';

export default function StepCard({ step, stepNum, totalSteps, dayName, isSpeaking, onListen }) {
  return (
    <div className="relative">
      <div className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2 font-medium">
        {dayName} · Exercise {stepNum} of {totalSteps}
      </div>
      <h2 className="text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9] leading-tight mb-3 pr-20">
        {step.title || `Exercise ${stepNum}`}
      </h2>
      {step.instructions && (
        <p className="text-sm text-[#64748b] dark:text-[#94a3b8] leading-relaxed">{step.instructions}</p>
      )}
      {step.instructions && (
        <button
          onClick={onListen}
          className={`absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isSpeaking
              ? 'bg-[#6366f1] text-white border-[#6366f1]'
              : 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#64748b] dark:text-[#94a3b8] border-[#e2e8f4] dark:border-[#1e2235] hover:bg-[#eef2ff] dark:hover:bg-[#1e2040] hover:text-[#6366f1] dark:hover:text-[#818cf8] hover:border-[#6366f1] dark:hover:border-[#6366f1]'
          }`}
        >
          {isSpeaking ? (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Stop
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Listen
            </>
          )}
        </button>
      )}
    </div>
  );
}
