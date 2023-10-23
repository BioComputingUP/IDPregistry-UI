import { Component, Input } from '@angular/core';
import { Protein, Term } from '../../classes/Protein';

@Component({
  selector : 'app-protein-row',
  templateUrl : './protein-row.component.html',
  styleUrls : ['./protein-row.component.scss'],
})
export class ProteinRowComponent {
  @Input()
  protein!: Protein;

  constructor() {
  }

  asTerm(term: any): Term {
    return <Term>term;
  }

}
