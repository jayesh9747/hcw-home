import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning'
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  timestamp: Date;
}

const DEFAULT_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4500
} as const;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _messages = new BehaviorSubject<ToastMessage[]>([]);
  readonly messages$ = this._messages.asObservable();

  show(message: string, durationMs: number = DEFAULT_DURATION.INFO, type: ToastType = ToastType.INFO): void {
    const toastMessage: ToastMessage = {
      id: this.generateId(),
      message,
      type,
      timestamp: new Date()
    };

    const current = this._messages.getValue();
    this._messages.next([...current, toastMessage]);

    setTimeout(() => {
      this.removeMessage(toastMessage.id);
    }, durationMs);
  }

  showSuccess(message: string, duration?: number): void {
    this.show(message, duration ?? DEFAULT_DURATION.SUCCESS, ToastType.SUCCESS);
  }

  showError(message: string, duration?: number): void {
    this.show(message, duration ?? DEFAULT_DURATION.ERROR, ToastType.ERROR);
  }

  showWarning(message: string, duration?: number): void {
    this.show(message, duration ?? DEFAULT_DURATION.WARNING, ToastType.WARNING);
  }

  removeMessage(id: string): void {
    const current = this._messages.getValue();
    const filtered = current.filter(msg => msg.id !== id);
    this._messages.next(filtered);
  }

  clearAll(): void {
    this._messages.next([]);
  }

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}