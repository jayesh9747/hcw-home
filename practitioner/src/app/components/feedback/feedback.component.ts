import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../ui/button/button.component';
import { ButtonVariant, ButtonSize, ButtonType } from '../../constants/button.enums';

export interface ConsultationSummary {
  patientName: string;
  sex: string;
  startDateTime: string;
  endDateTime: string;
  duration: string;
}

export interface FeedbackData {
  satisfaction: 'satisfied' | 'neutral' | 'dissatisfied' | null;
  comment: string;
}

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent {
  @Input() consultationSummary: ConsultationSummary = {
    patientName: 'Vaibhav SAHU',
    sex: 'Male',
    startDateTime: '13 Apr 2025 22:54',
    endDateTime: '13 Apr 2025 22:55',
    duration: '4 minutes 4 seconds'
  };

  @Output() feedbackSubmit = new EventEmitter<FeedbackData>();
  @Output() feedbackClose = new EventEmitter<void>();

  feedback: FeedbackData = {
    satisfaction: null,
    comment: ''
  };

  readonly ButtonVariant = ButtonVariant;
  readonly ButtonSize = ButtonSize;
  readonly ButtonType = ButtonType;

  selectSatisfaction(satisfaction: 'satisfied' | 'neutral' | 'dissatisfied') {
    this.feedback.satisfaction = satisfaction;
  }

  onSubmit() {
    this.feedbackSubmit.emit({ ...this.feedback });
  }

  onClose() {
    this.feedbackClose.emit();
  }

  getSatisfactionIcon(type: 'satisfied' | 'neutral' | 'dissatisfied'): string {
    const icons = {
      satisfied: '😊',
      neutral: '😐',
      dissatisfied: '☹️'
    };
    return icons[type];
  }

  isSelected(satisfaction: 'satisfied' | 'neutral' | 'dissatisfied'): boolean {
    return this.feedback.satisfaction === satisfaction;
  }
}