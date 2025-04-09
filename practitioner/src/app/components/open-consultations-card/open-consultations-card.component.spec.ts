import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenConsultationsCardComponent } from './open-consultations-card.component';

describe('OpenConsultationsCardComponent', () => {
  let component: OpenConsultationsCardComponent;
  let fixture: ComponentFixture<OpenConsultationsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenConsultationsCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenConsultationsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
