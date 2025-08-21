import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { AuthService } from './auth/auth.service';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent,MatProgressSpinnerModule,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'admin';
  private authService = inject(AuthService);
  loginChecked = computed(() => this.authService.loginChecked());
  isLoggedIn = computed(() => this.authService.isLoggedIn());
}
