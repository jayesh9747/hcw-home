import { Component, OnInit } from '@angular/core';
import { ExportService } from '../services/export.service';
import { UserService } from '../services/user.service';
import { saveAs } from 'file-saver-es';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../models/user.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SnackbarService } from '../services/snackbar.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  filters: any = {};
  practitioners: any[] = [];
  statuses: string[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  loading: boolean = false;
  
  constructor(
    private exportService: ExportService,
    private snackBarService: SnackbarService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadPractitioners();
  }

  loadPractitioners() {
    this.userService.getUsers(1, 50, '', UserRole.PRACTITIONER).subscribe({
      next: (response) => {
        this.practitioners = response.users;
      },
      error: () => {
        this.snackBarService.showError('Failed to load practitioners');
      }
    });
  }

  exportCsv() {
    this.loading = true;
    this.exportService.exportConsultations(this.filters).subscribe({
      next: (csvData) => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `consultations_${new Date().toISOString().split('T')[0]}.csv`);
        this.snackBarService.showSuccess('Consultations exported successfully');
        this.loading = false;
      },
      error: () => {
        this.snackBarService.showError('Export failed');
        this.loading = false;
      }
    });
  }

  resetForm() {
    this.filters = {};
    this.snackBarService.showSuccess('Filters reset');
  }
}
