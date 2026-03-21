import React, { useEffect, useRef } from 'react';

export default function StepList({ steps, currentIndex, onJump }) {
  const currentRef = useRef(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIndex]);

  return (
    <div className="bg-white dark:bg-[#131720] rounded-2xl border border-[#e2e8f4] dark:border-[#1e2235] overflow-hidden">
      <div className="px-4 py-3 text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider border-b border-[#e2e8f4] dark:border-[#1e2235]">
        Exercises
      </div>
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div
            key={step.id}
            ref={isCurrent ? currentRef : null}
            onClick={() => onJump(i)}
            className={`flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f4] dark:border-[#1e2235] last:border-0 cursor-pointer transition-colors ${
              isCurrent
                ? 'bg-[#eef2ff] dark:bg-[#1e2040] border-l-4 border-l-[#6366f1]'
                : 'hover:bg-[#f8fafc] dark:hover:bg-[#131720]'
            } ${isDone ? 'opacity-60' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isDone
                ? 'bg-[#d1fae5] dark:bg-[#064e3b] text-[#059669] dark:text-[#34d399]'
                : isCurrent
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#f1f5f9] dark:bg-[#1e2235] text-[#94a3b8]'
            }`}>
              {isDone ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3"/>
                </svg>
              ) : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#0f172a] dark:text-[#f1f5f9] truncate">{step.title || `Exercise ${i + 1}`}</div>
              <div className="text-xs text-[#64748b] dark:text-[#94a3b8]">{step.durationMinutes} min</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
