import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlLotComponent } from './control-lot.component';

describe('ControlLotComponent', () => {
  let component: ControlLotComponent;
  let fixture: ComponentFixture<ControlLotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlLotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlLotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
