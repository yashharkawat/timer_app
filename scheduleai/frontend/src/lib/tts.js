let isSpeaking = false;

export function initVoices(onReady) {
  if (!('speechSynthesis' in window)) return;
  function populate() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) onReady(voices);
  }
  populate();
  window.speechSynthesis.onvoiceschanged = populate;
}

export function speak(text, { rate = 0.92, pitch = 1.0, voiceName = '', onStart, onEnd, onError } = {}) {
  if (!('speechSynthesis' in window)) return;
  stop();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.pitch = pitch;
  if (voiceName) {
    const match = speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (match) utter.voice = match;
  }
  utter.onstart = () => { isSpeaking = true; onStart?.(); };
  utter.onend = () => { isSpeaking = false; onEnd?.(); };
  utter.onerror = () => { isSpeaking = false; onError?.(); };
  window.speechSynthesis.speak(utter);
}

export function stop() {
  try { window.speechSynthesis.cancel(); } catch(e) {}
  isSpeaking = false;
}

export function getIsSpeaking() { return isSpeaking; }
