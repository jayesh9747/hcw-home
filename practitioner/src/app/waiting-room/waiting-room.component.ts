import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConsultationService } from '../services/consultations/consultation.service';
import { DashboardWebSocketService, WaitingRoomNotification } from '../services/dashboard-websocket.service';

interface WaitingRoomItem {
  id: number;
  patientInitials: string;
  joinTime: string | null;
  language: string | null;
  queuePosition: number;
  estimatedWaitTime: string;
}

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss']
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private practitionerId: number = 1;

  waitingRoomItems: WaitingRoomItem[] = [];
  isLoading = true;
  error: string | null = null;
  currentPage = 1;
  totalPages = 0;
  totalCount = 0;

  constructor(
    private consultationService: ConsultationService,
    private router: Router,
    private dashboardWebSocketService: DashboardWebSocketService
  ) { }

  ngOnInit(): void {
    this.initializeDashboardWebSocket();
    this.setupRealTimeUpdates();
    this.loadWaitingRoom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load waiting room consultations
   */
  private loadWaitingRoom(): void {
    this.consultationService.getWaitingRoomConsultations(this.practitionerId, this.currentPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.waitingRoomItems = response.waitingRooms || [];
            this.totalPages = response.totalPages || 0;
            this.totalCount = response.totalCount || 0;
            this.error = null;
          } else {
            this.error = 'Failed to load waiting room';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading waiting room:', error);
          this.error = 'Failed to load waiting room';
          this.isLoading = false;
        }
      });
  }

  /**
   * Initialize dashboard WebSocket connection
   */
  private initializeDashboardWebSocket(): void {
    this.dashboardWebSocketService.initializeDashboardConnection(this.practitionerId)
      .catch(error => {
        console.error('Failed to initialize dashboard WebSocket:', error);
        this.error = 'Real-time updates unavailable';
      });
  }

  /**
   * Setup real-time waiting room updates
   */
  private setupRealTimeUpdates(): void {
    // Listen for new patients joining
    this.dashboardWebSocketService.patientJoined$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification: WaitingRoomNotification) => {
        console.log('Patient joined waiting room:', notification);
        this.handlePatientJoined(notification);
      });

    // Listen for patients leaving
    this.dashboardWebSocketService.patientLeft$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Patient left waiting room:', data);
        this.handlePatientLeft(data);
      });

    // Listen for waiting room updates
    this.dashboardWebSocketService.waitingRoomUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Waiting room update:', data);
        this.handleWaitingRoomUpdate(data);
      });

    // Listen for dashboard state changes
    this.dashboardWebSocketService.dashboardState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        console.log('Dashboard state updated:', state);
        // Update UI based on connection status
        if (!state.isConnected) {
          this.error = 'Real-time connection lost. Refreshing...';
          // Fallback to polling when WebSocket is disconnected
          setTimeout(() => this.loadWaitingRoom(), 1000);
        }
      });
  }

  /**
   * Handle new patient joining waiting room
   */
  private handlePatientJoined(notification: WaitingRoomNotification): void {
    // Check if patient is already in the list
    const existingIndex = this.waitingRoomItems.findIndex(
      item => item.id === notification.consultationId
    );

    if (existingIndex === -1) {
      // Add new patient to waiting room
      const newItem: WaitingRoomItem = {
        id: notification.consultationId,
        patientInitials: notification.patientInitials,
        joinTime: notification.joinTime.toISOString(),
        language: notification.language,
        queuePosition: this.waitingRoomItems.length + 1,
        estimatedWaitTime: this.calculateEstimatedWaitTime(this.waitingRoomItems.length + 1)
      };

      this.waitingRoomItems.unshift(newItem); // Add to beginning
      this.updateQueuePositions();
      this.totalCount++;

      // Clear any existing error
      this.error = null;

      console.log(`Patient ${notification.patientFirstName} (${notification.patientInitials}) added to waiting room`);
    } else {
      console.log('Patient already exists in waiting room, skipping duplicate');
    }
  }

  /**
   * Handle patient leaving waiting room
   */
  private handlePatientLeft(data: any): void {
    const consultationId = data.consultationId || data.id;

    const index = this.waitingRoomItems.findIndex(item => item.id === consultationId);
    if (index !== -1) {
      this.waitingRoomItems.splice(index, 1);
      this.updateQueuePositions();
      this.totalCount = Math.max(0, this.totalCount - 1);

      console.log(`Patient removed from waiting room: ${consultationId}`);
    }
  }

  /**
   * Handle general waiting room updates
   */
  private handleWaitingRoomUpdate(data: any): void {
    // Refresh the waiting room data when significant updates occur
    if (data.type === 'refresh' || data.refreshRequired) {
      this.loadWaitingRoom();
    }
  }

  /**
   * Update queue positions for all patients
   */
  private updateQueuePositions(): void {
    this.waitingRoomItems.forEach((item, index) => {
      item.queuePosition = index + 1;
      item.estimatedWaitTime = this.calculateEstimatedWaitTime(index + 1);
    });
  }

  /**
   * Calculate estimated wait time based on queue position
   */
  private calculateEstimatedWaitTime(position: number): string {
    const avgConsultationTime = 15; // 15 minutes average
    const waitMinutes = (position - 1) * avgConsultationTime;

    if (waitMinutes === 0) {
      return 'Next';
    } else if (waitMinutes < 60) {
      return `${waitMinutes} min`;
    } else {
      const hours = Math.floor(waitMinutes / 60);
      const mins = waitMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  /**
   * Enter consultation from waiting room
   */
  async enterConsultation(consultationId: number): Promise<void> {
    try {
      this.router.navigate(['/consultation-room', consultationId], {
        queryParams: { practitionerId: this.practitionerId }
      });
    } catch (error) {
      console.error('Error entering consultation:', error);
      this.error = 'Failed to enter consultation';
    }
  }

  /**
   * Get relative time for join time
   */
  getRelativeTime(joinTime: string | null): string {
    if (!joinTime) return 'Unknown';

    const now = new Date();
    const joined = new Date(joinTime);
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m ago`;
  }

  /**
   * Get priority class based on wait time
   */
  getPriorityClass(joinTime: string | null): string {
    if (!joinTime) return '';

    const now = new Date();
    const joined = new Date(joinTime);
    const diffMs = now.getTime() - joined.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins > 15) return 'priority-high';
    if (diffMins > 10) return 'priority-medium';
    return 'priority-normal';
  }

  /**
   * Navigate to previous page
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadWaitingRoom();
    }
  }

  /**
   * Navigate to next page
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadWaitingRoom();
    }
  }

  /**
   * Refresh waiting room
   */
  refresh(): void {
    this.isLoading = true;
    this.loadWaitingRoom();
  }
}
