import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparqlComponent } from './sparql.component';

describe('SparqlComponent', () => {
  let component: SparqlComponent;
  let fixture: ComponentFixture<SparqlComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations : [SparqlComponent],
    });
    fixture = TestBed.createComponent(SparqlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
