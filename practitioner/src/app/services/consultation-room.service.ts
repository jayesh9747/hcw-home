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
 messageType: 'user' | 'system';
 userName?: string;
 isFromPractitioner?: boolean;
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

 // Event subjects for real-time notifications
 private patientJoinedSubject = new Subject<any>();
 private patientLeftSubject = new Subject<any>();
 private patientAdmittedSubject = new Subject<any>();
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
   const wsBaseUrl = environment.apiUrl.replace('/api', '').replace('3000', '3001');

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
  * Setup consultation WebSocket event listeners
  */
 private setupConsultationEventListeners(): void {
  if (!this.consultationSocket) return;

  // Patient events
  this.consultationSocket.on('patient_joined_waiting_room', (data) => {
   console.log(`[PractitionerConsultationRoomService] Patient joined waiting room:`, data);
   this.updateConsultationState({
    waitingRoomStatus: {
     hasWaitingPatients: true,
     waitingCount: data.waitingCount || 1
    }
   });
   this.patientJoinedSubject.next(data);
  });

  this.consultationSocket.on('patient_admitted_to_consultation', (data) => {
   console.log(`[PractitionerConsultationRoomService] Patient admitted to consultation:`, data);
   this.updateConsultationState({
    patientPresent: true,
    patientName: data.patient?.firstName || 'Patient',
    sessionStatus: 'active',
    participantCount: this.consultationStateSubject.value.participantCount + 1
   });
   this.patientAdmittedSubject.next(data);
  });

  this.consultationSocket.on('patient_admitted', (data) => {
   console.log(`[PractitionerConsultationRoomService] Patient admitted (enhanced):`, data);
   this.updateConsultationState({
    patientPresent: true,
    patientName: data.patient?.firstName || 'Patient',
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
  }); this.consultationSocket.on('patient_left', (data) => {
   console.log(`[PractitionerConsultationRoomService] Patient left:`, data);
   this.updateConsultationState({
    patientPresent: false,
    sessionStatus: data.consultationEnded ? 'ended' : 'waiting'
   });
   this.patientLeftSubject.next(data);
  });

  // Consultation state events
  this.consultationSocket.on('consultation_ended', (data) => {
   console.log(`[PractitionerConsultationRoomService] Consultation ended:`, data);
   this.updateConsultationState({
    sessionStatus: 'ended'
   });
   this.consultationEndedSubject.next(data);
  });

  this.consultationSocket.on('consultation_status_update', (data) => {
   console.log(`[PractitionerConsultationRoomService] Consultation status update:`, data);
   this.updateConsultationState({
    sessionStatus: data.status?.toLowerCase() || 'active',
    participantCount: data.participantCount || 0
   });
  });

  // Waiting room updates
  this.consultationSocket.on('waiting_room_update', (data) => {
   console.log(`[PractitionerConsultationRoomService] Waiting room update:`, data);
   this.updateConsultationState({
    waitingRoomStatus: {
     hasWaitingPatients: data.waitingCount > 0,
     waitingCount: data.waitingCount || 0
    }
   });
   this.waitingRoomUpdateSubject.next(data);
  });

  // Connection events
  this.consultationSocket.on('connect', () => {
   console.log(`[PractitionerConsultationRoomService] Consultation WebSocket connected`);
   this.updateConsultationState({ isConnected: true });
  });

  this.consultationSocket.on('disconnect', () => {
   console.log(`[PractitionerConsultationRoomService] Consultation WebSocket disconnected`);
   this.updateConsultationState({ isConnected: false });
  });
 }

 /**
  * Setup MediaSoup WebSocket event listeners
  */
 private setupMediaSoupEventListeners(): void {
  if (!this.mediasoupSocket) return;

  this.mediasoupSocket.on('media_session_ready', (data) => {
   console.log(`[PractitionerConsultationRoomService] Media session ready:`, data);
   this.updateMediaSessionState({
    routerId: data.routerId,
    rtpCapabilities: data.rtpCapabilities,
    canJoinMedia: true,
    mediaInitialized: true
   });
   this.mediaSessionReadySubject.next(data);
  });

  this.mediasoupSocket.on('connection_quality_update', (data) => {
   console.log(`[PractitionerConsultationRoomService] Connection quality update:`, data);
   this.updateMediaSessionState({
    connectionQuality: data.quality || 'good'
   });
   this.connectionQualitySubject.next(data);
  });

  this.mediasoupSocket.on('participant_media_status', (data) => {
   console.log(`[PractitionerConsultationRoomService] Participant media status:`, data);
   // Update participant media status
   const currentParticipants = this.participantsSubject.value;
   const updatedParticipants = currentParticipants.map(p =>
    p.id === data.participantId
     ? { ...p, mediaStatus: data.mediaStatus }
     : p
   );
   this.participantsSubject.next(updatedParticipants);
  });

  this.mediasoupSocket.on('connect', () => {
   console.log(`[PractitionerConsultationRoomService] MediaSoup WebSocket connected`);
  });

  this.mediasoupSocket.on('disconnect', () => {
   console.log(`[PractitionerConsultationRoomService] MediaSoup WebSocket disconnected`);
   this.updateMediaSessionState({ connectionQuality: 'disconnected' });
  });
 }

 /**
  * Setup chat WebSocket event listeners
  */
 private setupChatEventListeners(): void {
  if (!this.chatSocket) return;

  this.chatSocket.on('message_history', (data) => {
   console.log(`[PractitionerConsultationRoomService] Received message history:`, data);
   const messages = data.messages?.map((msg: any) => ({
    id: msg.id,
    userId: msg.userId,
    content: msg.content,
    createdAt: msg.createdAt,
    messageType: 'user',
    userName: msg.userName || 'Unknown',
    isFromPractitioner: msg.role === 'PRACTITIONER'
   })) || [];
   this.chatMessagesSubject.next(messages);
  });

  this.chatSocket.on('new_message', (data) => {
   console.log(`[PractitionerConsultationRoomService] New message received:`, data);
   const currentMessages = this.chatMessagesSubject.value;
   const newMessage: ChatMessage = {
    id: data.id || Date.now(),
    userId: data.userId,
    content: data.content,
    createdAt: data.createdAt || new Date().toISOString(),
    messageType: 'user',
    userName: data.userName || 'Unknown',
    isFromPractitioner: data.role === 'PRACTITIONER'
   };
   this.chatMessagesSubject.next([...currentMessages, newMessage]);
  });

  this.chatSocket.on('connect', () => {
   console.log(`[PractitionerConsultationRoomService] Chat WebSocket connected`);
  });

  this.chatSocket.on('disconnect', () => {
   console.log(`[PractitionerConsultationRoomService] Chat WebSocket disconnected`);
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
   // Call backend API to end consultation
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
}