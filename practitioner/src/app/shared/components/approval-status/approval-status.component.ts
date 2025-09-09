import { Component, Input } from '@angular/core';

export interface ApprovalStatus {
 status: 'NOT_APPROVED' | 'APPROVED' | 'REJECTED';
 message?: string;
 timestamp?: Date;
}

@Component({
 selector: 'app-approval-status',
 template: `
    <div class="approval-status-container" [ngClass]="'status-' + status.status.toLowerCase()">
      <div class="status-icon">
        <ion-icon 
          [name]="getStatusIcon()" 
          [color]="getStatusColor()">
        </ion-icon>
      </div>
      <div class="status-content">
        <h3>{{ getStatusTitle() }}</h3>
        <p>{{ status.message || getDefaultMessage() }}</p>
        <div class="status-actions" *ngIf="status.status === 'NOT_APPROVED'">
          <ion-button 
            fill="outline" 
            size="small" 
            (click)="contactSupport()">
            Contact Support
          </ion-button>
          <ion-button 
            fill="clear" 
            size="small" 
            (click)="refreshStatus()">
            Refresh Status
          </ion-button>
        </div>
      </div>
    </div>
  `,
 styles: [`
    .approval-status-container {
      display: flex;
      align-items: center;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      border: 1px solid;
    }
    
    .status-not_approved {
      background-color: #fff3cd;
      border-color: #ffeaa7;
      color: #856404;
    }
    
    .status-rejected {
      background-color: #f8d7da;
      border-color: #f5c6cb;
      color: #721c24;
    }
    
    .status-approved {
      background-color: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
    }
    
    .status-icon {
      margin-right: 12px;
      font-size: 24px;
    }
    
    .status-content {
      flex: 1;
    }
    
    .status-content h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .status-content p {
      margin: 0 0 12px 0;
      line-height: 1.4;
    }
    
    .status-actions {
      display: flex;
      gap: 8px;
    }
  `]
})
export class ApprovalStatusComponent {
 @Input() status!: ApprovalStatus;

 getStatusIcon(): string {
  switch (this.status.status) {
   case 'NOT_APPROVED':
    return 'time-outline';
   case 'REJECTED':
    return 'close-circle-outline';
   case 'APPROVED':
    return 'checkmark-circle-outline';
   default:
    return 'help-circle-outline';
  }
 }

 getStatusColor(): string {
  switch (this.status.status) {
   case 'NOT_APPROVED':
    return 'warning';
   case 'REJECTED':
    return 'danger';
   case 'APPROVED':
    return 'success';
   default:
    return 'medium';
  }
 }

 getStatusTitle(): string {
  switch (this.status.status) {
   case 'NOT_APPROVED':
    return 'Account Pending Approval';
   case 'REJECTED':
    return 'Account Access Denied';
   case 'APPROVED':
    return 'Account Approved';
   default:
    return 'Account Status Unknown';
  }
 }

 getDefaultMessage(): string {
  switch (this.status.status) {
   case 'NOT_APPROVED':
    return 'Your account is currently under review. You will receive an email notification once your account has been approved by an administrator.';
   case 'REJECTED':
    return 'Your account access has been denied. Please contact support for more information.';
   case 'APPROVED':
    return 'Your account is active and ready to use.';
   default:
    return 'Unable to determine account status. Please try again later.';
  }
 }

 contactSupport(): void {
  window.location.href = 'mailto:support@hcw-home.com?subject=Account Approval Request';
 }

 refreshStatus(): void {
  window.location.reload();
 }
}
