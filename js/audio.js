/**
 * audio.js - हिंदी ध्वनि एवं आवाज़ इंजन
 * Web Speech API (हिंदी टेक्स्ट-टू-स्पीच) + Web Audio API (रोचक ध्वनियाँ)
 */

class AudioEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.hindiVoice = null;
    this.speechRate = 0.85; // बुजुर्गों के लिए स्पष्ट और मध्यम गति (Default 0.85x)
    this.audioCtx = null;
    this.isMuted = false;

    this.praises = [
      "शाबाश!",
      "बहुत बढ़िया!",
      "बिल्कुल सही!",
      "अति उत्तम!",
      "वाह! बहुत अच्छा!",
      "शानदार!"
    ];

    this.initVoices();
  }

  // Audio Context आरंभ करना (User gesture के बाद)
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // हिंदी आवाज़ें लोड और चयन करना
  initVoices() {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth.getVoices();
      // हिंदी वॉइस ढूँढना (Google Hindi, Microsoft, etc.)
      this.hindiVoice = this.voices.find(v => v.lang === 'hi-IN' || v.lang === 'hi_IN' || v.lang.startsWith('hi')) || null;
    };

    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  // गति बदलना (सामान्य / धीमी)
  setRate(rate) {
    this.speechRate = rate;
  }

  getRate() {
    return this.speechRate;
  }

  // हिंदी में बोलना
  speak(text, onStart = null, onEnd = null) {
    if (!this.synth || !text) return;

    this.synth.cancel(); // पिछली आवाज़ रोकें

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    if (this.hindiVoice) {
      utterance.voice = this.hindiVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    this.synth.speak(utterance);
  }

  // शाबाशी बोलना
  speakPraise(callback) {
    const praise = this.praises[Math.floor(Math.random() * this.praises.length)];
    this.speak(praise, null, callback);
  }

  // बोलना बंद करना
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /* =========================================================================
     Web Audio API - साउंड इफ़ेक्ट्स (बिना बाहरी MP3 फाइल के 100% ऑफ़लाइन)
     ========================================================================= */

  // बटन क्लिक की हल्की मधुर आवाज़
  playClickTone() {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  // सही उत्तर पर मधुर घंटी (Pleasant Chime)
  playSuccessTone() {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Harpsichord/Chime)

      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch (e) {}
  }

  // गलत होने पर कोमल संकेत (Non-jarring Gentle Error)
  playWrongTone() {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  // सितारे मिलने पर जादुई घंटी (Star Ding)
  playStarTone(index = 0) {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const freqs = [659.25, 783.99, 1046.50]; // E5, G5, C6
      const freq = freqs[index % freqs.length] || 880;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }

  // स्तर पूरा होने पर विजय धुन (Level Complete Fanfare)
  playLevelCompleteTone() {
    if (this.isMuted) return;
    this.initAudioContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const melody = [
        { freq: 523.25, time: 0.00, dur: 0.15 }, // C5
        { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
        { freq: 783.99, time: 0.30, dur: 0.15 }, // G5
        { freq: 1046.50, time: 0.45, dur: 0.40 } // C6
      ];

      melody.forEach(note => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.22, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch (e) {}
  }
}

// ग्लोबल ऑडियो ऑब्जेक्ट
const audio = new AudioEngine();
