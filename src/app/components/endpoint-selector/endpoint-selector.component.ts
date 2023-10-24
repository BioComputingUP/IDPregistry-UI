import { Component, EventEmitter, Output } from '@angular/core';
import { Endpoint, RdfService } from '../../services/rdf.service';

@Component({
  selector : 'app-endpoint-selector',
  template: `
    <div class="d-flex align-items-center justify-content-end">
      <span class="me-2" style="min-width: fit-content">Endpoint</span>
      <select (change)="onEndpointChange($event)"
              [ngClass]="rdfService.currentSource == 'GraphDB' ? 'graphdb' : 'virtuoso'" class="form-select"
              id="test" style="max-width: 88px">
        <option value="GraphDB">GraphDB</option>
        <option value="Virtuoso">Virtuoso</option>
        <!-- Add more options as needed -->
      </select>
    </div>`,
  styleUrls : ['./endpoint-selector.component.scss'],
})
export class EndpointSelectorComponent {
  @Output()
  endpointChange$ = new EventEmitter<boolean>();

  constructor(
    protected rdfService: RdfService,
  ) {
  }

  onEndpointChange($event: any) {
    const newValue = ($event.target as HTMLSelectElement).value;
    this.rdfService.changeSource(newValue as Endpoint);
    this.endpointChange$.emit(true);
  }


}
