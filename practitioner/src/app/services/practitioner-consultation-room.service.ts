import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface PractitionerConsultationState {
  consultationId: number;
  isConnected: boolean;
  patientPresent: boolean;
  patientName: string;
  patientLanguage: string | null;
  sessionStatus: 'connecting' | 'waiting' | 'active' | 'ended' | 'error';
  participantCount: number;
  consultationStartTime: Date | null;
  mediaStatus: {
    videoEnabled: boolean;
    audioEnabled: boolean;
    screenShareEnabled: boolean;
  };
  waitingRoomStatus: {
    hasWaitingPatients: boolean;
    waitingCount: number;
  };
}

export interface PractitionerMediaSessionState {
  routerId: string;
  rtpCapabilities: any;
  canJoinMedia: boolean;
  mediaInitialized: boolean;
  connectionQuality: 'good' | 'fair' | 'poor' | 'disconnected';
  devices: {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };
}

export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  userName?: string;
  isFromPractitioner?: boolean;
  readBy?: { userId: number; readAt: string }[];
}

export interface TypingUser {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface ConsultationParticipant {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  inWaitingRoom?: boolean;
  joinedAt?: string;
  mediaStatus?: {
    videoEnabled: boolean;
    audioEnabled: boolean;
  };
}

export interface PatientAdmissionRequest {
  consultationId: number;
  patientId?: number;
}

export interface ConsultationEndRequest {
  consultationId: number;
  reason?: string;
  notes?: string;
}

export interface WebSocketNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number | null; // in milliseconds, null for permanent
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  data?: any;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ConsultationEvent {
  id: string;
  type: 'participant_joined' | 'participant_left' | 'message_received' | 'media_status_changed' | 'waiting_room_update' | 'consultation_status_changed';
  title: string;
  description: string;
  timestamp: Date;
  data?: any;
  severity: 'info' | 'success' | 'warning' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class PractitionerConsultationRoomService {
  private consultationSocket: Socket | null = null;
  private mediasoupSocket: Socket | null = null;
  private chatSocket: Socket | null = null;

  // State management with BehaviorSubjects
  private consultationStateSubject = new BehaviorSubject<PractitionerConsultationState>({
    consultationId: 0,
    isConnected: false,
    patientPresent: false,
    patientName: '',
    patientLanguage: null,
    sessionStatus: 'connecting',
    participantCount: 0,
    consultationStartTime: null,
    mediaStatus: {
      videoEnabled: false,
      audioEnabled: false,
      screenShareEnabled: false
    },
    waitingRoomStatus: {
      hasWaitingPatients: false,
      waitingCount: 0
    }
  });

  private mediaSessionStateSubject = new BehaviorSubject<PractitionerMediaSessionState>({
    routerId: '',
    rtpCapabilities: null,
    canJoinMedia: false,
    mediaInitialized: false,
    connectionQuality: 'disconnected',
    devices: {
      cameras: [],
      microphones: [],
      speakers: []
    }
  });

  private chatMessagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private participantsSubject = new BehaviorSubject<ConsultationParticipant[]>([]);

  // Enhanced chat features
  private typingUsersSubject = new BehaviorSubject<TypingUser[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private showChatSubject = new BehaviorSubject<boolean>(false);

  // Event subjects for real-time notifications
  private patientJoinedSubject = new Subject<any>();
  private patientLeftSubject = new Subject<any>();
  private patientAdmittedSubject = new Subject<any>();

  // Enhanced notification system
  private notificationsSubject = new BehaviorSubject<WebSocketNotification[]>([]);
  private eventsSubject = new BehaviorSubject<ConsultationEvent[]>([]);
  private connectionStatusSubject = new BehaviorSubject<{
    consultation: boolean;
    chat: boolean;
    media: boolean;
  }>({ consultation: false, chat: false, media: false });
  private mediaSessionReadySubject = new Subject<any>();
  private connectionQualitySubject = new Subject<any>();
  private consultationEndedSubject = new Subject<any>();
  private waitingRoomUpdateSubject = new Subject<any>();

  constructor(private http: HttpClient) { }

  // Public observables for components to subscribe
  get consultationState$(): Observable<PractitionerConsultationState> {
    return this.consultationStateSubject.asObservable();
  }

  get mediaSessionState$(): Observable<PractitionerMediaSessionState> {
    return this.mediaSessionStateSubject.asObservable();
  }

  get chatMessages$(): Observable<ChatMessage[]> {
    return this.chatMessagesSubject.asObservable();
  }

  get participants$(): Observable<ConsultationParticipant[]> {
    return this.participantsSubject.asObservable();
  }

  // Enhanced chat observables
  get typingUsers$(): Observable<TypingUser[]> {
    return this.typingUsersSubject.asObservable();
  }

  get unreadCount$(): Observable<number> {
    return this.unreadCountSubject.asObservable();
  }

  get showChat$(): Observable<boolean> {
    return this.showChatSubject.asObservable();
  }

  get patientJoined$(): Observable<any> {
    return this.patientJoinedSubject.asObservable();
  }

  get patientLeft$(): Observable<any> {
    return this.patientLeftSubject.asObservable();
  }

  get patientAdmitted$(): Observable<any> {
    return this.patientAdmittedSubject.asObservable();
  }

  get mediaSessionReady$(): Observable<any> {
    return this.mediaSessionReadySubject.asObservable();
  }

  get connectionQuality$(): Observable<any> {
    return this.connectionQualitySubject.asObservable();
  }

  get consultationEnded$(): Observable<any> {
    return this.consultationEndedSubject.asObservable();
  }

  get waitingRoomUpdate$(): Observable<any> {
    return this.waitingRoomUpdateSubject.asObservable();
  }

  // Enhanced notification getters
  get notifications$(): Observable<WebSocketNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  get events$(): Observable<ConsultationEvent[]> {
    return this.eventsSubject.asObservable();
  }

  get connectionStatus$(): Observable<{ consultation: boolean; chat: boolean; media: boolean }> {
    return this.connectionStatusSubject.asObservable();
  }

  /**
   * Initialize practitioner consultation room with full backend integration
   */
  async initializePractitionerConsultationRoom(consultationId: number, practitionerId: number): Promise<void> {
    try {
      console.log(`[PractitionerConsultationRoomService] Initializing consultation room: ${consultationId}`);

      // Update consultation ID in state
      this.updateConsultationState({ consultationId });

      // Join consultation as practitioner via backend API
      const joinResponse = await this.joinConsultationAsPractitioner(consultationId, practitionerId);

      if (joinResponse && joinResponse.success) {
        await this.initializeWebSocketConnections(consultationId, practitionerId);

        this.loadInitialConsultationData(joinResponse);

        // Setup media devices
        await this.initializeMediaDevices();

        console.log(`[PractitionerConsultationRoomService] Consultation room initialized successfully`);
      } else {
        throw new Error('Failed to join consultation as practitioner');
      }
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to initialize consultation room:`, error);
      this.updateConsultationState({ sessionStatus: 'error' });
      throw error;
    }
  }

  /**
   * Join consultation as practitioner via backend API
   */
  private async joinConsultationAsPractitioner(consultationId: number, practitionerId: number): Promise<any> {
    try {
      const response = await this.http.post(`${environment.apiUrl}/consultation/${consultationId}/join/practitioner`, {
        userId: practitionerId
      }).toPromise();

      console.log(`[PractitionerConsultationRoomService] Join response:`, response);
      return response;
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to join consultation:`, error);
      throw error;
    }
  }

  /**
   * Initialize WebSocket connections for consultation, MediaSoup, and chat
   */
  private async initializeWebSocketConnections(consultationId: number, practitionerId: number): Promise<void> {
    try {
      const wsBaseUrl = environment.socketUrl || environment.baseUrl || 'http://localhost:3000';

      // Initialize consultation WebSocket
      this.consultationSocket = io(`${wsBaseUrl}/consultation`, {
        transports: ['websocket'],
        query: {
          userId: practitionerId,
          role: 'PRACTITIONER',
          consultationId: consultationId
        }
      });

      // Initialize MediaSoup WebSocket
      this.mediasoupSocket = io(`${wsBaseUrl}/mediasoup`, {
        transports: ['websocket'],
        query: {
          userId: practitionerId,
          role: 'PRACTITIONER',
          consultationId: consultationId
        }
      });

      // Initialize Chat WebSocket
      this.chatSocket = io(`${wsBaseUrl}/chat`, {
        transports: ['websocket'],
        query: {
          userId: practitionerId,
          userRole: 'PRACTITIONER',
          consultationId: consultationId,
          joinType: 'dashboard'
        }
      });

      // Setup event listeners
      this.setupConsultationEventListeners();
      this.setupMediaSoupEventListeners();
      this.setupChatEventListeners();

      // Join consultation room - using correct events that exist in backend
      this.consultationSocket.emit('join_media_session', {
        consultationId,
        userId: practitionerId,
        userRole: 'PRACTITIONER'
      });

      // The mediasoup events are handled through the consultation gateway
      // Chat is auto-joined when connecting to the chat namespace

      // Wait for successful connection responses
      this.consultationSocket.on('media_join_response', (response) => {
        console.log(`[PractitionerConsultationRoomService] Media join response:`, response);
        if (response.success) {
          this.updateConsultationState({ isConnected: true });
        } else {
          throw new Error(`Failed to join media session: ${response.error}`);
        }
      });
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to initialize WebSocket connections:`, error);
      throw error;
    }
  }

  /**
   * Add notification to the notification stream
   */
  private addNotification(notification: Partial<WebSocketNotification>): void {
    const fullNotification: WebSocketNotification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: notification.type || 'info',
      title: notification.title || 'System Notification',
      message: notification.message || '',
      timestamp: new Date(),
      duration: notification.duration || 5000,
      actions: notification.actions || []
    };

    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, fullNotification]);

    // Auto-remove notification after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(fullNotification.id);
      }, fullNotification.duration);
    }
  }

  /**
   * Remove notification by ID
   */
  private removeNotification(id: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(n => n.id !== id);
    this.notificationsSubject.next(updatedNotifications);
  }

  /**
   * Add consultation event to the events stream
   */
  private addEvent(event: Partial<ConsultationEvent>): void {
    const fullEvent: ConsultationEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type: event.type || 'consultation_status_changed',
      title: event.title || 'System Event',
      description: event.description || '',
      timestamp: new Date(),
      data: event.data || {},
      severity: event.severity || 'info'
    };

    const currentEvents = this.eventsSubject.value;
    // Keep only last 50 events to prevent memory issues
    const updatedEvents = [fullEvent, ...currentEvents].slice(0, 50);
    this.eventsSubject.next(updatedEvents);
  }

  /**
   * Update connection status for different services
   */
  private updateConnectionStatus(service: 'consultation' | 'chat' | 'media', connected: boolean): void {
    const currentStatus = this.connectionStatusSubject.value;
    const updatedStatus = { ...currentStatus, [service]: connected };
    this.connectionStatusSubject.next(updatedStatus);
  }

  /**
   * Setup consultation WebSocket event listeners
   */
  private setupConsultationEventListeners(): void {
    if (!this.consultationSocket) return;

    // Patient events
    this.consultationSocket.on('patient_joined_waiting_room', (data) => {
      this.updateConsultationState({
        waitingRoomStatus: {
          hasWaitingPatients: true,
          waitingCount: data.waitingCount || 1
        }
      });

      this.addNotification({
        type: 'info',
        title: '👤 Patient Waiting',
        message: `${data.patientName || 'A patient'} has joined the waiting room`,
        actions: [{
          label: 'Admit Patient',
          action: 'admit_patient',
          data: { patientId: data.patientId },
          style: 'primary'
        }]
      });

      this.addEvent({
        type: 'participant_joined',
        title: 'Patient Joined Waiting Room',
        description: `${data.patientName || 'Patient'} is waiting to be admitted`,
        severity: 'info',
        data
      });

      this.patientJoinedSubject.next(data);
    });

    this.consultationSocket.on('patient_admitted_to_consultation', (data) => {
      const patientName = data.patient?.firstName || 'Patient';
      this.updateConsultationState({
        patientPresent: true,
        patientName,
        sessionStatus: 'active',
        participantCount: this.consultationStateSubject.value.participantCount + 1
      });

      this.addNotification({
        type: 'success',
        title: '✅ Patient Admitted',
        message: `${patientName} has been admitted to the consultation`,
        duration: 3000
      });

      this.addEvent({
        type: 'participant_joined',
        title: 'Patient Admitted',
        description: `${patientName} joined the consultation`,
        severity: 'success',
        data
      });

      this.patientAdmittedSubject.next(data);
    });

    this.consultationSocket.on('patient_admitted', (data) => {
      const patientName = data.patient?.firstName || 'Patient';
      this.updateConsultationState({
        patientPresent: true,
        patientName,
        sessionStatus: 'active',
        participantCount: this.consultationStateSubject.value.participantCount + 1
      });
      this.patientAdmittedSubject.next(data);
    });

    this.consultationSocket.on('patient_admission_confirmed', (data) => {
      console.log(`[PractitionerConsultationRoomService] Patient admission confirmed:`, data);
      // Practitioner receives confirmation that patient was successfully admitted
      this.patientAdmittedSubject.next({
        ...data,
        message: 'Patient has been successfully admitted to consultation',
        type: 'admission_confirmed'
      });
    });

    this.consultationSocket.on('consultation_status', (data) => {
      console.log(`[PractitionerConsultationRoomService] Consultation status update:`, data);
      if (data.status === 'ACTIVE') {
        this.updateConsultationState({
          sessionStatus: 'active',
          consultationStartTime: new Date()
        });
      }
    });

    this.consultationSocket.on('media_session_live', (data) => {
      console.log(`[PractitionerConsultationRoomService] Media session live:`, data);
      this.updateMediaSessionState({
        canJoinMedia: true,
        mediaInitialized: true
      });
      this.mediaSessionReadySubject.next(data);
    });

    this.consultationSocket.on('redirect_to_consultation_room', (data) => {
      console.log(`[PractitionerConsultationRoomService] Redirect to consultation room:`, data);
      // This can be used to ensure all participants are in sync
      this.updateConsultationState({
        sessionStatus: 'active'
      });
    });

    this.consultationSocket.on('transition_to_consultation_room', (data) => {
      console.log(`[PractitionerConsultationRoomService] Transition to consultation room:`, data);
      this.updateConsultationState({
        sessionStatus: 'active',
        participantCount: data.participantIds?.length || 1
      });
    });

    this.consultationSocket.on('patient_left', (data) => {
      const patientName = data.patient?.firstName || 'Patient';
      this.updateConsultationState({
        patientPresent: false,
        sessionStatus: data.consultationEnded ? 'ended' : 'waiting'
      });

      this.addNotification({
        type: 'warning',
        title: '👋 Patient Left',
        message: `${patientName} has left the consultation`,
        duration: 4000
      });

      this.addEvent({
        type: 'participant_left',
        title: 'Patient Left',
        description: `${patientName} disconnected from the consultation`,
        severity: 'warning',
        data
      });

      this.patientLeftSubject.next(data);
    });

    // Enhanced consultation activation event
    this.consultationSocket.on('consultation_activated', (data) => {
      console.log(`[PractitionerConsultationRoomService] Consultation activated:`, data);
      this.updateConsultationState({
        sessionStatus: 'active',
        consultationStartTime: new Date(),
        isConnected: true
      });

      this.addNotification({
        type: 'success',
        title: '🎉 Consultation Active',
        message: 'Consultation is now active and ready for participants',
        duration: 3000
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'Consultation Activated',
        description: 'Consultation session is now live',
        severity: 'success',
        data
      });
    });

    this.consultationSocket.on('consultation_activated_response', (data) => {
      if (data.success) {
        console.log(`[PractitionerConsultationRoomService] Consultation activation successful`);
        this.updateConsultationState({
          sessionStatus: 'active',
          isConnected: true
        });
      } else {
        console.error(`[PractitionerConsultationRoomService] Consultation activation failed:`, data.error);
        this.addNotification({
          type: 'error',
          title: 'Activation Failed',
          message: data.error || 'Failed to activate consultation',
          duration: 5000
        });
      }
    });

    // Consultation state events
    this.consultationSocket.on('consultation_ended', (data) => {
      this.updateConsultationState({
        sessionStatus: 'ended'
      });

      this.addNotification({
        type: 'info',
        title: '📞 Consultation Ended',
        message: 'The consultation has been completed',
        duration: null, // Permanent notification
        actions: [{
          label: 'Return to Dashboard',
          action: 'navigate_dashboard',
          style: 'primary'
        }]
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'Consultation Ended',
        description: 'The consultation session has been completed',
        severity: 'info',
        data
      });

      this.consultationEndedSubject.next(data);
    });

    this.consultationSocket.on('consultation_status_update', (data) => {
      this.updateConsultationState({
        sessionStatus: data.status?.toLowerCase() || 'active',
        participantCount: data.participantCount || 0
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'Status Updated',
        description: `Consultation status changed to ${data.status}`,
        severity: 'info',
        data
      });
    });

    // Waiting room updates
    this.consultationSocket.on('waiting_room_update', (data) => {
      this.updateConsultationState({
        waitingRoomStatus: {
          hasWaitingPatients: data.waitingCount > 0,
          waitingCount: data.waitingCount || 0
        }
      });

      if (data.waitingCount > 0) {
        this.addNotification({
          type: 'info',
          title: '🚪 Waiting Room Update',
          message: `${data.waitingCount} patient(s) waiting to be admitted`,
          actions: [{
            label: 'View Waiting Room',
            action: 'show_waiting_room',
            style: 'primary'
          }]
        });
      }

      this.addEvent({
        type: 'waiting_room_update',
        title: 'Waiting Room Update',
        description: `${data.waitingCount} patients in waiting room`,
        severity: data.waitingCount > 0 ? 'info' : 'success',
        data
      });

      this.waitingRoomUpdateSubject.next(data);
    });

    // Connection events
    this.consultationSocket.on('connect', () => {
      this.updateConsultationState({ isConnected: true });
      this.updateConnectionStatus('consultation', true);

      this.addNotification({
        type: 'success',
        title: '🔗 Connected',
        message: 'Consultation WebSocket connected successfully',
        duration: 2000
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'WebSocket Connected',
        description: 'Consultation service connected',
        severity: 'success'
      });
    });

    this.consultationSocket.on('disconnect', () => {
      this.updateConsultationState({ isConnected: false });
      this.updateConnectionStatus('consultation', false);

      this.addNotification({
        type: 'error',
        title: '⚠️ Connection Lost',
        message: 'Consultation WebSocket disconnected. Attempting to reconnect...',
        actions: [{
          label: 'Retry Connection',
          action: 'retry_connection',
          style: 'primary'
        }]
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'WebSocket Disconnected',
        description: 'Consultation service disconnected',
        severity: 'error'
      });
    });
  }

  /**
   * Setup MediaSoup WebSocket event listeners
   */
  private setupMediaSoupEventListeners(): void {
    if (!this.mediasoupSocket) return;

    this.mediasoupSocket.on('media_session_ready', (data) => {
      this.updateMediaSessionState({
        routerId: data.routerId,
        rtpCapabilities: data.rtpCapabilities,
        canJoinMedia: true,
        mediaInitialized: true
      });

      this.addNotification({
        type: 'success',
        title: '🎥 Media Ready',
        message: 'Video and audio session is ready to start',
        duration: 3000
      });

      this.addEvent({
        type: 'media_status_changed',
        title: 'Media Session Ready',
        description: 'Audio/video capabilities initialized successfully',
        severity: 'success',
        data
      });

      this.mediaSessionReadySubject.next(data);
    });

    this.mediasoupSocket.on('connection_quality_update', (data) => {
      const quality = data.quality || 'good';
      this.updateMediaSessionState({
        connectionQuality: quality
      });

      // Only notify for poor connection quality
      if (quality === 'poor') {
        this.addNotification({
          type: 'warning',
          title: '📶 Connection Quality',
          message: 'Poor connection quality detected. Check your internet connection.',
          duration: 5000
        });
      }

      this.addEvent({
        type: 'media_status_changed',
        title: 'Connection Quality Update',
        description: `Connection quality: ${quality}`,
        severity: quality === 'poor' ? 'warning' : 'info',
        data
      });

      this.connectionQualitySubject.next(data);
    });

    this.mediasoupSocket.on('participant_media_status', (data) => {
      // Update participant media status
      const currentParticipants = this.participantsSubject.value;
      const updatedParticipants = currentParticipants.map(p =>
        p.id === data.participantId
          ? { ...p, mediaStatus: data.mediaStatus }
          : p
      );
      this.participantsSubject.next(updatedParticipants);

      const participant = currentParticipants.find(p => p.id === data.participantId);
      if (participant) {
        this.addEvent({
          type: 'media_status_changed',
          title: 'Participant Media Status',
          description: `${participant.firstName} ${participant.lastName} ${data.mediaStatus?.videoEnabled ? 'enabled' : 'disabled'} video`,
          severity: 'info',
          data
        });
      }
    });

    // Add participant events
    this.mediasoupSocket.on('participant_added', (data) => {
      const participantName = `${data.participant?.firstName || ''} ${data.participant?.lastName || ''}`.trim();

      this.addNotification({
        type: 'info',
        title: '👥 Participant Added',
        message: `${participantName} (${data.participant?.role}) has joined the consultation`,
        duration: 4000
      });

      this.addEvent({
        type: 'participant_joined',
        title: 'Participant Added',
        description: `${participantName} joined as ${data.participant?.role}`,
        severity: 'success',
        data
      });

      // Update participants list
      const currentParticipants = this.participantsSubject.value;
      this.participantsSubject.next([...currentParticipants, data.participant]);
    });

    this.mediasoupSocket.on('connect', () => {
      this.updateConnectionStatus('media', true);

      this.addNotification({
        type: 'success',
        title: '📹 Media Connected',
        message: 'Video/audio service connected successfully',
        duration: 2000
      });

      this.addEvent({
        type: 'media_status_changed',
        title: 'Media Service Connected',
        description: 'Audio/video WebSocket connected',
        severity: 'success'
      });
    });

    this.mediasoupSocket.on('disconnect', () => {
      this.updateMediaSessionState({ connectionQuality: 'disconnected' });
      this.updateConnectionStatus('media', false);

      this.addNotification({
        type: 'warning',
        title: '📹 Media Disconnected',
        message: 'Video/audio connection lost. Media features may not work properly.',
        duration: 6000
      });

      this.addEvent({
        type: 'media_status_changed',
        title: 'Media Service Disconnected',
        description: 'Audio/video WebSocket disconnected',
        severity: 'warning'
      });
    });
  }

  /**
   * Setup chat WebSocket event listeners
   */
  private setupChatEventListeners(): void {
    if (!this.chatSocket) return;

    this.chatSocket.on('message_history', (data) => {
      const messages = data.messages?.map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        content: msg.content,
        createdAt: msg.createdAt,
        messageType: msg.messageType || 'TEXT',
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        filePath: msg.filePath,
        userName: msg.userName || 'Unknown',
        isFromPractitioner: msg.role === 'PRACTITIONER',
        readBy: msg.readBy || []
      })) || [];

      this.chatMessagesSubject.next(messages);

      if (messages.length > 0) {
        this.addEvent({
          type: 'message_received',
          title: 'Chat History Loaded',
          description: `${messages.length} previous messages loaded`,
          severity: 'info',
          data
        });
      }
    });

    this.chatSocket.on('new_message', (data) => {
      const currentMessages = this.chatMessagesSubject.value;
      const newMessage: ChatMessage = {
        id: data.id || Date.now(),
        userId: data.userId,
        content: data.content,
        createdAt: data.createdAt || new Date().toISOString(),
        messageType: data.messageType || 'TEXT',
        fileName: data.fileName,
        fileSize: data.fileSize,
        filePath: data.filePath,
        userName: data.userName || 'Unknown',
        isFromPractitioner: data.role === 'PRACTITIONER',
        readBy: data.readBy || []
      };

      this.chatMessagesSubject.next([...currentMessages, newMessage]);

      // Only notify for messages from others, not our own
      if (!newMessage.isFromPractitioner) {
        this.addNotification({
          type: 'info',
          title: '💬 New Message',
          message: `${newMessage.userName}: ${newMessage.content.substring(0, 50)}${newMessage.content.length > 50 ? '...' : ''}`,
          duration: 4000,
          actions: [{
            label: 'View Chat',
            action: 'open_chat',
            style: 'primary'
          }]
        });

        this.addEvent({
          type: 'message_received',
          title: 'Message Received',
          description: `New message from ${newMessage.userName}`,
          severity: 'info',
          data: newMessage
        });
      }
    });

    this.chatSocket.on('connect', () => {
      this.updateConnectionStatus('chat', true);

      this.addNotification({
        type: 'success',
        title: '💬 Chat Connected',
        message: 'Chat service connected successfully',
        duration: 2000
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'Chat Service Connected',
        description: 'Chat WebSocket connected',
        severity: 'success'
      });
    });

    this.chatSocket.on('disconnect', () => {
      this.updateConnectionStatus('chat', false);

      this.addNotification({
        type: 'warning',
        title: '💬 Chat Disconnected',
        message: 'Chat connection lost. Messages may not be delivered.',
        duration: 5000
      });

      this.addEvent({
        type: 'consultation_status_changed',
        title: 'Chat Service Disconnected',
        description: 'Chat WebSocket disconnected',
        severity: 'warning'
      });
    });

    // Enhanced chat event listeners
    this.chatSocket.on('typing_indicator', (data) => {
      const currentTyping = this.typingUsersSubject.value;
      let updatedTyping: TypingUser[];

      if (data.isTyping) {
        // Add user to typing list if not already there
        if (!currentTyping.find(user => user.userId === data.userId)) {
          updatedTyping = [...currentTyping, {
            userId: data.userId,
            userName: data.userName || 'Unknown',
            isTyping: true
          }];
        } else {
          updatedTyping = currentTyping;
        }
      } else {
        // Remove user from typing list
        updatedTyping = currentTyping.filter(user => user.userId !== data.userId);
      }

      this.typingUsersSubject.next(updatedTyping);
    });

    this.chatSocket.on('message_read', (data) => {
      const currentMessages = this.chatMessagesSubject.value;
      const updatedMessages = currentMessages.map(message => {
        if (message.id === data.messageId) {
          return {
            ...message,
            readBy: [...(message.readBy || []), {
              userId: data.userId,
              readAt: data.readAt
            }]
          };
        }
        return message;
      });

      this.chatMessagesSubject.next(updatedMessages);
    });

    this.chatSocket.on('file_upload_progress', (data) => {
      // Handle file upload progress if needed
      console.log('File upload progress:', data);
    });
  }

  /**
   * Load initial consultation data from join response
   */
  private loadInitialConsultationData(joinResponse: any): void {
    const data = joinResponse.data || joinResponse;

    // Update consultation state
    this.updateConsultationState({
      sessionStatus: data.status?.toLowerCase() || 'active',
      consultationStartTime: new Date()
    });

    // Update media session state
    if (data.mediasoup) {
      this.updateMediaSessionState({
        routerId: data.mediasoup.routerId,
        canJoinMedia: data.mediasoup.active || false
      });
    }

    // Load participants
    if (data.participants) {
      const participants = data.participants.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
        isActive: p.isActive,
        inWaitingRoom: p.inWaitingRoom || false,
        joinedAt: p.joinedAt
      }));
      this.participantsSubject.next(participants);

      const patient = participants.find((p: any) => p.role === 'PATIENT');
      if (patient && patient.isActive) {
        this.updateConsultationState({
          patientPresent: true,
          patientName: `${patient.firstName} ${patient.lastName}`.trim(),
          participantCount: participants.filter((p: any) => p.isActive).length
        });
      }
    }

    if (data.messages) {
      const messages = data.messages.map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        content: msg.content,
        createdAt: msg.createdAt,
        messageType: 'user',
        userName: msg.userName || 'Unknown',
        isFromPractitioner: msg.role === 'PRACTITIONER'
      }));
      this.chatMessagesSubject.next(messages);
    }
  }

  /**
   * Initialize media devices
   */
  private async initializeMediaDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');

      this.updateMediaSessionState({
        devices: {
          cameras,
          microphones,
          speakers
        }
      });

      console.log(`[PractitionerConsultationRoomService] Media devices initialized:`, {
        cameras: cameras.length,
        microphones: microphones.length,
        speakers: speakers.length
      });
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to initialize media devices:`, error);
    }
  }

  /**
   * Admit patient from waiting room to consultation
   */
  async admitPatient(consultationId: number, patientId?: number): Promise<void> {
    try {
      if (!this.consultationSocket) {
        throw new Error('Consultation socket not connected');
      }

      this.consultationSocket.emit('admit_patient', {
        consultationId,
        patientId
      });

      const response = await this.http.post(`${environment.apiUrl}/consultation/admit`, {
        consultationId,
        patientId
      }).toPromise();

      console.log(`[PractitionerConsultationRoomService] Patient admission request sent`, response);

    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to admit patient:`, error);
      throw error;
    }
  }

  /**
   * Send chat message
   */
  async sendMessage(content: string, practitionerId: number): Promise<void> {
    try {
      if (!this.chatSocket) {
        throw new Error('Chat socket not connected');
      }

      const consultationId = this.consultationStateSubject.value.consultationId;

      this.chatSocket.emit('send_message', {
        consultationId,
        userId: practitionerId,
        content,
        role: 'PRACTITIONER'
      });

      console.log(`[PractitionerConsultationRoomService] Message sent:`, content);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to send message:`, error);
      throw error;
    }
  }

  /**
   * Send file message
   */
  async sendFileMessage(file: File, practitionerId: number): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('consultationId', this.consultationStateSubject.value.consultationId.toString());
      formData.append('userId', practitionerId.toString());
      formData.append('role', 'PRACTITIONER');

      const response = await this.http.post(`${environment.apiUrl}/chat/upload`, formData).toPromise();
      console.log(`[PractitionerConsultationRoomService] File sent:`, response);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to send file:`, error);
      throw error;
    }
  }

  /**
   * Start typing indicator
   */
  startTypingIndicator(practitionerId: number, practitionerName: string): void {
    if (!this.chatSocket) return;

    const consultationId = this.consultationStateSubject.value.consultationId;
    this.chatSocket.emit('typing', {
      consultationId,
      userId: practitionerId,
      userName: practitionerName,
      isTyping: true
    });
  }

  /**
   * Stop typing indicator
   */
  stopTypingIndicator(practitionerId: number, practitionerName: string): void {
    if (!this.chatSocket) return;

    const consultationId = this.consultationStateSubject.value.consultationId;
    this.chatSocket.emit('typing', {
      consultationId,
      userId: practitionerId,
      userName: practitionerName,
      isTyping: false
    });
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: number, practitionerId: number): void {
    if (!this.chatSocket) return;

    const consultationId = this.consultationStateSubject.value.consultationId;
    this.chatSocket.emit('read_message', {
      consultationId,
      messageId,
      userId: practitionerId
    });
  }

  /**
   * Mark all messages as read
   */
  markAllMessagesAsRead(practitionerId: number): void {
    const messages = this.chatMessagesSubject.value;
    messages.forEach(message => {
      if (!message.readBy?.find(r => r.userId === practitionerId)) {
        this.markMessageAsRead(message.id, practitionerId);
      }
    });
    this.unreadCountSubject.next(0);
  }

  /**
   * Toggle chat visibility
   */
  toggleChatVisibility(): void {
    const currentState = this.showChatSubject.value;
    this.showChatSubject.next(!currentState);
  }

  /**
   * Update unread count
   */
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  /**
   * Activate consultation (move from WAITING to ACTIVE)
   */
  async activateConsultation(consultationId: number, practitionerId: number): Promise<void> {
    try {
      if (!this.consultationSocket) {
        throw new Error('Consultation socket not connected');
      }

      this.consultationSocket.emit('activate_consultation', {
        consultationId,
        practitionerId
      });

      console.log(`[PractitionerConsultationRoomService] Consultation activation requested: ${consultationId}`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to activate consultation:`, error);
      throw error;
    }
  }

  /**
   * Toggle media (video/audio)
   */
  async toggleMedia(mediaType: 'video' | 'audio', enabled: boolean): Promise<void> {
    try {
      if (!this.mediasoupSocket) {
        throw new Error('MediaSoup socket not connected');
      }

      const consultationId = this.consultationStateSubject.value.consultationId;

      this.mediasoupSocket.emit('toggle_media', {
        consultationId,
        mediaType,
        enabled
      });

      // Update local state
      const currentState = this.consultationStateSubject.value;
      this.updateConsultationState({
        mediaStatus: {
          ...currentState.mediaStatus,
          [mediaType === 'video' ? 'videoEnabled' : 'audioEnabled']: enabled
        }
      });

      console.log(`[PractitionerConsultationRoomService] ${mediaType} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to toggle ${mediaType}:`, error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      if (!this.mediasoupSocket) {
        throw new Error('MediaSoup socket not connected');
      }

      const consultationId = this.consultationStateSubject.value.consultationId;

      this.mediasoupSocket.emit('start_screen_share', {
        consultationId
      });

      this.updateConsultationState({
        mediaStatus: {
          ...this.consultationStateSubject.value.mediaStatus,
          screenShareEnabled: true
        }
      });

      console.log(`[PractitionerConsultationRoomService] Screen sharing started`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to start screen sharing:`, error);
      throw error;
    }
  }

  /**
   * End consultation
   */
  async endConsultation(consultationId: number, reason?: string, notes?: string): Promise<void> {
    try {
      await this.http.post(`${environment.apiUrl}/consultation/end`, {
        consultationId,
        reason,
        notes
      }).toPromise();

      // Disconnect and reset
      await this.leaveConsultation();

      console.log(`[PractitionerConsultationRoomService] Consultation ended`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to end consultation:`, error);
      throw error;
    }
  }

  /**
   * Leave consultation and cleanup
   */
  async leaveConsultation(): Promise<void> {
    try {
      // Disconnect WebSocket connections
      if (this.consultationSocket) {
        this.consultationSocket.disconnect();
        this.consultationSocket = null;
      }

      if (this.mediasoupSocket) {
        this.mediasoupSocket.disconnect();
        this.mediasoupSocket = null;
      }

      if (this.chatSocket) {
        this.chatSocket.disconnect();
        this.chatSocket = null;
      }

      // Reset state
      this.resetState();

      console.log(`[PractitionerConsultationRoomService] Left consultation and cleaned up`);
    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to leave consultation:`, error);
      throw error;
    }
  }

  /**
   * Update consultation state
   */
  private updateConsultationState(updates: Partial<PractitionerConsultationState>): void {
    const currentState = this.consultationStateSubject.value;
    this.consultationStateSubject.next({ ...currentState, ...updates });
  }

  /**
   * Update media session state
   */
  private updateMediaSessionState(updates: Partial<PractitionerMediaSessionState>): void {
    const currentState = this.mediaSessionStateSubject.value;
    this.mediaSessionStateSubject.next({ ...currentState, ...updates });
  }

  /**
   * Reset all state to initial values
   */
  private resetState(): void {
    this.consultationStateSubject.next({
      consultationId: 0,
      isConnected: false,
      patientPresent: false,
      patientName: '',
      patientLanguage: null,
      sessionStatus: 'connecting',
      participantCount: 0,
      consultationStartTime: null,
      mediaStatus: {
        videoEnabled: false,
        audioEnabled: false,
        screenShareEnabled: false
      },
      waitingRoomStatus: {
        hasWaitingPatients: false,
        waitingCount: 0
      }
    });

    this.mediaSessionStateSubject.next({
      routerId: '',
      rtpCapabilities: null,
      canJoinMedia: false,
      mediaInitialized: false,
      connectionQuality: 'disconnected',
      devices: {
        cameras: [],
        microphones: [],
        speakers: []
      }
    });

    this.chatMessagesSubject.next([]);
    this.participantsSubject.next([]);
  }

  /**
   * Get current consultation state
   */
  getCurrentState(): PractitionerConsultationState {
    return this.consultationStateSubject.value;
  }

  /**
   * Get current media session state
   */
  getCurrentMediaState(): PractitionerMediaSessionState {
    return this.mediaSessionStateSubject.value;
  }

  /**
   * Clear notification by ID (public method for components)
   */
  clearNotification(id: string): void {
    this.removeNotification(id);
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
  }

  /**
   * Handle notification action (public method for components)
   */
  handleNotificationAction(action: string, data?: any): void {
    switch (action) {
      case 'admit_patient':
        if (data?.patientId) {
          this.admitPatientFromWaitingRoom(this.getCurrentState().consultationId, data.patientId);
        }
        break;
      case 'retry_connection':
        // Implement retry logic
        this.reinitializeConnections();
        break;
      case 'navigate_dashboard':
        // This should be handled by the component
        break;
      case 'show_waiting_room':
        // This should be handled by the component
        break;
      case 'open_chat':
        // This should be handled by the component
        break;
    }
  }

  /**
   * Reinitialize connections
   */
  private async reinitializeConnections(): Promise<void> {
    const state = this.getCurrentState();
    if (state.consultationId > 0) {
      try {
        // Attempt to reconnect
        await this.initializePractitionerConsultationRoom(state.consultationId, 1); // TODO: Get practitionerId properly
      } catch (error) {
        this.addNotification({
          type: 'error',
          title: 'Reconnection Failed',
          message: 'Failed to reconnect. Please refresh the page.',
        });
      }
    }
  }

  /**
   * Add participant (expert or guest) to consultation
   */
  async addParticipant(consultationId: number, participantData: {
    role: 'EXPERT' | 'GUEST';
    email: string;
    firstName: string;
    lastName: string;
    notes?: string;
  }): Promise<void> {
    try {
      console.log(`[PractitionerConsultationRoomService] Adding participant to consultation ${consultationId}:`, participantData);

      const response = await this.http.post(
        `${environment.apiUrl}/consultation/${consultationId}/participants`,
        participantData
      ).toPromise();

      console.log(`[PractitionerConsultationRoomService] Participant added successfully:`, response);

      // The real-time update will come through WebSocket 'participant_added' event
      // which is already handled in setupConsultationEventListeners()

    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to add participant:`, error);
      throw error;
    }
  }

  /**
   * Remove participant from consultation
   */
  async removeParticipant(consultationId: number, participantId: number): Promise<void> {
    try {
      console.log(`[PractitionerConsultationRoomService] Removing participant ${participantId} from consultation ${consultationId}`);

      await this.http.delete(
        `${environment.apiUrl}/consultation/${consultationId}/participants/${participantId}`
      ).toPromise();

      const currentParticipants = this.participantsSubject.value;
      const updatedParticipants = currentParticipants.filter(p => p.id !== participantId);
      this.participantsSubject.next(updatedParticipants);

      console.log(`[PractitionerConsultationRoomService] Participant removed successfully`);

    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to remove participant:`, error);
      throw error;
    }
  }

  /**
   * Get consultation participants from backend
   */
  async loadConsultationParticipants(consultationId: number): Promise<ConsultationParticipant[]> {
    try {
      console.log(`[PractitionerConsultationRoomService] Loading participants for consultation ${consultationId}`);

      const participants = await this.http.get<ConsultationParticipant[]>(
        `${environment.apiUrl}/consultation/${consultationId}/participants`
      ).toPromise();

      this.participantsSubject.next(participants || []);

      return participants || [];

    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to load participants:`, error);
      return [];
    }
  }

  /**
   * Admit patient from waiting room
   */
  async admitPatientFromWaitingRoom(consultationId: number, patientId?: number): Promise<void> {
    try {
      console.log(`[PractitionerConsultationRoomService] Admitting patient to consultation ${consultationId}`);

      if (this.consultationSocket) {
        this.consultationSocket.emit('admit_patient', {
          consultationId,
          patientId
        });

        console.log(`[PractitionerConsultationRoomService] Patient admission request sent`);
      } else {
        throw new Error('Consultation socket not connected');
      }

    } catch (error) {
      console.error(`[PractitionerConsultationRoomService] Failed to admit patient:`, error);
      throw error;
    }
  }
}
