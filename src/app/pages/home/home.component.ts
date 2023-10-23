import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, map, Observable, switchMap, tap } from "rxjs";
import { Protein } from '../../classes/Protein';
import { Endpoint, parseCsvToProteins, RdfService } from "../../services/rdf.service";

export interface Error {
  message: string;
  status: number;
}

@Component({
  selector : 'app-home',
  templateUrl : './home.component.html',
  styleUrls : ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  uniProtId = '';

  uniprotSearch$ = new BehaviorSubject<string>('');
  currentPage$ = new BehaviorSubject(1);
  totalItems$ = new BehaviorSubject<number>(0);
  numberOfProteins$: Observable<void> = this.uniprotSearch$.pipe(
    switchMap((uniprotSearch: string) => this.queryNumberOfProteins(uniprotSearch)),
    map((n: number) => this.totalItems$.next(n)),
  )
  itemsPerPage$ = new BehaviorSubject<number>(5);

  rdfData$ = new BehaviorSubject<Protein[] | undefined>(undefined);

  error$ = new BehaviorSubject<Error | undefined>(undefined);

  pagination$ = combineLatest([this.currentPage$, this.itemsPerPage$, this.uniprotSearch$]).pipe(
    tap(() => this.rdfData$.next(undefined)),
    switchMap(([page, itemsPerPage, uniprotSearch]) => this.queryRegistry(page, itemsPerPage, uniprotSearch)),
    tap((proteins: Protein[]) => this.rdfData$.next(proteins)),
    catchError((err) => {
      this.error$.next({
        message : err.error,
        status : err.status,
      });
      return [];
    }),
  );

  constructor(
    protected rdfService: RdfService,
  ) {
  }

  get currentPage() {
    return this.currentPage$.value;
  }

  set currentPage(page: number) {
    this.currentPage$.next(page);
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.totalItems$.value / this.itemsPerPage$.value);
    const pageNumbers: number[] = [];

    // Show up to 5 page numbers at a time, centered around the current page.
    let startPage = Math.max(1, this.currentPage$.value - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    startPage = Math.max(1, endPage - 4);

    for (let i = startPage ; i <= endPage ; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  }

  totalPages(): number {
    return Math.ceil(this.totalItems$.value / this.itemsPerPage$.value);
  }

  queryNumberOfProteins(identifier: string = ''): Observable<number> {
    const sparqlQuery = `
PREFIX schema: <https://schema.org/>

SELECT (COUNT(DISTINCT ?sequenceID) AS ?Proteins)
WHERE {
    GRAPH ?g {
        ?s a schema:Protein ;
           schema:sameAs ?sequenceID .
    }
    BIND(REPLACE(STR(?sequenceID), "^.*/", "") AS ?identifier)
    FILTER(!CONTAINS(?identifier, "-"))
    ${identifier != '' ? 'FILTER(CONTAINS(?identifier, "' + identifier + '"))' : ''}
}`;
    return this.rdfService.makeSPARQLquery(sparqlQuery).pipe(
      map(({execTime, csv}) => Number(csv.split('\n')[1])),
    );
  }

  queryRegistry(currentPage: number, itemsPerPage: number, identifier: string = '') {
    const offset = (currentPage - 1) * itemsPerPage;

    const sparqlQuery = `
PREFIX schema: <https://schema.org/>
PREFIX idp: <https://idpcentral.org/registry/>
PREFIX dc: <http://purl.org/dc/terms/>
PREFIX up: <http://purl.uniprot.org/core/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?sequenceID ?organismName ?taxonomy ?name ?source ?sourceID ?start ?end ?annotationName ?annotationCode
WHERE {
    {
        graph idp:disprot {
            ?protein schema:sameAs ?sequenceID ;
                schema:hasSequenceAnnotation ?annotationID ;
                schema:identifier ?identifier ;
                dc:title ?source .
            OPTIONAL { ?protein schema:name ?name }
        }
    } UNION {
        graph idp:mobidb {
            ?protein schema:sameAs ?sequenceID ;
                schema:hasSequenceAnnotation ?annotationID ;
                schema:identifier ?identifier ;
                dc:title ?source .
            OPTIONAL { ?protein schema:name ?name }
        }
    } UNION {
        graph idp:ped {
            ?collection a schema:CollectionPage ;
                dc:title ?source ;
                schema:mainEntity ?e ;
                schema:identifier ?identifier .
            ?e schema:itemListElement ?protein .
            ?protein schema:sameAs ?sequenceID ;
                schema:hasSequenceAnnotation ?annotationID .
            OPTIONAL { ?protein schema:name ?name }
        }
    }
    BIND(REPLACE(?identifier, "(^.+:)", "") AS ?sourceID)

    ?annotationID schema:sequenceLocation ?sequenceLocation ;
        schema:additionalProperty/schema:value ?annotation .
    ?sequenceLocation schema:rangeStart ?start ;
        schema:rangeEnd ?end .
    ?annotation schema:name ?annotationName ;
        schema:termCode ?annotationCode .

    {
        SELECT DISTINCT ?sequenceID ?organismName ?taxonomy 
        WHERE {
            {
                SELECT DISTINCT ?sequenceID
                WHERE {
                    ?protein a schema:Protein ;
                        schema:sameAs ?sequenceID .
                    BIND(REPLACE(STR(?sequenceID), "^.*/", "") AS ?identifier)
                    FILTER(!CONTAINS(?identifier, "-"))
                    ${identifier != '' ? 'FILTER(CONTAINS(?identifier,"' + identifier + '"))' : ''}
                }
                ORDER BY ?sequenceID
                OFFSET ${offset}
                LIMIT ${itemsPerPage}
            }

            SERVICE <https://sparql.uniprot.org/sparql> {
                ?sequenceID a up:Protein ;
                    up:organism ?taxonomy .
                ?taxonomy up:scientificName ?organismName .
            }
        }
    }
}`;

    return this.rdfService.makeSPARQLquery(sparqlQuery).pipe(
      map(({execTime, csv}) => parseCsvToProteins(csv)),
    );
  }

  ngOnInit(): void {
  }

  onItemsPerPageChange(event: any) {
    const newValue = event.target.value; // Get the selected value from the event
    this.itemsPerPage$.next(+newValue); // Update the BehaviorSubject
    this.currentPage$.next(1);
  }

  searchUniProt() {
    this.error$.next(undefined);
    this.totalItems$.next(0);
    this.uniprotSearch$.next(this.uniProtId);
  }

  onEndpointChange($event: Event) {
    const newValue = ($event.target as HTMLSelectElement).value;
    this.rdfService.changeSource(newValue as Endpoint);
    this.searchUniProt();
  }
}
