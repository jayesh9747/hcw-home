import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../ui/button/button.component';
import { ButtonSize, ButtonVariant } from '../../constants/button.enums';

export enum TerminationAction {
  Close = 'close',
  TerminateButKeepOpen = 'terminate_keep_open',
  StayInConsultation = 'stay'
}

@Component({
  selector: 'app-consultation-termination-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './consultation-termination-modal.component.html',
  styleUrls: ['./consultation-termination-modal.component.scss']
})
export class ConsultationTerminationModalComponent implements OnInit, OnDestroy {
  @Output() actionSelected = new EventEmitter<TerminationAction>();
  @Output() close = new EventEmitter<void>();

  readonly ButtonSize = ButtonSize;
  readonly ButtonVariant = ButtonVariant;
  readonly TerminationAction = TerminationAction;

  ngOnInit(): void {
    document.body.classList.add('modal-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  onActionSelect(action: TerminationAction): void {
    document.body.classList.remove('modal-open');
    this.actionSelected.emit(action);
  }

  onClose(): void {
    document.body.classList.remove('modal-open');
    this.close.emit();
  }
}