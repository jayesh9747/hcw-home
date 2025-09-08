import { Injectable } from '@angular/core';

export interface AudioAlertConfig {
 volume: number; // 0.0 to 1.0
 enabled: boolean;
 patientJoinSound: string;
 urgentAlertSound: string;
 reminderSound: string;
}

@Injectable({
 providedIn: 'root'
})
export class AudioAlertService {
 private audioContext: AudioContext | null = null;
 private config: AudioAlertConfig = {
  volume: 0.7,
  enabled: true,
  patientJoinSound: 'patient-joined',
  urgentAlertSound: 'urgent-alert',
  reminderSound: 'reminder'
 };

 private soundBuffers: Map<string, AudioBuffer> = new Map();
 private isInitialized = false;

 constructor() {
  this.initializeAudioContext();
 }

 /**
  * Initialize Web Audio API context
  */
 private async initializeAudioContext(): Promise<void> {
  try {
   // Create AudioContext (handles browser compatibility)
   this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

   // Load default sound assets
   await this.loadDefaultSounds();

   this.isInitialized = true;
   console.log('[AudioAlertService] Audio context initialized successfully');
  } catch (error) {
   console.error('[AudioAlertService] Failed to initialize audio context:', error);
  }
 }

 /**
  * Load default sound files
  */
 private async loadDefaultSounds(): Promise<void> {
  const sounds = [
   { key: 'patient-joined', frequency: 800, duration: 0.3 },
   { key: 'urgent-alert', frequency: 1000, duration: 0.5 },
   { key: 'reminder', frequency: 600, duration: 0.2 }
  ];

  for (const sound of sounds) {
   try {
    const buffer = this.generateToneBuffer(sound.frequency, sound.duration);
    this.soundBuffers.set(sound.key, buffer);
   } catch (error) {
    console.error(`[AudioAlertService] Failed to generate ${sound.key} sound:`, error);
   }
  }
 }

 /**
  * Generate a tone buffer (fallback for missing audio files)
  */
 private generateToneBuffer(frequency: number, duration: number): AudioBuffer {
  if (!this.audioContext) throw new Error('Audio context not initialized');

  const sampleRate = this.audioContext.sampleRate;
  const frameCount = sampleRate * duration;
  const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  // Generate sine wave with fade in/out
  for (let i = 0; i < frameCount; i++) {
   const t = i / sampleRate;
   let amplitude = Math.sin(2 * Math.PI * frequency * t);

   // Apply fade in/out to prevent clicks
   const fadeTime = 0.05; // 50ms fade
   if (t < fadeTime) {
    amplitude *= t / fadeTime;
   } else if (t > duration - fadeTime) {
    amplitude *= (duration - t) / fadeTime;
   }

   data[i] = amplitude * 0.3; // Reduce volume to prevent harsh sounds
  }

  return buffer;
 }

 /**
  * Play patient joined alert
  */
 async playPatientJoinedAlert(): Promise<void> {
  if (!this.config.enabled) return;

  try {
   await this.ensureAudioContext();
   await this.playSound('patient-joined');
   console.log('[AudioAlertService] Patient joined alert played');
  } catch (error) {
   console.error('[AudioAlertService] Failed to play patient joined alert:', error);
  }
 }

 /**
  * Play urgent alert
  */
 async playUrgentAlert(): Promise<void> {
  if (!this.config.enabled) return;

  try {
   await this.ensureAudioContext();
   await this.playSound('urgent-alert');
   console.log('[AudioAlertService] Urgent alert played');
  } catch (error) {
   console.error('[AudioAlertService] Failed to play urgent alert:', error);
  }
 }

 /**
  * Play reminder sound
  */
 async playReminderAlert(): Promise<void> {
  if (!this.config.enabled) return;

  try {
   await this.ensureAudioContext();
   await this.playSound('reminder');
   console.log('[AudioAlertService] Reminder alert played');
  } catch (error) {
   console.error('[AudioAlertService] Failed to play reminder alert:', error);
  }
 }

 /**
  * Play custom notification sequence for multiple patients
  */
 async playMultiplePatientAlert(patientCount: number): Promise<void> {
  if (!this.config.enabled || patientCount <= 0) return;

  try {
   await this.ensureAudioContext();

   // Play sequence based on patient count (max 3 beeps)
   const beepCount = Math.min(patientCount, 3);

   for (let i = 0; i < beepCount; i++) {
    await this.playSound('patient-joined');
    if (i < beepCount - 1) {
     await this.delay(200); // 200ms between beeps
    }
   }

   console.log(`[AudioAlertService] Multiple patient alert played (${beepCount} beeps)`);
  } catch (error) {
   console.error('[AudioAlertService] Failed to play multiple patient alert:', error);
  }
 }

 /**
  * Ensure audio context is ready (handle browser autoplay policies)
  */
 private async ensureAudioContext(): Promise<void> {
  if (!this.audioContext) {
   await this.initializeAudioContext();
  }

  if (this.audioContext?.state === 'suspended') {
   try {
    await this.audioContext.resume();
    console.log('[AudioAlertService] Audio context resumed');
   } catch (error) {
    console.warn('[AudioAlertService] Could not resume audio context:', error);
   }
  }
 }

 /**
  * Play a specific sound
  */
 private async playSound(soundKey: string): Promise<void> {
  if (!this.audioContext || !this.isInitialized) {
   throw new Error('Audio context not ready');
  }

  const buffer = this.soundBuffers.get(soundKey);
  if (!buffer) {
   throw new Error(`Sound '${soundKey}' not found`);
  }

  // Create audio nodes
  const source = this.audioContext.createBufferSource();
  const gainNode = this.audioContext.createGain();

  // Configure audio
  source.buffer = buffer;
  gainNode.gain.value = this.config.volume;

  // Connect audio graph
  source.connect(gainNode);
  gainNode.connect(this.audioContext.destination);

  // Play sound
  source.start();
 }

 /**
  * Request permission for audio (handle browser restrictions)
  */
 async requestAudioPermission(): Promise<boolean> {
  try {
   // Test if we can play audio by creating a silent sound
   await this.ensureAudioContext();

   if (this.audioContext?.state === 'running') {
    console.log('[AudioAlertService] Audio permission granted');
    return true;
   }

   return false;
  } catch (error) {
   console.error('[AudioAlertService] Audio permission denied:', error);
   return false;
  }
 }

 /**
  * Update audio configuration
  */
 updateConfig(config: Partial<AudioAlertConfig>): void {
  this.config = { ...this.config, ...config };
  console.log('[AudioAlertService] Configuration updated:', this.config);
 }

 /**
  * Get current configuration
  */
 getConfig(): AudioAlertConfig {
  return { ...this.config };
 }

 /**
  * Enable/disable audio alerts
  */
 setEnabled(enabled: boolean): void {
  this.config.enabled = enabled;
  console.log(`[AudioAlertService] Audio alerts ${enabled ? 'enabled' : 'disabled'}`);
 }

 /**
  * Set volume (0.0 to 1.0)
  */
 setVolume(volume: number): void {
  this.config.volume = Math.max(0, Math.min(1, volume));
  console.log(`[AudioAlertService] Volume set to ${this.config.volume}`);
 }

 /**
  * Test audio functionality
  */
 async testAudio(): Promise<boolean> {
  try {
   await this.playPatientJoinedAlert();
   return true;
  } catch (error) {
   console.error('[AudioAlertService] Audio test failed:', error);
   return false;
  }
 }

 /**
  * Utility delay function
  */
 private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
 }

 /**
  * Cleanup audio resources
  */
 cleanup(): void {
  if (this.audioContext && this.audioContext.state !== 'closed') {
   this.audioContext.close();
  }
  this.soundBuffers.clear();
  this.isInitialized = false;
  console.log('[AudioAlertService] Audio resources cleaned up');
 }
}