import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProteinRowComponent } from './protein-row.component';

describe('ProteinRowComponent', () => {
  let component: ProteinRowComponent;
  let fixture: ComponentFixture<ProteinRowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations : [ProteinRowComponent],
    });
    fixture = TestBed.createComponent(ProteinRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
