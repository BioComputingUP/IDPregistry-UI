import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Protein } from '../classes/Protein';

export type Endpoint = 'GraphDB' | 'Virtuoso';


export function parseCsvToProteins(csv: string): Protein[] {
  const lines = csv.split('\n');
  const header = lines[0].split(',');
  const proteinMap = new Map<string, Protein>();

  for (let i = 1 ; i < lines.length ; i++) {
    const values = lines[i].split(',');

    if (values.length !== header.length) {
      console.error('Invalid TSV data at line', i + 1);
      continue;
    }

    const uniprotUri = values[0];
    const sourceId = values[5];

    if (!proteinMap.has(uniprotUri)) {
      const protein = new Protein(
        uniprotUri,
        values[1],
        values[3],
        values[2],
      );
      proteinMap.set(uniprotUri, protein);
    }

    const protein = proteinMap.get(uniprotUri);
    let source = protein!.externalSources.find((src) => src.sourceId === sourceId);

    if (!source) {
      protein!.addExternalSource(values[4], sourceId);
      source = protein!.externalSources[protein!.externalSources.length - 1];
    }

    source.addAnnotation(
      parseInt(values[6]),
      parseInt(values[7]),
      values[8],
      values[9],
    );
  }

  return Array.from(proteinMap.values());
}


@Injectable({
  providedIn : 'root',
})
export class RdfService {
  private availableSources = {
    'GraphDB' : 'https://registry.idpcentral.org/graphdb/sparql',
    'Virtuoso' : 'https://registry.idpcentral.org/virtuoso/sparql',
    // 'GraphDB': 'https://kg.biocomputingup.it/graphdb/IDPregistry/sparql',
    // 'Virtuoso': 'https://kg.biocomputingup.it/virtuoso/sparql',
  };

  private sparqlEndpoint = this.availableSources['GraphDB']; // Replace with your actual GraphDB SPARQL endpoint

  constructor(private http: HttpClient) {
  }

  get currentSource(): Endpoint {
    return Object.keys(this.availableSources).find((key) => this.availableSources[key as Endpoint] === this.sparqlEndpoint) as Endpoint;
  }

  querySparqlToCuRL(sparqlQuery: string): string {
    return `curl --get -H "Accept: text/csv" --data-urlencode "query=\n${sparqlQuery}\n" ${this.sparqlEndpoint}`;
  }

  makeSPARQLquery(sparqlQuery: string): Observable<{ execTime: number, csv: string }> {
    const headers = new HttpHeaders()
      .set('Accept', 'text/csv')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const params = new HttpParams()
      .set('query', sparqlQuery);

    let startTime = new Date().getTime();

    return this.http.get(this.sparqlEndpoint, {responseType : 'text', headers, params}).pipe(
      map((csv: any) => {
        let execTime = new Date().getTime() - startTime;
        csv = csv.replace(/\"/g, '');
        // Remove last line (empty)
        csv = csv.substring(0, csv.lastIndexOf('\n'));
        return {execTime, csv};
      }),
    );
  }

  changeSource(source: Endpoint): void {
    this.sparqlEndpoint = this.availableSources[source];
  }
}
