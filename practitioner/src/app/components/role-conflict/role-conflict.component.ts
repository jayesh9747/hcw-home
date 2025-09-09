import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
 selector: 'app-role-conflict',
 standalone: true,
 imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
 template: `
    <div class="role-conflict-container">
      <mat-card class="conflict-card">
        <mat-card-header>
          <div mat-card-avatar>
            <mat-icon color="warn">warning</mat-icon>
          </div>
          <mat-card-title>Role Access Conflict</mat-card-title>
          <mat-card-subtitle>Your account has conflicting access permissions</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="conflict-message">
            <p><strong>Issue:</strong> Your account is registered with multiple roles that conflict with practitioner access.</p>
            
            <div class="conflict-details">
              <h4>Common causes:</h4>
              <ul>
                <li>Account registered as both PATIENT and PRACTITIONER</li>
                <li>Role permissions changed during account migration</li>
                <li>Duplicate account registration with different roles</li>
                <li>Administrative role assignment conflicts</li>
              </ul>
            </div>
            
            <div class="resolution-steps">
              <h4>Resolution steps:</h4>
              <ol>
                <li>Contact your system administrator</li>
                <li>Provide your email address and account details</li>
                <li>Request role conflict resolution</li>
                <li>Wait for account role clarification</li>
              </ol>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-actions align="end">
          <button mat-button (click)="contactSupport()">
            <mat-icon>email</mat-icon>
            Contact Support
          </button>
          <button mat-raised-button color="primary" (click)="backToLogin()">
            <mat-icon>arrow_back</mat-icon>
            Back to Login
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
 styles: [`
    .role-conflict-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .conflict-card {
      max-width: 600px;
      width: 100%;
    }
    
    .conflict-message {
      margin: 16px 0;
    }
    
    .conflict-details, .resolution-steps {
      margin: 16px 0;
      padding: 12px;
      background-color: #fff8e1;
      border-radius: 4px;
      border-left: 4px solid #ff9800;
    }
    
    .conflict-details h4, .resolution-steps h4 {
      margin-top: 0;
      color: #f57c00;
    }
    
    .conflict-details ul, .resolution-steps ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .conflict-details li, .resolution-steps li {
      margin: 4px 0;
    }
    
    mat-card-actions button {
      margin: 0 8px;
    }
  `]
})
export class RoleConflictComponent {
 constructor(private router: Router) { }

 contactSupport(): void {
  window.location.href = 'mailto:support@healthcareapp.com?subject=Role Access Conflict - Practitioner Account&body=Hello,%0D%0A%0D%0AI am experiencing a role access conflict with my practitioner account. Please help resolve this issue.%0D%0A%0D%0AAccount Details:%0D%0A- Email: [Your Email]%0D%0A- Role: Practitioner%0D%0A- Issue: Role conflict preventing login%0D%0A%0D%0AThank you for your assistance.';
 }

 backToLogin(): void {
  this.router.navigate(['/login']);
 }
}
