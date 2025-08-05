import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home.page';
import { ConsultationRequestPage } from './pages/consultation-request/consultation-request.page';
import { PatientDashboard } from './pages/patient-dashboard/patient-dashboard.page';
import { PostConsultationFeedbackPage } from './pages/post-consultation-feedback/post-consultation-feedback.page';
import { ChooseConsultationTimeslotPage } from './pages/choose-consultation-timeslot/choose-consultation-timeslot.page';
import { LoginPage } from './pages/login/login.page';
import { routePaths } from './constants/route-path.enum';

export const routes: Routes = [
  {
    path: routePaths.home,
    component: HomePage,
  },
  {
    path: '',
    redirectTo: routePaths.home,
    pathMatch: 'full',
  },
  {
    path: routePaths.consultationRequest,
    component: ConsultationRequestPage,
  },
  {
    path: routePaths.patientDashboard,
    component: PatientDashboard,
  },
  {
    path: routePaths.postConsultationFeedback,
    component: PostConsultationFeedbackPage,
  },
  {
    path: routePaths.chooseConsultationTimeslot,
    component: ChooseConsultationTimeslotPage,
  },
  {
    path: routePaths.login,
    component: LoginPage,
  },
];
