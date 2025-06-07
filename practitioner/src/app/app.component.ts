import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { RoutePaths } from './constants/route-paths.enum';
import { BadgeComponent } from './badge/badge.component';

interface SidebarItem {
  icon: string
  label: string
  route: string
  badge?: number
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    BadgeComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'practitioner';
  RoutePaths = RoutePaths
  isMobile = false;
  isSidebarOpen = true;
  isSidebarVisible = true;
  markdownUrl = '@';
  pendingConsultations: number | undefined = 5;
  activeConsultations: number | undefined = 0;
  markdownExists = true;
  showFooter = true;
  navigated = true;
  isLoggedIn = true;

  sidebarItems: SidebarItem[] = [
    { icon: "icon-dashboard.svg", label: "Dashboard", route: "/dashboard" },
    { icon: "icon-queue.svg", label: "Waiting Room", route: "/waiting-room", badge: this.pendingConsultations},
    { icon: "icon-open.svg", label: "Opened Consultations", route: "/open-consultations", badge: this.activeConsultations},
    { icon: "icon-history.svg", label: "Consultation history", route: "/closed-consultations" },
    { icon: "icon-invite.svg", label: "Invites", route: "/invites" },
    { icon: "self-check.svg", label: "Test", route: "/test" },
  ]
  ngOnInit() {
    this.checkMobileView();
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
