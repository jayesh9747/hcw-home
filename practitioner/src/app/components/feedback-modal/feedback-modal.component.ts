import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackComponent, ConsultationSummary, FeedbackData } from '../feedback/feedback.component';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FeedbackComponent],
  templateUrl: './feedback-modal.component.html',
  styleUrls: ['./feedback-modal.component.scss']
})
export class FeedbackModalComponent implements OnInit, OnDestroy {
  @Input() consultationSummary!: ConsultationSummary;
  @Output() feedbackSubmit = new EventEmitter<FeedbackData>();
  @Output() close = new EventEmitter<void>();

  ngOnInit(): void {
    document.body.classList.add('modal-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  onFeedbackSubmit(feedbackData: FeedbackData): void {
    document.body.classList.remove('modal-open');
    this.feedbackSubmit.emit(feedbackData);
  }

  onClose(): void {
    document.body.classList.remove('modal-open');
    this.close.emit();
  }
}