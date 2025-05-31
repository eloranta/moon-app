import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoonCalculator } from './moon-calculator';

describe('MoonCalculator', () => {
  let component: MoonCalculator;
  let fixture: ComponentFixture<MoonCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoonCalculator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoonCalculator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
