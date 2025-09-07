import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { WaitingRoomResponse, WaitingRoomItem } from '../dtos/consultations/consultation-dashboard-response.dto';
import { ConsultationService } from '../services/consultations/consultation.service'

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss'],
  imports: [CommonModule]
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  // API response data
  waitingRoomData: WaitingRoomResponse | null = null;
  waitingRoomEntries: WaitingRoomItem[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  sortOrder: 'asc' | 'desc' = 'asc';
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private consultationService: ConsultationService,
  ) {}

  ngOnInit(): void {
    this.loadWaitingRoomData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadWaitingRoomData(): void {
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
        this.waitingRoomEntries = response.waitingRooms;
        this.isLoading = false;
        this.error = null;
      },
      error: (error) => {
        this.error = 'Failed to load waiting room data. Please try again.';
        this.isLoading = false;
        this.waitingRoomData = null;
        this.waitingRoomEntries = [];
        console.error('Error loading waiting room data:', error);
      }
    });
  }


  onJoinConsultation(entry: WaitingRoomItem): void {
    if (!entry.joinTime) {
      console.warn('Cannot join consultation - patient has not joined yet');
      return;
    }
    
    console.log('Joining consultation with patient:', entry.patientInitials, 'Consultation ID:', entry.id);
    // Implement join consultation logic

  }

  onRefresh(): void {
    this.loadWaitingRoomData();
  }
  
  // Pagination methods
  onPageChange(page: number): void {
    if (page !== this.currentPage && page > 0 && 
        (!this.waitingRoomData || page <= this.waitingRoomData.totalPages)) {
      this.currentPage = page;
      this.loadWaitingRoomData();
    }
  }
  
  onItemsPerPageChange(limit: number): void {
    if (limit > 0 && limit <= 100) { 
      this.itemsPerPage = limit;
      this.currentPage = 1; // Reset to first page
      this.loadWaitingRoomData();
    }
  }
  
  onSortOrderChange(order: 'asc' | 'desc'): void {
    this.sortOrder = order;
    this.currentPage = 1; 
    this.loadWaitingRoomData();
  }

  
  getWaitingTime(joinTime: Date | null): string {
    if (!joinTime) {
      return 'Not joined yet';
    }
    
    const now = new Date();
    const joined = new Date(joinTime);
    const diffMs = now.getTime() - joined.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'Just joined';
    } else if (diffMinutes === 1) {
      return '1 minute ago';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      return remainingMinutes > 0 
        ? `${diffHours}h ${remainingMinutes}m ago`
        : `${diffHours}h ago`;
    }
  }

  getJoinTimeFormatted(joinTime: Date | null): string {
    if (!joinTime) {
      return '--:--';
    }
    
    return new Date(joinTime).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getWaitingPatientsCount(): number {
    return this.waitingRoomEntries.filter(entry => entry.joinTime !== null).length;
  }
  
  getEstimatedWaitTime(entry: WaitingRoomItem): string {
    if (!entry.estimatedWaitTime || entry.estimatedWaitTime <= 0) {
      return 'N/A';
    }
    
    if (entry.estimatedWaitTime < 60) {
      return `${entry.estimatedWaitTime} min`;
    } else {
      const hours = Math.floor(entry.estimatedWaitTime / 60);
      const minutes = entry.estimatedWaitTime % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }
  
  getQueueStatus(entry: WaitingRoomItem): string {
    if (!entry.joinTime) {
      return 'Waiting to join';
    }
    
    return `Position ${entry.queuePosition} in queue`;
  }
  
  // Check if consulation has been waiting too lomg (based on backend 30min timeout)
  isConsultationStale(joinTime: Date | null): boolean {
    if (!joinTime) return false;
    
    const now = new Date();
    const joined = new Date(joinTime);
    const diffMs = now.getTime() - joined.getTime();
    const thirtyMinutesMs = 30 * 60 * 1000;
    
    return diffMs > thirtyMinutesMs;
  }

  
  getStatusMessage(): string {
    if (this.isLoading) {
      return 'Loading waiting room data...';
    }
    
    if (this.error) {
      return this.error;
    }
    
    if (this.waitingRoomEntries.length === 0) {
      return 'No patients waiting';
    }
    
    const waitingCount = this.getWaitingPatientsCount();
    const totalCount = this.waitingRoomData?.totalCount || 0;
    
    if (waitingCount === totalCount) {
      return `${totalCount} patient${totalCount === 1 ? '' : 's'} waiting`;
    } else {
      return `${waitingCount} of ${totalCount} patients actively waiting`;
    }
  }
}