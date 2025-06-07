import type { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AppComponent } from './app.component';
import { RoutePaths } from './constants/route-paths.enum';
import { ClosedConsultationsComponent } from './closed-consultations/closed-consultations.component';
import { WaitingRoomComponent } from './waiting-room/waiting-room.component';
import { OpenConsultationsComponent } from './open-consultations/open-consultations.component';
import { InvitesComponent } from './invites/invites.component';

export const routes: Routes = [
  { path: '', redirectTo: RoutePaths.Dashboard, pathMatch: 'full' },
  { path: RoutePaths.Dashboard, component: DashboardComponent },
  { path: RoutePaths.WaitingRoom, component: WaitingRoomComponent },
  { path: RoutePaths.OpenConsultations, component: OpenConsultationsComponent },
  { path: RoutePaths.ClosedConsultations, component: ClosedConsultationsComponent },
  { path: RoutePaths.Invitations, component: InvitesComponent },
  { path: RoutePaths.Test, component: DashboardComponent },
];


