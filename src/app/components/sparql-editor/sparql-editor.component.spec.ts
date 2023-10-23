import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SparqlEditorComponent } from './sparql-editor.component';

describe('SparqlEditorComponent', () => {
  let component: SparqlEditorComponent;
  let fixture: ComponentFixture<SparqlEditorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations : [SparqlEditorComponent],
    });
    fixture = TestBed.createComponent(SparqlEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
