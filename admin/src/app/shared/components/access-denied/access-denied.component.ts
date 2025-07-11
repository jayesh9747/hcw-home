import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.scss']
})
export class AccessDeniedComponent {
  @Input() errorMessage: string = '';

  constructor(private router: Router) {}
  @Output() close = new EventEmitter<void>();

  clearQueryParams() {
    this.router.navigate(['/login'], {
      queryParams: {},
      replaceUrl: true,
    }).then(() => {
      this.close.emit();  
    });
  }
  
  
  
}
