export const RoutePaths = {
  // Main Dashboard - Primary patient entry point
  PatientDashboard: 'dashboard',
  Dashboard: 'dashboard', // Alias for backwards compatibility

  // Core User Routes
  Login: 'login',
  Profile: 'profile',

  // Consultation Flow - Essential functionality
  PostConsultationFeedback: 'post-consultation-feedback',
  WaitingRoom: 'waiting-room/:consultationId',
  ConsultationRoom: 'consultation-room/:consultationId',
  JoinConsultation: 'join-consultation',
};
