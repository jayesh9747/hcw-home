export interface Consultation {
  id: string;
  patientName: string;
  joinTime: Date;
  status: 'waiting' | 'active' | 'completed';
}
