import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AudioAlertService } from './audio-alert.service';

export interface WaitingRoomNotification {
 consultationId: number;
 patientFirstName: string;
 patientInitials: string;
 joinTime: Date;
 language: string | null;
 message: string;
}

export interface DashboardState {
 isConnected: boolean;
 waitingPatientCount: number;
 hasNewNotifications: boolean;
 lastNotificationTime: Date | null;
}

@Injectable({
 providedIn: 'root'
})
export class DashboardWebSocketService {
 private socket: Socket | null = null;
 private practitionerId: number | null = null;

 // Audio management properties
 private audioEnabled = true;
 private lastNotificationTime = 0;
 private notificationCooldown = 2000; // 2 seconds between audio alerts

 // State management
 private dashboardStateSubject = new BehaviorSubject<DashboardState>({
  isConnected: false,
  waitingPatientCount: 0,
  hasNewNotifications: false,
  lastNotificationTime: null
 });

 private patientJoinedSubject = new Subject<WaitingRoomNotification>();
 private patientLeftSubject = new Subject<any>();
 private waitingRoomUpdateSubject = new Subject<any>();

 constructor(private audioAlertService: AudioAlertService) {
  this.loadAudioSettings();
  this.initializeAudioPermission();
 }

 // Public observables
 get dashboardState$(): Observable<DashboardState> {
  return this.dashboardStateSubject.asObservable();
 }

 get patientJoined$(): Observable<WaitingRoomNotification> {
  return this.patientJoinedSubject.asObservable();
 }

 get patientLeft$(): Observable<any> {
  return this.patientLeftSubject.asObservable();
 }

 get waitingRoomUpdate$(): Observable<any> {
  return this.waitingRoomUpdateSubject.asObservable();
 }

 /**
  * Initialize dashboard WebSocket connection
  */
 async initializeDashboardConnection(practitionerId: number): Promise<void> {
  try {
   this.practitionerId = practitionerId;

   // Get WebSocket URL from API URL
   const wsBaseUrl = environment.apiUrl.replace('/api', '').replace('3000', '3001');

   // Connect to consultation namespace for dashboard events
   this.socket = io(`${wsBaseUrl}/consultation`, {
    transports: ['websocket'],
    query: {
     userId: practitionerId,
     role: 'PRACTITIONER',
     joinType: 'dashboard'
    }
   });

   this.setupEventListeners();

   // Join practitioner room for targeted notifications
   this.socket.emit('join_practitioner_room', { practitionerId });

   console.log(`[DashboardWebSocketService] Dashboard connection initialized for practitioner ${practitionerId}`);
  } catch (error) {
   console.error(`[DashboardWebSocketService] Failed to initialize dashboard connection:`, error);
   throw error;
  }
 }

 /**
  * Setup WebSocket event listeners
  */
 private setupEventListeners(): void {
  if (!this.socket) return;

  // Patient waiting events
  this.socket.on('patient_waiting', (data: any) => {
   console.log(`[DashboardWebSocketService] Patient waiting:`, data);

   const notification: WaitingRoomNotification = {
    consultationId: data.consultationId || 0,
    patientFirstName: data.patientFirstName || 'Patient',
    patientInitials: this.generateInitials(data.patientFirstName),
    joinTime: new Date(data.joinTime || Date.now()),
    language: data.language,
    message: data.message || 'Patient is waiting in consultation room'
   };

   this.updateDashboardState({
    hasNewNotifications: true,
    waitingPatientCount: this.dashboardStateSubject.value.waitingPatientCount + 1,
    lastNotificationTime: new Date()
   });

   this.patientJoinedSubject.next(notification);

   // Trigger audio alert for patient waiting
   this.handlePatientJoinedAlert(notification);
  });

  // Enhanced patient joined waiting room event
  this.socket.on('patient_joined_waiting_room', (data: any) => {
   console.log(`[DashboardWebSocketService] Patient joined waiting room:`, data);

   const notification: WaitingRoomNotification = {
    consultationId: data.consultationId || 0,
    patientFirstName: data.patient?.name?.split(' ')[0] || 'Patient',
    patientInitials: this.generateInitials(data.patient?.name),
    joinTime: new Date(data.patient?.joinedAt || Date.now()),
    language: data.patient?.language,
    message: data.message || 'Patient has joined the waiting room'
   };

   this.updateDashboardState({
    hasNewNotifications: true,
    waitingPatientCount: this.dashboardStateSubject.value.waitingPatientCount + 1,
    lastNotificationTime: new Date()
   });

   this.patientJoinedSubject.next(notification);

   // Trigger audio alert for patient joined waiting room
   this.handlePatientJoinedAlert(notification);
  });

  // Patient left events
  this.socket.on('patient_left_waiting_room', (data: any) => {
   console.log(`[DashboardWebSocketService] Patient left waiting room:`, data);

   this.updateDashboardState({
    waitingPatientCount: Math.max(0, this.dashboardStateSubject.value.waitingPatientCount - 1)
   });

   this.patientLeftSubject.next(data);
  });

  // Waiting room updates
  this.socket.on('waiting_room_update', (data: any) => {
   console.log(`[DashboardWebSocketService] Waiting room update:`, data);

   this.updateDashboardState({
    waitingPatientCount: data.waitingCount || 0
   });

   this.waitingRoomUpdateSubject.next(data);
  });

  // Connection events
  this.socket.on('connect', () => {
   console.log(`[DashboardWebSocketService] Dashboard WebSocket connected`);
   this.updateDashboardState({ isConnected: true });
  });

  this.socket.on('disconnect', () => {
   console.log(`[DashboardWebSocketService] Dashboard WebSocket disconnected`);
   this.updateDashboardState({ isConnected: false });
  });

  this.socket.on('reconnect', () => {
   console.log(`[DashboardWebSocketService] Dashboard WebSocket reconnected`);
   if (this.practitionerId) {
    this.socket?.emit('join_practitioner_room', { practitionerId: this.practitionerId });
   }
  });
 }

 /**
  * Mark notifications as read
  */
 markNotificationsAsRead(): void {
  this.updateDashboardState({
   hasNewNotifications: false
  });
 }

 /**
  * Get current waiting patient count
  */
 getWaitingPatientCount(): number {
  return this.dashboardStateSubject.value.waitingPatientCount;
 }

 /**
  * Check if connected
  */
 isConnected(): boolean {
  return this.dashboardStateSubject.value.isConnected;
 }

 /**
  * Disconnect dashboard WebSocket
  */
 disconnect(): void {
  if (this.socket) {
   this.socket.disconnect();
   this.socket = null;
  }

  this.updateDashboardState({
   isConnected: false,
   waitingPatientCount: 0,
   hasNewNotifications: false,
   lastNotificationTime: null
  });

  console.log(`[DashboardWebSocketService] Dashboard WebSocket disconnected`);
 }

 /**
  * Update dashboard state
  */
 private updateDashboardState(updates: Partial<DashboardState>): void {
  const currentState = this.dashboardStateSubject.value;
  this.dashboardStateSubject.next({
   ...currentState,
   ...updates
  });
 }

 /**
  * Generate initials from patient name
  */
 private generateInitials(name?: string): string {
  if (!name) return 'P';

  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
   return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0][0]?.toUpperCase() || 'P';
 }

 /**
  * Handle audio alert when patient joins
  */
 private async handlePatientJoinedAlert(notification: WaitingRoomNotification): Promise<void> {
  if (!this.isAudioEnabled()) {
   return;
  }

  try {
   // Check cooldown to prevent spam
   const now = Date.now();
   if (now - this.lastNotificationTime < this.notificationCooldown) {
    console.log('[DashboardWebSocketService] Audio alert skipped due to cooldown');
    return;
   }

   this.lastNotificationTime = now;

   // Determine alert type based on waiting room state
   const waitingCount = this.dashboardStateSubject.value.waitingPatientCount;

   if (waitingCount > 3) {
    await this.audioAlertService.playUrgentAlert();
    console.log(`[DashboardWebSocketService] Urgent alert played for ${waitingCount} waiting patients`);
   } else if (waitingCount > 1) {
    await this.audioAlertService.playMultiplePatientAlert(waitingCount);
    console.log(`[DashboardWebSocketService] Multiple patient alert played for ${waitingCount} patients`);
   } else {
    await this.audioAlertService.playPatientJoinedAlert();
    console.log(`[DashboardWebSocketService] Patient joined alert played for ${notification.patientFirstName}`);
   }

  } catch (error) {
   console.error('[DashboardWebSocketService] Failed to play audio alert:', error);
  }
 }

 /**
  * Initialize audio permission on user interaction
  */
 private async initializeAudioPermission(): Promise<void> {
  try {
   // Request audio permission when service initializes
   const hasPermission = await this.audioAlertService.requestAudioPermission();
   if (hasPermission) {
    console.log('[DashboardWebSocketService] Audio alerts initialized successfully');
   } else {
    console.warn('[DashboardWebSocketService] Audio alerts not available - permission denied');
   }
  } catch (error) {
   console.error('[DashboardWebSocketService] Failed to initialize audio alerts:', error);
  }
 }

 /**
  * Load audio settings from localStorage
  */
 private loadAudioSettings(): void {
  try {
   const savedSettings = localStorage.getItem('dashboard_audio_settings');
   if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    this.audioEnabled = settings.enabled !== false; // Default to true
    this.notificationCooldown = settings.cooldown || 2000;

    // Update audio service configuration
    this.audioAlertService.updateConfig({
     enabled: this.audioEnabled,
     volume: settings.volume || 0.7
    });

    console.log('[DashboardWebSocketService] Audio settings loaded:', settings);
   }
  } catch (error) {
   console.error('[DashboardWebSocketService] Failed to load audio settings:', error);
  }
 }

 /**
  * Save audio settings to localStorage
  */
 private saveAudioSettings(): void {
  try {
   const settings = {
    enabled: this.audioEnabled,
    cooldown: this.notificationCooldown,
    volume: this.audioAlertService.getConfig().volume
   };

   localStorage.setItem('dashboard_audio_settings', JSON.stringify(settings));
   console.log('[DashboardWebSocketService] Audio settings saved:', settings);
  } catch (error) {
   console.error('[DashboardWebSocketService] Failed to save audio settings:', error);
  }
 }

 // ============================================================================
 // PUBLIC AUDIO CONTROL METHODS
 // ============================================================================

 /**
  * Enable/disable audio alerts
  */
 setAudioEnabled(enabled: boolean): void {
  this.audioEnabled = enabled;
  this.audioAlertService.setEnabled(enabled);
  this.saveAudioSettings();
  console.log(`[DashboardWebSocketService] Audio alerts ${enabled ? 'enabled' : 'disabled'}`);
 }

 /**
  * Check if audio alerts are enabled
  */
 isAudioEnabled(): boolean {
  return this.audioEnabled;
 }

 /**
  * Set audio volume (0.0 to 1.0)
  */
 setAudioVolume(volume: number): void {
  this.audioAlertService.setVolume(volume);
  this.saveAudioSettings();
  console.log(`[DashboardWebSocketService] Audio volume set to ${volume}`);
 }

 /**
  * Test audio functionality
  */
 async testAudio(): Promise<boolean> {
  try {
   return await this.audioAlertService.testAudio();
  } catch (error) {
   console.error('[DashboardWebSocketService] Audio test failed:', error);
   return false;
  }
 }

 /**
  * Play manual audio alert for testing
  */
 async playTestAlert(): Promise<void> {
  if (!this.isAudioEnabled()) {
   console.warn('[DashboardWebSocketService] Audio alerts are disabled');
   return;
  }

  try {
   await this.audioAlertService.playPatientJoinedAlert();
   console.log('[DashboardWebSocketService] Test alert played successfully');
  } catch (error) {
   console.error('[DashboardWebSocketService] Test alert failed:', error);
  }
 }

 /**
  * Get current audio configuration
  */
 getAudioConfig() {
  return {
   enabled: this.audioEnabled,
   cooldown: this.notificationCooldown,
   volume: this.audioAlertService.getConfig().volume
  };
 }

