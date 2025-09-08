import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';
import {
 PractitionerConsultationRoomService,
 PractitionerConsultationState,
 PractitionerMediaSessionState,
 ChatMessage,
 ConsultationParticipant
} from '../services/consultation-room.service';

@Component({
  selector: 'app-consultation-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consultation-room.component.html',
  styleUrl: './consultation-room.component.scss'
})
export class ConsultationRoomComponent implements OnInit, OnDestroy {
 @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
 @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef<HTMLDivElement>;

 private destroy$ = new Subject<void>();
 private practitionerId: number = 0; // This should come from auth service

 // Component state
 consultationState: PractitionerConsultationState | null = null;
 mediaSessionState: PractitionerMediaSessionState | null = null;
 chatMessages: ChatMessage[] = [];
 participants: ConsultationParticipant[] = [];

 isLoading = true;
 error: string | null = null;
 newMessage = '';
 showWaitingRoomAlert = false;
 consultationDuration = '';

 isVideoEnabled = false;
 isAudioEnabled = false;
 isScreenSharing = false;
 selectedCamera = '';
 selectedMicrophone = '';

 constructor(
  private route: ActivatedRoute,
  private router: Router,
  private consultationRoomService: PractitionerConsultationRoomService
 ) { }

 ngOnInit(): void {
  this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
   const consultationId = +params['id'];

   if (consultationId) {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
     this.practitionerId = +queryParams['practitionerId'] || 1; 
     this.initializeConsultationRoom(consultationId);
    });
   } else {
    this.error = 'Invalid consultation ID';
    this.isLoading = false;
   }
  });

  this.setupServiceSubscriptions();
  this.startConsultationTimer();
 }

 ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.consultationRoomService.leaveConsultation();
 }

 /**
  * Initialize consultation room
  */
 private async initializeConsultationRoom(consultationId: number): Promise<void> {
  try {
   this.isLoading = true;
   this.error = null;

   console.log(`[PractitionerConsultationRoomComponent] Initializing consultation room: ${consultationId}`);

   await this.consultationRoomService.initializePractitionerConsultationRoom(consultationId, this.practitionerId);

   this.isLoading = false;
   console.log(`[PractitionerConsultationRoomComponent] Consultation room initialized successfully`);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to initialize consultation room:`, error);
   this.error = 'Failed to initialize consultation room. Please try again.';
   this.isLoading = false;
  }
 }

 /**
  * Setup subscriptions to service observables
  */
 private setupServiceSubscriptions(): void {
  // Consultation state updates
  this.consultationRoomService.consultationState$
   .pipe(takeUntil(this.destroy$))
   .subscribe(state => {
    console.log(`[PractitionerConsultationRoomComponent] Consultation state update:`, state);
    this.consultationState = state;

    // Show waiting room alert
    if (state.waitingRoomStatus.hasWaitingPatients) {
     this.showWaitingRoomAlert = true;
    }
   });

  // Media session state updates
  this.consultationRoomService.mediaSessionState$
   .pipe(takeUntil(this.destroy$))
   .subscribe(state => {
    console.log(`[PractitionerConsultationRoomComponent] Media session state update:`, state);
    this.mediaSessionState = state;
   });

  // Chat messages updates
  this.consultationRoomService.chatMessages$
   .pipe(takeUntil(this.destroy$))
   .subscribe(messages => {
    console.log(`[PractitionerConsultationRoomComponent] Chat messages update:`, messages);
    this.chatMessages = messages;
    this.scrollChatToBottom();
   });

  // Participants updates
  this.consultationRoomService.participants$
   .pipe(takeUntil(this.destroy$))
   .subscribe(participants => {
    console.log(`[PractitionerConsultationRoomComponent] Participants update:`, participants);
    this.participants = participants;
   });

  // Patient joined waiting room
  this.consultationRoomService.patientJoined$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Patient joined waiting room:`, data);
    this.showWaitingRoomAlert = true;
   });

  // Patient admitted to consultation
  this.consultationRoomService.patientAdmitted$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Patient admitted:`, data);
    this.showWaitingRoomAlert = false;
   });

  // Patient left consultation
  this.consultationRoomService.patientLeft$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Patient left:`, data);
    // Handle patient leaving
   });

  // Media session ready
  this.consultationRoomService.mediaSessionReady$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Media session ready:`, data);
    this.initializeMedia();
   });

  // Consultation ended
  this.consultationRoomService.consultationEnded$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Consultation ended:`, data);
    this.handleConsultationEnded();
   });

  // Waiting room updates
  this.consultationRoomService.waitingRoomUpdate$
   .pipe(takeUntil(this.destroy$))
   .subscribe(data => {
    console.log(`[PractitionerConsultationRoomComponent] Waiting room update:`, data);
    if (data.waitingCount > 0) {
     this.showWaitingRoomAlert = true;
    }
   });
 }

 /**
  * Initialize media (camera/microphone)
  */
 private async initializeMedia(): Promise<void> {
  try {
   // Request media permissions
   const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
   });

   if (this.videoElement?.nativeElement) {
    this.videoElement.nativeElement.srcObject = stream;
   }

   this.isVideoEnabled = true;
   this.isAudioEnabled = true;

   console.log(`[PractitionerConsultationRoomComponent] Media initialized successfully`);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to initialize media:`, error);
  }
 }

 /**
  * Start consultation timer
  */
 private startConsultationTimer(): void {
  interval(1000)
   .pipe(takeUntil(this.destroy$))
   .subscribe(() => {
    if (this.consultationState?.consultationStartTime) {
     const startTime = new Date(this.consultationState.consultationStartTime);
     const now = new Date();
     const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

     const hours = Math.floor(duration / 3600);
     const minutes = Math.floor((duration % 3600) / 60);
     const seconds = duration % 60;

     this.consultationDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
   });
 }

 /**
  * Scroll chat to bottom
  */
 private scrollChatToBottom(): void {
  setTimeout(() => {
   if (this.chatContainer?.nativeElement) {
    this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
   }
  }, 100);
 }

 /**
  * Handle consultation ended
  */
 private handleConsultationEnded(): void {
  // Show confirmation dialog or navigate away
  setTimeout(() => {
   this.router.navigate(['/dashboard']);
  }, 3000);
 }

 // Public methods for template

 /**
  * Admit patient from waiting room
  */
 async admitPatient(): Promise<void> {
  if (!this.consultationState?.consultationId) return;

  try {
   await this.consultationRoomService.admitPatient(this.consultationState.consultationId);
   this.showWaitingRoomAlert = false;
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to admit patient:`, error);
   this.error = 'Failed to admit patient';
  }
 }

 /**
  * Send chat message
  */
 async sendMessage(): Promise<void> {
  if (!this.newMessage.trim()) return;

  try {
   await this.consultationRoomService.sendMessage(this.newMessage, this.practitionerId);
   this.newMessage = '';
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to send message:`, error);
   this.error = 'Failed to send message';
  }
 }

 /**
  * Toggle video
  */
 async toggleVideo(): Promise<void> {
  try {
   this.isVideoEnabled = !this.isVideoEnabled;
   await this.consultationRoomService.toggleMedia('video', this.isVideoEnabled);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to toggle video:`, error);
   this.isVideoEnabled = !this.isVideoEnabled; // Revert on error
  }
 }

 /**
  * Toggle audio
  */
 async toggleAudio(): Promise<void> {
  try {
   this.isAudioEnabled = !this.isAudioEnabled;
   await this.consultationRoomService.toggleMedia('audio', this.isAudioEnabled);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to toggle audio:`, error);
   this.isAudioEnabled = !this.isAudioEnabled; // Revert on error
  }
 }

 /**
  * Start screen sharing
  */
 async startScreenShare(): Promise<void> {
  try {
   await this.consultationRoomService.startScreenShare();
   this.isScreenSharing = true;
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to start screen sharing:`, error);
   this.error = 'Failed to start screen sharing';
  }
 }

 /**
  * End consultation
  */
 async endConsultation(): Promise<void> {
  if (!this.consultationState?.consultationId) return;

  const confirmed = confirm('Are you sure you want to end this consultation?');
  if (!confirmed) return;

  try {
   await this.consultationRoomService.endConsultation(
    this.consultationState.consultationId,
    'Completed by practitioner'
   );

   this.router.navigate(['/dashboard']);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to end consultation:`, error);
   this.error = 'Failed to end consultation';
  }
 }

 /**
  * Leave consultation
  */
 async leaveConsultation(): Promise<void> {
  try {
   await this.consultationRoomService.leaveConsultation();
   this.router.navigate(['/dashboard']);
  } catch (error) {
   console.error(`[PractitionerConsultationRoomComponent] Failed to leave consultation:`, error);
   this.router.navigate(['/dashboard']); // Navigate anyway
  }
 }

 /**
  * Dismiss waiting room alert
  */
 dismissWaitingRoomAlert(): void {
  this.showWaitingRoomAlert = false;
 }

 /**
  * Format message timestamp
  */
 formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 }

 /**
  * Get participant display name
  */
 getParticipantName(participant: ConsultationParticipant): string {
  return `${participant.firstName} ${participant.lastName}`.trim() || 'Unknown';
 }

 /**
  * Get connection quality icon
  */
 getConnectionQualityIcon(): string {
  switch (this.mediaSessionState?.connectionQuality) {
   case 'good': return '🟢';
   case 'fair': return '🟡';
   case 'poor': return '🔴';
   default: return '⚫';
  }
 }

 /**
  * Get session status display text
  */
 getSessionStatusText(): string {
  switch (this.consultationState?.sessionStatus) {
   case 'connecting': return 'Connecting...';
   case 'waiting': return 'Waiting for patient';
   case 'active': return 'Active consultation';
   case 'ended': return 'Consultation ended';
   case 'error': return 'Connection error';
   default: return 'Unknown status';
  }
 }

 /**
  * Check if consultation is active
  */
 isConsultationActive(): boolean {
  return this.consultationState?.sessionStatus === 'active' && this.consultationState?.patientPresent;
 }

 /**
  * Check if media controls should be enabled
  */
 areMediaControlsEnabled(): boolean {
  return (this.mediaSessionState?.canJoinMedia || false) && this.isConsultationActive();
 }
}