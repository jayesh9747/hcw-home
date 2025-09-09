import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDashboard } from './patient-dashboard.page';

describe('PatientDashboardPage', () => {
  let component: PatientDashboard;
  let fixture: ComponentFixture<PatientDashboard>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
