import { Component, Input, HostListener, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { SidebarItem } from '../../../models/sidebar';
import { BadgeComponent } from '../../../badge/badge.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    MatBadgeModule,
    BadgeComponent,
  ],
})
export class SidebarComponent {
  isLoggedIn = input<boolean>(true);
  pendingConsultations = input<number | undefined>(0);
  activeConsultations = input<number | undefined>(0);

  isMobile = false;
  isSidebarOpen = true;
  isSidebarVisible = true;
  sidebarItems: SidebarItem[] = [];

  ngOnInit() {
    this.checkMobileView();

    this.sidebarItems = [
      { icon: 'icon-dashboard.svg', label: 'Dashboard', route: '/dashboard' },
      {
        icon: 'icon-queue.svg',
        label: 'Waiting Room',
        route: '/waiting-room',
        badge: this.pendingConsultations(),
      },
      {
        icon: 'icon-open.svg',
        label: 'Opened Consultations',
        route: '/open-consultations',
        badge: this.activeConsultations(),
      },
      {
        icon: 'icon-history.svg',
        label: 'Consultation history',
        route: '/closed-consultations',
      },
      { icon: 'icon-invite.svg', label: 'Invites', route: '/invites' },
      { icon: 'self-check.svg', label: 'Test', route: '/test' },
    ];
  }

  @HostListener('window:resize', [])
  checkMobileView() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar() {
    if (this.isMobile) {
      this.isSidebarOpen = !this.isSidebarOpen;
    } else {
      this.isSidebarVisible = !this.isSidebarVisible;
    }
  }

  closeSidebarOnMobile() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }
  }
}
