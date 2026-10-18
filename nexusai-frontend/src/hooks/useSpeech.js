import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

// "Listen". Two voices:
//  - the server's (Google Cloud TTS) via /ai/speak, which speaks any supported language on any device
//  - the browser's own speech engine, used for English and as the backup if the server voice is unavailable
// `supported` is false only when neither can work, so the caller can hide the button.
export default function useSpeech() {
  const synthOk = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const runRef = useRef(0); // lets a newer request or Stop cancel an older one still loading

  const stop = useCallback(() => {
    runRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (synthOk) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [synthOk]);

  // Whether this device has a voice for a language tag like "hi-IN". The voice
  // list can be empty until the browser loads it; then we cannot tell, so we try anyway.
  const hasVoice = useCallback((tag) => {
    if (!synthOk || !tag) return true;
    const voices = window.speechSynthesis.getVoices?.() || [];
    if (voices.length === 0) return true;
    const base = tag.split('-')[0].toLowerCase();
    return voices.some((v) => v.lang?.toLowerCase().startsWith(base));
  }, [synthOk]);

  const speakBrowser = useCallback((text, tag) => {
    if (!synthOk || !text) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (tag) u.lang = tag;
    u.rate = 1;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    return true;
  }, [synthOk]);

  // Plays the server voice. Resolves true if it played, false if the server voice
  // could not be used (not set up, quota, offline), so the caller can fall back.
  const speakServer = useCallback(async (text, cloudTag) => {
    const run = ++runRef.current;
    setSpeaking(true);
    try {
      const r = await api.post('/ai/speak', { text: text.slice(0, 1500), lang: cloudTag });
      if (run !== runRef.current) return true; // stopped or replaced while loading
      const audio = new Audio(`data:audio/mpeg;base64,${r.data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
      return true;
    } catch {
      if (run === runRef.current) setSpeaking(false);
      return false;
    }
  }, []);

  // Never keep talking after the reader is closed or the article changes.
  useEffect(() => () => {
    runRef.current += 1;
    audioRef.current?.pause();
    if (synthOk) window.speechSynthesis.cancel();
  }, [synthOk]);

  return { supported: true, synthOk, speaking, stop, hasVoice, speakBrowser, speakServer };
}
