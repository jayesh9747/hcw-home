import { ConsultationService } from '../services/consultation.service';
import { Consultation } from './consultation.model';

describe('Consultation', () => {
  it('should create an instance', () => {
    expect(new ConsultationService()).toBeTruthy();
  });
});
