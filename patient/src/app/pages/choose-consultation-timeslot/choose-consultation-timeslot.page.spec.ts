import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChooseConsultationTimeslotPage } from './choose-consultation-timeslot.page';

describe('ChooseConsultationTimeslotPage', () => {
  let component: ChooseConsultationTimeslotPage;
  let fixture: ComponentFixture<ChooseConsultationTimeslotPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChooseConsultationTimeslotPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
