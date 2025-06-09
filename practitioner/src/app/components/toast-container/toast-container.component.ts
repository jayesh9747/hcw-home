// src/app/components/toast-container/toast-container.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div class="toast" *ngFor="let msg of toast.messages$ | async">
        {{ msg }}
      </div>
    </div>
  `,
  styleUrls: ['./toast-container.component.scss'],
})
export class ToastContainerComponent {
  constructor(public toast: ToastService) {}
}
