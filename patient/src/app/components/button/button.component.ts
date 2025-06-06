import { Component, Input } from '@angular/core';
import {IonButton} from '@ionic/angular/standalone'
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  imports: [IonButton, NgClass],
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'danger' = 'primary';
  @Input() size: 'btn-small' | 'btn-medium' | 'btn-large' | 'full-width' = 'btn-medium';
  @Input() disabled: boolean = false;
  @Input() width: string = '';
  @Input() height: string = '';
  @Input() fontSize: string = '';
}
