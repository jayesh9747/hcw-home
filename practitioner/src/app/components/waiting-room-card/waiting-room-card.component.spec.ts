import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitingRoomCardComponent } from './waiting-room-card.component';

describe('WaitingRoomCardComponent', () => {
  let component: WaitingRoomCardComponent;
  let fixture: ComponentFixture<WaitingRoomCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaitingRoomCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaitingRoomCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
