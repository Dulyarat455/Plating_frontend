import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterPalletComponent } from './master-pallet.component';

describe('MasterPalletComponent', () => {
  let component: MasterPalletComponent;
  let fixture: ComponentFixture<MasterPalletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterPalletComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterPalletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
