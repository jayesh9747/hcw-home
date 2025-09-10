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
  ConsultationParticipant,
  WebSocketNotification,
  ConsultationEvent,
  TypingUser
} from '../services/practitioner-consultation-room.service';

import { PractitionerChatComponent, TypingIndicator } from '../components/practitioner-chat/practitioner-chat.component';

@Component({
  selector: 'app-practitioner-consultation-room',
  standalone: true,
  imports: [CommonModule, FormsModule, PractitionerChatComponent],
  templateUrl: './practitioner-consultation-room.component.html',
  styleUrls: ['./practitioner-consultation-room.component.scss']
})
export class PractitionerConsultationRoomComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('chatContainer', { static: false }) chatContainer!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  public practitionerId: number = 0; // This should come from auth service

  // Component state
  consultationState: PractitionerConsultationState | null = null;
  mediaSessionState: PractitionerMediaSessionState | null = null;
  chatMessages: import('../components/practitioner-chat/practitioner-chat.component').ChatMessage[] = [];
  participants: ConsultationParticipant[] = [];

  // Enhanced notification system
  notifications: WebSocketNotification[] = [];
  events: ConsultationEvent[] = [];
  connectionStatus = { consultation: false, chat: false, media: false };

  isLoading = true;
  error: string | null = null;
  newMessage = '';
  showWaitingRoomAlert = false;
  consultationDuration = '';

  // UI state for notifications
  showNotifications = false;
  showEvents = false;


  // Enhanced chat properties
  typingUsers: TypingUser[] = [];
  get typingIndicators(): TypingIndicator[] {
    return this.typingUsers.map(user => ({
      userId: user.userId,
      userName: user.userName,
      typing: user.isTyping
    }));
  }
  unreadMessageCount = 0;
  showChat = false;
  consultationId = 0;

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

      this.consultationId = consultationId;

      console.log(`[PractitionerConsultationRoomComponent] Initializing consultation room: ${consultationId}`);

      // Setup service subscriptions first
      this.setupServiceSubscriptions();



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
        this.chatMessages = messages.filter(msg => msg.userId !== undefined) as import('../components/practitioner-chat/practitioner-chat.component').ChatMessage[];
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

    // Enhanced notification subscriptions
    this.consultationRoomService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });

    this.consultationRoomService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(events => {
        this.events = events;
      });

    this.consultationRoomService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
      });

    // Enhanced chat subscriptions
    this.consultationRoomService.typingUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(typingUsers => {
        this.typingUsers = typingUsers;
      });

    this.consultationRoomService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadMessageCount = count;
      });

    this.consultationRoomService.showChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe(showChat => {
        this.showChat = showChat;
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
   * Send chat message (for chat component integration)
   */
  async sendChatMessage(content: string): Promise<void> {
    try {
      await this.consultationRoomService.sendMessage(content, this.practitionerId);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomComponent] Failed to send chat message:`, error);
    }
  }

  /**
   * Send file message
   */
  async sendFileMessage(file: File): Promise<void> {
    try {
      await this.consultationRoomService.sendFileMessage(file, this.practitionerId);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomComponent] Failed to send file:`, error);
    }
  }

  /**
   * Start typing indicator
   */
  startTypingIndicator(): void {
    this.consultationRoomService.startTypingIndicator(this.practitionerId, 'Practitioner');
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(): void {
    this.consultationRoomService.stopTypingIndicator(this.practitionerId, 'Practitioner');
  }

  /**
   * Mark all messages as read
   */
  markAllMessagesAsRead(): void {
    this.consultationRoomService.markAllMessagesAsRead(this.practitionerId);
  }

  /**
   * Close chat
   */
  closeChat(): void {
    this.consultationRoomService.toggleChatVisibility();
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
   * Add participant (expert or guest) to consultation
   */
  async addParticipant(participantData: {
    role: 'EXPERT' | 'GUEST';
    email: string;
    firstName: string;
    lastName: string;
    notes?: string;
  }): Promise<void> {
    if (!this.consultationState?.consultationId) {
      this.error = 'No active consultation';
      return;
    }

    try {
      await this.consultationRoomService.addParticipant(
        this.consultationState.consultationId,
        participantData
      );
      console.log(`[PractitionerConsultationRoomComponent] Participant added successfully`);
      // Real-time update will come through WebSocket
    } catch (error) {
      console.error(`[PractitionerConsultationRoomComponent] Failed to add participant:`, error);
      this.error = 'Failed to add participant';
    }
  }

  /**
   * Remove participant from consultation
   */
  async removeParticipant(participantId: number): Promise<void> {
    if (!this.consultationState?.consultationId) {
      this.error = 'No active consultation';
      return;
    }

    try {
      await this.consultationRoomService.removeParticipant(
        this.consultationState.consultationId,
        participantId
      );
      console.log(`[PractitionerConsultationRoomComponent] Participant removed successfully`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomComponent] Failed to remove participant:`, error);
      this.error = 'Failed to remove participant';
    }
  }

  /**
   * Admit patient from waiting room using the new service method
   */
  async admitPatientFromWaitingRoom(patientId?: number): Promise<void> {
    if (!this.consultationState?.consultationId) {
      this.error = 'No active consultation';
      return;
    }

    try {
      await this.consultationRoomService.admitPatientFromWaitingRoom(
        this.consultationState.consultationId,
        patientId
      );
      this.showWaitingRoomAlert = false;
      console.log(`[PractitionerConsultationRoomComponent] Patient admitted from waiting room`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomComponent] Failed to admit patient from waiting room:`, error);
      this.error = 'Failed to admit patient';
    }
  }

  // UI State Management for Participant Management

  showAddParticipantModal = false;
  newParticipant = {
    role: 'EXPERT' as 'EXPERT' | 'GUEST',
    email: '',
    firstName: '',
    lastName: '',
    notes: ''
  };

  /**
   * Open add participant modal
   */
  openAddParticipantModal(): void {
    this.showAddParticipantModal = true;
    this.resetParticipantForm();
  }

  /**
   * Close add participant modal
   */
  closeAddParticipantModal(): void {
    this.showAddParticipantModal = false;
    this.resetParticipantForm();
  }

  /**
   * Reset participant form
   */
  private resetParticipantForm(): void {
    this.newParticipant = {
      role: 'EXPERT',
      email: '',
      firstName: '',
      lastName: '',
      notes: ''
    };
  }

  /**
   * Submit add participant form
   */
  async submitAddParticipant(): Promise<void> {
    if (!this.newParticipant.email || !this.newParticipant.firstName || !this.newParticipant.lastName) {
      this.error = 'Please fill in all required fields';
      return;
    }

    await this.addParticipant({ ...this.newParticipant });
    this.closeAddParticipantModal();
  }


  /**
   * Toggle notifications panel
   */
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showEvents = false;
    }
  }

  /**
   * Toggle events panel
   */
  toggleEvents(): void {
    this.showEvents = !this.showEvents;
    if (this.showEvents) {
      this.showNotifications = false;
    }
  }

  /**
   * Clear notification
   */
  clearNotification(id: string): void {
    this.consultationRoomService.clearNotification(id);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.consultationRoomService.clearAllNotifications();
  }

  /**
   * Handle notification action
   */
  handleNotificationAction(action: string, data?: any): void {
    this.consultationRoomService.handleNotificationAction(action, data);

    switch (action) {
      case 'navigate_dashboard':
        this.router.navigate(['/dashboard']);
        break;
      case 'show_waiting_room':
        this.showWaitingRoomAlert = true;
        break;
      case 'open_chat':
        const chatContainer = document.querySelector('.chat-panel');
        if (chatContainer) {
          chatContainer.scrollIntoView({ behavior: 'smooth' });
        }
        break;
    }
  }

  /**
   * Get unread notification count
   */
  getUnreadNotificationCount(): number {
    return this.notifications.filter(n => n.type === 'error' || n.type === 'warning').length;
  }

  /**
   * Get notification icon
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }

  /**
   * Get event severity icon
   */
  getEventSeverityIcon(severity: string): string {
    switch (severity) {
      case 'success': return '🟢';
      case 'info': return '🔵';
      case 'warning': return '🟡';
      case 'error': return '🔴';
      default: return '🔵';
    }
  }

  /**
   * Format notification/event timestamp
   */
  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    return timestamp.toLocaleDateString();
  }

  /**
   * Get connection status display
   */
  getConnectionStatusDisplay(): { icon: string; text: string; color: string } {
    const allConnected = this.connectionStatus.consultation && this.connectionStatus.chat && this.connectionStatus.media;
    const someConnected = this.connectionStatus.consultation || this.connectionStatus.chat || this.connectionStatus.media;

    if (allConnected) {
      return { icon: '🟢', text: 'All Services Connected', color: 'success' };
    } else if (someConnected) {
      return { icon: '🟡', text: 'Partial Connection', color: 'warning' };
    } else {
      return { icon: '🔴', text: 'Disconnected', color: 'danger' };
    }
  }

  /**
   * Track notifications for ngFor performance
   */
  trackNotification(index: number, notification: WebSocketNotification): string {
    return notification.id;
  }

  /**
   * Track events for ngFor performance
   */
  trackEvent(index: number, event: ConsultationEvent): string {
    return event.id;
  }

  // Utility Methods

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
