import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, timer, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { WaitingRoomResponse, WaitingRoomItem } from '../dtos/consultations/consultation-dashboard-response.dto';
import { ConsultationService } from '../services/consultations/consultation.service';
import { DashboardWebSocketService, WaitingRoomNotification } from '../services/dashboard-websocket.service';

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  // API response data
  waitingRoomData: WaitingRoomResponse | null = null;
  waitingRoomItems: WaitingRoomItem[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalCount = 0;
  totalPages = 0;
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Connection status
  isWebSocketConnected = false;
  lastUpdateTime: Date | null = null;
  
  private destroy$ = new Subject<void>();
  practitionerId: number = 1;
  private fallbackPollingEnabled = false;

  constructor(
    private consultationService: ConsultationService,
    private router: Router,
    private dashboardWebSocketService: DashboardWebSocketService
  ) {}

  ngOnInit(): void {
    this.initializeDashboardWebSocket();
    this.setupRealTimeUpdates();
    this.loadWaitingRoom();
    this.setupFallbackPolling();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dashboardWebSocketService.disconnect();
  }

  private initializeDashboardWebSocket(): void {
    this.dashboardWebSocketService.initializeDashboardConnection(this.practitionerId)
      .then(() => {
        console.log('Dashboard WebSocket initialized successfully');
        this.isWebSocketConnected = true;
        this.error = null;
        this.fallbackPollingEnabled = false;
      })
      .catch(error => {
        console.error('Failed to initialize dashboard WebSocket:', error);
        this.isWebSocketConnected = false;
        this.error = 'Real-time updates unavailable - using fallback mode';
        this.enableFallbackPolling();
      });
  }

  private setupRealTimeUpdates(): void {
    // Listen for new patients joining
    this.dashboardWebSocketService.patientJoined$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notification: WaitingRoomNotification) => {
          console.log('Patient joined waiting room:', notification);
          this.handlePatientJoined(notification);
          this.lastUpdateTime = new Date();
        },
        error: (error) => console.error('Error in patient joined subscription:', error)
      });

    // Listen for patients leaving
    this.dashboardWebSocketService.patientLeft$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Patient left waiting room:', data);
          this.handlePatientLeft(data);
          this.lastUpdateTime = new Date();
        },
        error: (error) => console.error('Error in patient left subscription:', error)
      });

    // Listen for waiting room updates
    this.dashboardWebSocketService.waitingRoomUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Waiting room update:', data);
          this.handleWaitingRoomUpdate(data);
          this.lastUpdateTime = new Date();
        },
        error: (error) => console.error('Error in waiting room update subscription:', error)
      });

    // Listen for dashboard state changes
    this.dashboardWebSocketService.dashboardState$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state) => {
          console.log('Dashboard state updated:', state);
          this.isWebSocketConnected = state.isConnected;
          
          if (!state.isConnected && !this.fallbackPollingEnabled) {
            this.error = 'Real-time connection lost. Switching to fallback mode...';
            this.enableFallbackPolling();
          } else if (state.isConnected && this.fallbackPollingEnabled) {
            this.error = null;
            this.fallbackPollingEnabled = false;
            console.log('WebSocket reconnected, disabling fallback polling');
          }
        },
        error: (error) => console.error('Error in dashboard state subscription:', error)
      });
  }

  private setupFallbackPolling(): void {
    timer(0, 30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (!this.isWebSocketConnected && this.fallbackPollingEnabled) {
            return this.consultationService.getWaitingConsultations(
              this.currentPage,
              this.itemsPerPage,
              this.sortOrder
            );
          }
          return [];
        })
      )
      .subscribe({
        next: (response: WaitingRoomResponse) => {
          if (response && this.fallbackPollingEnabled) {
            console.log('Fallback polling update received');
            this.updateFromPolling(response);
          }
        },
        error: (error) => console.error('Fallback polling error:', error)
      });
  }

  private enableFallbackPolling(): void {
    this.fallbackPollingEnabled = true;
    console.log('Enabled fallback polling mode');
  }

  private updateFromPolling(response: WaitingRoomResponse): void {
    const currentIds = this.waitingRoomItems.map(item => item.id).sort();
    const newIds = response.waitingRooms.map(item => item.id).sort();
    
    if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
      this.waitingRoomData = response;
      this.waitingRoomItems = response.waitingRooms;
      this.updateQueuePositions();
      this.lastUpdateTime = new Date();
      console.log('Updated waiting room from polling');
    }
  }

  private loadWaitingRoom(): void {
    this.isLoading = true;
    this.error = null;
    
    this.consultationService.getWaitingConsultations(
      this.currentPage,
      this.itemsPerPage,
      this.sortOrder
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: WaitingRoomResponse) => {
        this.waitingRoomData = response;
        this.waitingRoomItems = response.waitingRooms;
        this.totalCount = response.totalCount || 0;
        this.totalPages = response.totalPages || 0;
        this.isLoading = false;
        this.lastUpdateTime = new Date();
        
        if (this.isWebSocketConnected) {
          this.error = null;
        }
        
        console.log(`Loaded ${this.waitingRoomItems.length} waiting room items`);
      },
      error: (error) => {
        this.error = 'Failed to load waiting room data. Please try again.';
        this.isLoading = false;
        this.waitingRoomData = null;
        this.waitingRoomItems = [];
        console.error('Error loading waiting room data:', error);
      }
    });
  }

  private handlePatientJoined(notification: WaitingRoomNotification): void {
    const existingIndex = this.waitingRoomItems.findIndex(
      item => item.id === notification.consultationId
    );

    if (existingIndex === -1) {
      const newItem: WaitingRoomItem = {
        id: notification.consultationId,
        patientInitials: notification.patientInitials,
        joinTime: new Date(notification.joinTime),
        language: notification.language || 'en',
        queuePosition: this.waitingRoomItems.length + 1,
        estimatedWaitTime: this.calculateEstimatedWaitTime(this.waitingRoomItems.length + 1)
      };

      this.waitingRoomItems.unshift(newItem);
      this.updateQueuePositions();
      this.totalCount++;

      if (this.error && this.error.includes('Real-time')) {
        this.error = null;
      }

      console.log(`Patient ${notification.patientFirstName} (${notification.patientInitials}) added to waiting room`);
    } else {
      console.log('Patient already exists in waiting room, skipping duplicate');
    }
  }

  private handlePatientLeft(data: any): void {
    const consultationId = data.consultationId || data.id;

    const index = this.waitingRoomItems.findIndex(item => item.id === consultationId);
    if (index !== -1) {
      const removedItem = this.waitingRoomItems.splice(index, 1)[0];
      this.updateQueuePositions();
      this.totalCount = Math.max(0, this.totalCount - 1);

      console.log(`Patient removed from waiting room: ${removedItem.patientInitials} (ID: ${consultationId})`);
    } else {
      console.warn(`Attempted to remove patient ${consultationId} but not found in waiting room`);
    }
  }

  private handleWaitingRoomUpdate(data: any): void {
    console.log('Handling waiting room update:', data);
    
    switch (data.type) {
      case 'refresh':
      case 'full_update':
        this.loadWaitingRoom();
        break;
      case 'position_update':
        if (data.items) {
          this.updateItemsFromServer(data.items);
        }
        break;
      default:
        if (data.refreshRequired) {
          this.loadWaitingRoom();
        }
        break;
    }
  }

  private updateItemsFromServer(serverItems: WaitingRoomItem[]): void {
    serverItems.forEach(serverItem => {
      const localIndex = this.waitingRoomItems.findIndex(item => item.id === serverItem.id);
      if (localIndex !== -1) {
        this.waitingRoomItems[localIndex] = {
          ...this.waitingRoomItems[localIndex],
          ...serverItem
        };
      }
    });
    
    this.updateQueuePositions();
  }

  private updateQueuePositions(): void {
    this.waitingRoomItems.sort((a, b) => {
      if (!a.joinTime && !b.joinTime) return 0;
      if (!a.joinTime) return 1;
      if (!b.joinTime) return -1;
      return new Date(a.joinTime).getTime() - new Date(b.joinTime).getTime();
    });

    this.waitingRoomItems.forEach((item, index) => {
      item.queuePosition = index + 1;
      item.estimatedWaitTime = this.calculateEstimatedWaitTime(index + 1);
    });
  }

  private calculateEstimatedWaitTime(position: number): string {
    const avgConsultationTime = 15;
    const waitMinutes = (position - 1) * avgConsultationTime;

    if (waitMinutes === 0) return 'Next';
    if (waitMinutes < 60) return `${waitMinutes} min`;
    
    const hours = Math.floor(waitMinutes / 60);
    const mins = waitMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  // Public methods for template
  onJoinConsultation(entry: WaitingRoomItem): void {
    if (!entry.joinTime) {
      console.warn('Cannot join consultation - patient has not joined yet');
      return;
    }
    
    console.log('Joining consultation with patient:', entry.patientInitials, 'Consultation ID:', entry.id);
    this.enterConsultation(entry.id);
  }

  async enterConsultation(consultationId: number): Promise<void> {
    try {
      await this.router.navigate(['/consultation-room', consultationId], {
        queryParams: { practitionerId: this.practitionerId }
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  onRefresh(): void {
    console.log('Manual refresh requested');
    this.loadWaitingRoom();
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page !== this.currentPage && page > 0 && 
        (!this.waitingRoomData || page <= this.waitingRoomData.totalPages)) {
      this.currentPage = page;
      this.loadWaitingRoom();
    }
  }
  
  onItemsPerPageChange(limit: number): void {
    if (limit > 0 && limit <= 100) { 
      this.itemsPerPage = limit;
      this.currentPage = 1;
      this.loadWaitingRoom();
    }
  }
  
  onSortOrderChange(order: 'asc' | 'desc'): void {
    this.sortOrder = order;
    this.currentPage = 1; 
    this.loadWaitingRoom();
  }

  // Template helper methods - consolidated and simplified
  getRelativeTime(joinTime: Date | null): string {
    if (!joinTime) return 'Unknown';

    const now = new Date();
    const joined = new Date(joinTime);
    const diffMins = Math.floor((now.getTime() - joined.getTime()) / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
  }

  getPriorityClass(joinTime: Date | null): string {
    if (!joinTime) return '';
    const diffMins = Math.floor((Date.now() - new Date(joinTime).getTime()) / 60000);
    if (diffMins > 15) return 'priority-high';
    if (diffMins > 10) return 'priority-medium';
    return 'priority-normal';
  }

  getJoinTimeFormatted(joinTime: Date | null): string {
    return joinTime ? new Date(joinTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : '--:--';
  }

  getWaitingPatientsCount(): number {
    return this.waitingRoomItems.filter(entry => entry.joinTime !== null).length;
  }
  
  getQueueStatus(entry: WaitingRoomItem): string {
    return entry.joinTime ? `Position ${entry.queuePosition} in queue` : 'Waiting to join';
  }
  
  isConsultationStale(joinTime: Date | null): boolean {
    if (!joinTime) return false;
    const diffMs = Date.now() - new Date(joinTime).getTime();
    return diffMs > 30 * 60 * 1000; // 30 minutes
  }

  getStatusMessage(): string {
    if (this.isLoading) return 'Loading waiting room data...';
    if (this.error) return this.error;
    if (this.waitingRoomItems.length === 0) return 'No patients waiting';
    
    const waitingCount = this.getWaitingPatientsCount();
    const totalCount = this.waitingRoomData?.totalCount || 0;
    
    let message = waitingCount === totalCount 
      ? `${totalCount} patient${totalCount === 1 ? '' : 's'} waiting`
      : `${waitingCount} of ${totalCount} patients actively waiting`;
    
    // Add connection status
    if (!this.isWebSocketConnected && this.fallbackPollingEnabled) {
      message += ' (offline mode)';
    } else if (this.lastUpdateTime) {
      const timeSince = Math.floor((Date.now() - this.lastUpdateTime.getTime()) / 1000);
      if (timeSince < 60) {
        message += ` • Updated ${timeSince}s ago`;
      } else {
        message += ` • Updated ${Math.floor(timeSince / 60)}m ago`;
      }
    }
    
    return message;
  }

  getConnectionStatus(): string {
    if (this.isWebSocketConnected) return 'Connected';
    if (this.fallbackPollingEnabled) return 'Offline Mode';
    return 'Connecting...';
  }

  isRealTimeActive(): boolean {
    return this.isWebSocketConnected;
  }

  reconnectWebSocket(): void {
    console.log('Attempting to reconnect WebSocket...');
    this.dashboardWebSocketService.disconnect();
    setTimeout(() => {
      this.initializeDashboardWebSocket();
    }, 1000);
  }

  trackByPatientId(index: number, item: WaitingRoomItem): number {
    return item.id;
  }

  getEstimatedWaitTime(entry: WaitingRoomItem): string {
    return entry.estimatedWaitTime || 'N/A';
  }
}
