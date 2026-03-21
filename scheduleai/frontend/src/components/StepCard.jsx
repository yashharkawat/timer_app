import React from 'react';

export default function StepCard({ step, stepNum, totalSteps, dayName, isSpeaking, onListen }) {
  return (
    <div className="relative">
      <div className="text-xs text-[#9a9486] dark:text-gray-400 uppercase tracking-wider mb-2 font-medium">
        {dayName} · Exercise {stepNum} of {totalSteps}
      </div>
      <h2 className="text-xl font-bold text-[#2c2a24] dark:text-gray-100 leading-tight mb-3 pr-20">
        {step.title || `Exercise ${stepNum}`}
      </h2>
      {step.instructions && (
        <p className="text-sm text-[#5a5548] dark:text-gray-300 leading-relaxed">{step.instructions}</p>
      )}
      {step.instructions && (
        <button
          onClick={onListen}
          className={`absolute top-0 right-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isSpeaking
              ? 'bg-[#3d3420] text-white border-[#3d3420]'
              : 'bg-[#f0ece4] dark:bg-gray-700 text-[#5a5548] dark:text-gray-300 border-[#d4cfc4] dark:border-gray-600 hover:bg-[#e4dfd4]'
          }`}
        >
          {isSpeaking ? '⏸ Stop' : '▶ Listen'}
        </button>
      )}
    </div>
  );
}
