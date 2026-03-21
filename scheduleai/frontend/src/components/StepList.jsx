import React, { useEffect, useRef } from 'react';

export default function StepList({ steps, currentIndex, onJump }) {
  const currentRef = useRef(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentIndex]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e0dbd0] dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 text-xs font-semibold text-[#9a9486] dark:text-gray-400 uppercase tracking-wider border-b border-[#f0ece4] dark:border-gray-700">
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
            className={`flex items-center gap-3 px-4 py-3 border-b border-[#f7f4ef] dark:border-gray-700 last:border-0 cursor-pointer transition-colors ${
              isCurrent ? 'bg-[#fdf9f2] dark:bg-gray-700 border-l-4 border-l-[#8b7355]' : 'hover:bg-[#faf7f2] dark:hover:bg-gray-700'
            } ${isDone ? 'opacity-50' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isDone ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
              : isCurrent ? 'bg-[#3d3420] text-white'
              : 'bg-[#f0ece4] dark:bg-gray-600 text-[#9a9486] dark:text-gray-400'
            }`}>
              {isDone ? '✓' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#2c2a24] dark:text-gray-100 truncate">{step.title || `Exercise ${i + 1}`}</div>
              <div className="text-xs text-[#9a9486] dark:text-gray-400">{step.durationMinutes} min</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
