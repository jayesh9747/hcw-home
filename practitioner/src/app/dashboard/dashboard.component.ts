import { Component, OnInit, computed, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsultationCardComponent } from '../components/consultations-card/consultations-card.component';
import { InviteFormComponent } from '../components/invite-form/invite-form.component';
import { RoutePaths } from '../constants/route-paths.enum';
import { ConsultationService, CreatePatientConsultationRequest } from '../services/consultations/consultation.service';
import { ConsultationWithPatient } from '../dtos';
import { DashboardWebSocketService } from '../services/dashboard-websocket.service';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ConsultationCardComponent, InviteFormComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  readonly RoutePaths = RoutePaths;

  waitingConsultations = signal<ConsultationWithPatient[]>([]);
  openConsultations = signal<ConsultationWithPatient[]>([]);
  isInviting = signal(false);
  isLoading = signal(false);

  waitingPatientCount = signal(0);
  hasNewNotifications = signal(false);
  isConnected = signal(false);

  audioEnabled = signal(true);
  audioVolume = signal(0.7);
  showAudioSettings = signal(false);

  constructor(
    private consultationService: ConsultationService,
    private dashboardWebSocketService: DashboardWebSocketService
  ) { }

  ngOnInit(): void {
    this.initializeDashboard();
    this.loadConsultations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize dashboard with real-time features
   */
  private initializeDashboard(): void {
    // Get practitioner ID (you might get this from auth service)
    const practitionerId = 1; // Replace with actual practitioner ID

    this.dashboardWebSocketService.initializeDashboardConnection(practitionerId)
      .catch(error => {
        console.error('Failed to initialize dashboard WebSocket:', error);
      });

    this.dashboardWebSocketService.dashboardState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.waitingPatientCount.set(state.waitingPatientCount);
        this.hasNewNotifications.set(state.hasNewNotifications);
        this.isConnected.set(state.isConnected);
      });

    // Subscribe to patient notifications
    this.dashboardWebSocketService.patientJoined$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        console.log('New patient notification:', notification);
        // Refresh consultations when new patient joins
        this.loadConsultations();
      });

    // Load audio settings
    this.loadAudioSettings();
  }

  private loadConsultations(): void {
    this.consultationService
      .getWaitingConsultations()
      .subscribe({
        next: (data) => {
          console.log('Waiting consultations received:', data);
          this.waitingConsultations.set(data);
        },
        error: (error) => {
          console.error('Error fetching waiting consultations:', error);
        }
      });

    this.consultationService
      .getOpenConsultations()
      .subscribe({
        next: (data) => {
          console.log('Open consultations received:', data);
          this.openConsultations.set(data);
        },
        error: (error) => {
          console.error('Error fetching open consultations:', error);
        }
      });
  }

  cards = computed(() => {
    const cards = [
      {
        title: 'WAITING ROOM',
        description: 'Consultations waiting to be attended',
        consultations: this.waitingConsultations(),
        routerLink: RoutePaths.WaitingRoom,
        showInvite: true,
      },
      {
        title: 'OPEN CONSULTATIONS',
        description: 'Consultations in progress',
        consultations: this.openConsultations(),
        routerLink: RoutePaths.OpenConsultations,
        showInvite: false,
      },
    ];
    console.log('Cards computed:', cards);
    return cards;
  });

  trackByTitle(_idx: number, card: { title: string }): string {
    return card.title;
  }

  onInviteSubmit(formData: CreatePatientConsultationRequest) {
    console.log('✅ Form submitted with data:', formData);

    this.isLoading.set(true);

    this.consultationService.createPatientAndConsultation(formData)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.data && response.data.success) {
            const { patient, consultation } = response.data.data;

            if (patient.isNewPatient) {
              alert(`New patient "${patient.firstName} ${patient.lastName}" created and consultation #${consultation.id} scheduled!`);
            } else {
              alert(`Consultation #${consultation.id} scheduled for existing patient "${patient.firstName} ${patient.lastName}"!`);
            }

            this.closeInvite();

            this.loadConsultations();

          } else {
            alert('Failed to create consultation: ');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('API Error:', error);

          let errorMessage = 'Failed to create patient and consultation';

          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }

          alert('Error: ' + errorMessage);

        }
      });
  }

  openInviteSelector() {
    this.isInviting.set(true);
  }

  closeInvite() {
    this.isInviting.set(false);
  }

  /**
   * Load audio settings from dashboard service
   */
  private loadAudioSettings(): void {
    const config = this.dashboardWebSocketService.getAudioConfig();
    this.audioEnabled.set(config.enabled);
    this.audioVolume.set(config.volume);
  }

  /**
   * Toggle audio notifications
   */
  toggleAudio(): void {
    const newState = !this.audioEnabled();
    this.audioEnabled.set(newState);
    this.dashboardWebSocketService.setAudioEnabled(newState);
  }

  /**
   * Update audio volume
   */
  updateVolume(volume: number): void {
    this.audioVolume.set(volume);
    this.dashboardWebSocketService.setAudioVolume(volume);
  }

  /**
   * Test audio alerts
   */
  async testAudio(): Promise<void> {
    try {
      await this.dashboardWebSocketService.playTestAlert();
    } catch (error) {
      console.error('Audio test failed:', error);
    }
  }

  /**
   * Toggle audio settings panel
   */
  toggleAudioSettings(): void {
    this.showAudioSettings.set(!this.showAudioSettings());
  }

  /**
   * Mark notifications as read
   */
  markNotificationsAsRead(): void {
    this.dashboardWebSocketService.markNotificationsAsRead();
    this.hasNewNotifications.set(false);
  }

  /**
   * Get connection status text
   */
  getConnectionStatusText(): string {
    return this.isConnected() ? 'Connected' : 'Disconnected';
  }

  /**
   * Get waiting patients text
   */
  getWaitingPatientsText(): string {
    const count = this.waitingPatientCount();
    if (count === 0) return 'No patients waiting';
    if (count === 1) return '1 patient waiting';
    return `${count} patients waiting`;
  }
}
