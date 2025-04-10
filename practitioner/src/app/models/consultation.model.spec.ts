import { ConsultationService } from '../services/consultation.service';

describe('Consultation', () => {
  it('should create an instance', () => {
    expect(new ConsultationService()).toBeTruthy();
  });
});
