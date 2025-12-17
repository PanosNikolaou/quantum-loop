class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceLFO: OscillatorNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private isMuted: boolean = false;

  init() {
    if (this.ctx) return;
    
    // Support standard and webkit prefix
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.ctx.destination);
    
    this.startAmbience();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      // Smooth fade
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime, 0.1);
    }
    return this.isMuted;
  }

  startAmbience() {
    if (!this.ctx || !this.masterGain) return;
    
    // Deep sci-fi drone
    this.ambienceOsc = this.ctx.createOscillator();
    this.ambienceOsc.type = 'sawtooth';
    this.ambienceOsc.frequency.value = 55; // Low A (A1)

    this.ambienceFilter = this.ctx.createBiquadFilter();
    this.ambienceFilter.type = 'lowpass';
    this.ambienceFilter.frequency.value = 200;

    // LFO to modulate the filter for "throbbing" effect
    this.ambienceLFO = this.ctx.createOscillator();
    this.ambienceLFO.type = 'sine';
    this.ambienceLFO.frequency.value = 0.15; // Slow pulse

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 150; // Filter sweep amount

    this.ambienceLFO.connect(lfoGain);
    lfoGain.connect(this.ambienceFilter.frequency);

    const ambGain = this.ctx.createGain();
    ambGain.gain.value = 0.1; // Background level

    this.ambienceOsc.connect(this.ambienceFilter);
    this.ambienceFilter.connect(ambGain);
    ambGain.connect(this.masterGain);

    this.ambienceOsc.start();
    this.ambienceLFO.start();
  }

  playRotate() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    // High tech click
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.05);
    
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playPortal() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    // Whoosh
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.2);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  playWin() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    // A Major Arpeggio: A4, C#5, E5, A5
    const notes = [440, 554.37, 659.25, 880]; 
    
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = t + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }

  playFail() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.5);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.start(t);
    osc.stop(t + 0.5);
  }
  
  playEnemyEffect() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Noise burst simulation using FM synthesis
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    modulator.frequency.value = 500; // Fast modulation
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    modGain.gain.value = 1000;

    carrier.connect(gain);
    gain.connect(this.masterGain);
    
    carrier.frequency.value = 200;
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + 0.2);
    modulator.stop(t + 0.2);
  }
}

export const audioManager = new AudioManager();