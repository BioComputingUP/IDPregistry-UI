import { Component, Input } from '@angular/core';

@Component({
  selector : 'app-sparql-results',
  templateUrl : './sparql-results.component.html',
  styleUrls : ['./sparql-results.component.scss'],
})
export class SparqlResultsComponent {

  @Input()
  sparqlResults!: string[][];
}
