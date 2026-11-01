export class SynthAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private level = .07;
  muted = true;

  unlock(): void {
    if (typeof AudioContext === "undefined") return;
    if (this.context === null) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") void this.context.resume();
    this.muted = false;
    this.applyMute();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMute();
  }

  setVolume(value: number): void {
    this.level = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    this.applyMute();
  }

  private applyMute(): void {
    if (this.master !== null) this.master.gain.value = this.muted ? 0 : this.level;
  }

  private tone(frequency: number, durationMs: number): void {
    if (this.context === null || this.master === null || this.muted) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + durationMs / 1000);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start();
    oscillator.stop(this.context.currentTime + durationMs / 1000);
  }

  move(): void {
    this.tone(280, 40);
  }

  capture(): void {
    this.tone(360, 55);
  }

  finish(): void {
    this.tone(520, 180);
  }

  dispose(): void {
    if (this.context !== null) void this.context.close();
    this.context = null;
    this.master = null;
  }
}
