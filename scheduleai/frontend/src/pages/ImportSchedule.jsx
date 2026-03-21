import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractText } from '../lib/parseDoc.js';
import { api } from '../lib/api.js';
import useStore from '../store/useStore.js';

const ACCEPTED = '.pdf,.docx';

export default function ImportSchedule() {
  const navigate = useNavigate();
  const { fetchSchedule } = useStore();
  const inputRef = useRef();

  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | extracting | analyzing | preview | saving | error
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('Only PDF and DOCX files are supported.');
      setStatus('error');
      return;
    }

    setError('');
    setStatus('extracting');
    try {
      const text = await extractText(file);
      if (!text || text.trim().length < 20) {
        throw new Error('Could not extract readable text from this file.');
      }

      setStatus('analyzing');
      const schedule = await api.importScheduleFromAI(text);
      setPreview(schedule);
      setStatus('preview');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setStatus('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      await fetchSchedule();
      navigate('/schedule');
    } catch {
      navigate('/schedule');
    }
  };

  const reset = () => {
    setStatus('idle');
    setError('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const totalExercises = preview?.days?.reduce((a, d) => a + (d.steps?.length || 0), 0) || 0;
  const activeDays = preview?.days?.filter(d => d.steps?.length > 0) || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c0e16]">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">Import from document</h1>
        </div>

        {/* Drop zone */}
        {status === 'idle' && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-[#6366f1] bg-[#eef2ff] dark:bg-[#1e2040]'
                  : 'border-[#6366f1]/30 hover:border-[#6366f1] hover:bg-[#eef2ff]/50 dark:hover:bg-[#1e2040]/50'
              }`}
            >
              <div className="w-14 h-14 bg-[#eef2ff] dark:bg-[#1e2040] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <p className="font-semibold text-[#0f172a] dark:text-[#f1f5f9] mb-1">Drop your document here</p>
              <p className="text-sm text-[#64748b] dark:text-[#94a3b8]">or tap to choose a file</p>
              <p className="text-xs text-[#94a3b8] mt-3">PDF or DOCX</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileInput}
            />
            <p className="text-xs text-center text-[#64748b] dark:text-[#94a3b8] mt-4">
              AI will read your document and extract a weekly schedule automatically.
            </p>
          </>
        )}

        {/* Loading states */}
        {(status === 'extracting' || status === 'analyzing' || status === 'saving') && (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="font-medium text-[#0f172a] dark:text-[#f1f5f9]">
              {status === 'extracting' && 'Reading document...'}
              {status === 'analyzing' && 'AI is analyzing your schedule...'}
              {status === 'saving' && 'Saving...'}
            </p>
            <p className="text-sm text-[#64748b] dark:text-[#94a3b8] mt-1">
              {status === 'analyzing' && 'This may take a few seconds'}
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="font-semibold text-[#0f172a] dark:text-[#f1f5f9] mb-2">Could not parse document</p>
            <p className="text-sm text-red-500 mb-6">{error}</p>
            <button
              onClick={reset}
              className="px-6 py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold active:scale-95 transition-all"
            >
              Try again
            </button>
          </div>
        )}

        {/* Preview */}
        {status === 'preview' && preview && (
          <div>
            <div className="bg-white dark:bg-[#131720] rounded-2xl border border-[#6366f1] p-5 mb-4 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-[#6366f1] dark:text-[#818cf8] uppercase tracking-wider mb-1">Schedule found</p>
                  <h2 className="text-xl font-bold text-[#0f172a] dark:text-[#f1f5f9]">{preview.title}</h2>
                  {preview.description && (
                    <p className="text-sm text-[#64748b] dark:text-[#94a3b8] mt-1">{preview.description}</p>
                  )}
                </div>
                <div className="w-9 h-9 bg-[#d1fae5] dark:bg-[#064e3b] rounded-xl flex items-center justify-center flex-shrink-0 ml-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>

              <div className="flex gap-4 text-sm mb-5">
                <div className="text-center">
                  <div className="font-bold text-lg text-[#6366f1]">{activeDays.length}</div>
                  <div className="text-[#64748b] dark:text-[#94a3b8] text-xs">days</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-[#6366f1]">{totalExercises}</div>
                  <div className="text-[#64748b] dark:text-[#94a3b8] text-xs">exercises</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-[#6366f1]">{preview.restSeconds || 30}s</div>
                  <div className="text-[#64748b] dark:text-[#94a3b8] text-xs">rest</div>
                </div>
              </div>

              <div className="space-y-1">
                {activeDays.map((day) => {
                  const mins = day.steps?.reduce((a, s) => a + (s.durationMinutes || 0), 0) || 0;
                  return (
                    <div key={day.name} className="flex items-center justify-between py-2 border-t border-[#e2e8f4] dark:border-[#1e2235] first:border-0">
                      <div>
                        <span className="font-medium text-sm text-[#0f172a] dark:text-[#f1f5f9]">{day.name}</span>
                        <span className="text-xs text-[#64748b] dark:text-[#94a3b8] ml-2">
                          {day.steps?.length} exercise{day.steps?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">{mins} min</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-xl font-semibold text-base active:scale-[0.98] transition-all mb-3 shadow-sm"
            >
              Use this schedule
            </button>
            <button
              onClick={reset}
              className="w-full py-3 text-sm text-[#64748b] dark:text-[#94a3b8] hover:text-[#6366f1] dark:hover:text-[#818cf8] transition-colors font-medium"
            >
              Try a different file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
