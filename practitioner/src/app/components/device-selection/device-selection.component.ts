import { Component, Input, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MediaDevice {
  deviceId: string;
  label?: string;
}

@Component({
  selector: 'app-device-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-selection.component.html',
  styleUrls: ['./device-selection.component.scss'],
})
export class DeviceSelectionComponent {
  devices = input<MediaDevice[]>([]);
  selectedDeviceId = input<string>();
  @Output() deviceChange = new EventEmitter<string>();

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.deviceChange.emit(select.value);
  }
}
