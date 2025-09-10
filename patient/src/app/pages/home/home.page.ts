import { Component } from '@angular/core';
import { HeaderComponent } from 'src/app/components/header/header.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    HeaderComponent
  ],
})
export class HomePage {
  title = 'Welcome to Healthcare';
  
  quickActions = [
    { icon: 'calendar-outline', title: 'Book Appointment', route: '/appointments' },
    { icon: 'medical-outline', title: 'Medical Records', route: '/records' },
    { icon: 'call-outline', title: 'Emergency Contact', route: '/emergency' },
    { icon: 'person-outline', title: 'Profile', route: '/profile' }
  ];

  // Recent activities or notifications
  recentActivities = [
    { message: 'Appointment reminder: Dr. Smith tomorrow at 2:00 PM', date: new Date() },
    { message: 'Lab results are ready for review', date: new Date() }
  ];
}
