import { Component, Input, HostListener, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { SidebarItem } from '../../../models/sidebar.model';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RoutePaths } from '../../../constants/route-path.enum';
import { AuthService } from '../../../auth/auth.service';
import { LoginUser } from '../../../models/user.model';
import { MatMenuModule } from '@angular/material/menu';

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
    AngularSvgIconModule,
    MatMenuModule
  ]
})
export class SidebarComponent {
  @Input() isLoggedIn: boolean = true;
  private authService = inject(AuthService);

  isMobile = false;
  isSidebarOpen = true;
  isSidebarVisible = true;
  sidebarItems: SidebarItem[] = [];
  currentUser: LoginUser | null = null;


  ngOnInit() {
    this.checkMobileView();
    this.currentUser=this.authService.getCurrentUser()

    
    this.sidebarItems = [
      { icon: "icon-dashboard.svg", label: "Dashboard", route: RoutePaths.Dashboard },
      { icon: "icon-user.svg", label: "Users", route: RoutePaths.Users },
      { icon: "icon-user.svg", label: "Resource Management", route: RoutePaths.ResourceManager },
      { icon: "icon-term.svg", label: 'Terms', route: RoutePaths.Terms },
      { icon: "icon-queue.svg", label: "Availability Management", route: RoutePaths.Availability },
      { icon: "icon-queue.svg", label: "Waiting Queues", route: "/queue" },
      { icon: "server.svg", label: "Mediasoup", route: "/mediasoup" },
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
  
  showDropdown=false
  logout(){
    this.authService.logout()
  }
}