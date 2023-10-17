import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import * as tsv from 'tsv';

// Define a type for the SPARQL-Results+JSON object
export interface SparqlResultsJson {
  head: {
    vars: string[];
  };
  results: {
    bindings: {
      [key: string]: {
        datatype: string;
        type: string;
        value: string;
      }
    }
  }
}

export class Term {
  name: string;
  code: string;

  constructor(name: string, code: string) {
    this.name = name;
    this.code = code;
  }

  getUri(): string {
    if (this.code === undefined) {
      return '';
    }
    let origin = this.code.split(':')[0];

    switch (origin) {
      case 'GO':
        return `http://purl.obolibrary.org/obo/${this.code.replace(':', '_')}`;
      case 'IDPO':
        return `https://disprot.org/idpo/${this.code}`;
      default:
        return '';
    }
  }
}

export class Protein {
  uniprotUri: string;
  organismName: string;
  name: string;
  taxonomyUri: string;
  externalSources: ExternalSource[];

  constructor(
    uniprotUri: string,
    organismName: string,
    name: string,
    taxonomyUri: string,
  ) {
    this.uniprotUri = uniprotUri;
    this.organismName = organismName;
    this.name = name;
    this.taxonomyUri = taxonomyUri;
    this.externalSources = [];
  }

  addExternalSource(sourceName: string, sourceId: string): void {
    this.externalSources.push(new ExternalSource(sourceName, sourceId));
  }

  get uniprotId(): string {
    return this.uniprotUri.split('/').pop()!;
  }

  get taxonomyNumber(): string {
    return this.taxonomyUri.split('/').pop()!;
  }
}

class ExternalSource {
  sourceName: string;
  sourceId: string;
  annotations: AnnotationMap[];

  constructor(sourceName: string, sourceId: string) {
    this.sourceName = sourceName;
    this.sourceId = sourceId;
    this.annotations = [];
  }

  addAnnotation(
    start: number,
    end: number,
    annotationName: string,
    annotationCode: string,
  ): void {
    let annotation = this.annotations.find(
      (anno) => anno.start === start && anno.end === end,
    );
    if (!annotation) {
      annotation = new AnnotationMap(start, end);
      this.annotations.push(annotation);
      // Sort the annotations by start and end position
      this.annotations.sort((a, b) => {
        if (a.start === b.start) {
          return a.end - b.end;
        }
        return a.start - b.start;
      });
    }
    annotation.addTerm(annotationName, annotationCode);
  }

  getUri(): string {
    switch (this.sourceName) {
      case 'DisProt':
        return `https://disprot.org/${this.sourceId}`;
      case 'MobiDB':
        return `https://mobidb.org/${this.sourceId}`;
      case 'PED':
        return `https://ped.uniroma2.it/${this.sourceId}`;
      default:
        return '';
    }
  }
}

class AnnotationMap {
  start: number;
  end: number;
  terms: Term[];

  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
    this.terms = [];
  }

  addTerm(annotationName: string, annotationCode: string): void {
    this.terms.push(new Term(annotationName, annotationCode));
  }
}

/**
 * Convert a SPARQL-Results+JSON object to TSV (Tab-Separated Values) with data type handling.
 * @param sparqlResultsJson - The SPARQL-Results+JSON object.
 * @returns TSV string.
 */
function sparqlResultsJsonToTsv(sparqlResultsJson: SparqlResultsJson): string {
  // Ensure the input is a JSON-LD object
  if (!Array.isArray(sparqlResultsJson.results.bindings)) {
    throw new Error("Invalid input: Not a SPARQL-Results+JSON object.");
  }

  // Convert the JSON-LD to a flat array of objects
  const flatData = sparqlResultsJson.results.bindings.map((binding: any) => {
    const result: Record<string, string> = {};
    for (const key in binding) {
      const value = binding[key];
      if (value.value !== undefined) {
        // Handle data type transformations
        if (value.datatype) {
          const dataType = value.datatype;
          switch (dataType) {
            case 'http://www.w3.org/2001/XMLSchema#integer':
              result[key] = parseInt(value.value).toString();
              break;
            case 'http://www.w3.org/2001/XMLSchema#decimal':
            case 'http://www.w3.org/2001/XMLSchema#double':
              result[key] = parseFloat(value.value).toString();
              break;
            // Add more data type handling here
            default:
              result[key] = value.value;
          }
        } else {
          result[key] = value.value;
        }
      }
    }
    return result;
  });

  // Convert the flat data to TSV
  return tsv.stringify(flatData);
}


export function parseTsvToProteins(tsv: string): Protein[] {
  const lines = tsv.split('\n');
  const header = lines[0].split('\t');
  const proteinMap = new Map<string, Protein>();

  for (let i = 1 ; i < lines.length ; i++) {
    const values = lines[i].split('\t');

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
        values[2]
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
  private graphDbEndpoint = 'https://kg.biocomputingup.it/graphdb/sparql'; // Replace with your actual GraphDB SPARQL endpoint

  constructor(private http: HttpClient) {
  }

  querySparqlToTSV(sparqlQuery: string): Observable<any> {
    const headers = new HttpHeaders()
      .set('Accept', 'application/sparql-results+json')
      .set('Content-Type', 'application/x-www-form-urlencoded');

    const params = new HttpParams()
      .set('query', sparqlQuery);

    return this.http.get(this.graphDbEndpoint, {headers, params}).pipe(
      map((sparqlJson: any) => sparqlResultsJsonToTsv(sparqlJson)),
    );
  }
}
