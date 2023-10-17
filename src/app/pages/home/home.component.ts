import { AfterViewInit, Component, OnInit } from '@angular/core';
import { BehaviorSubject, combineLatest, concat, delay, map, merge, Observable, startWith, switchMap, tap } from "rxjs";
import { parseTsvToProteins, Protein, RdfService } from "../../services/rdf.service";

@Component({
  selector : 'app-home',
  templateUrl : './home.component.html',
  styleUrls : ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  uniProtId = '';

  uniprotSearch$ = new BehaviorSubject<string>('');

  numberOfProteins$: Observable<void> = this.uniprotSearch$.pipe(
    switchMap((uniprotSearch: string) => this.queryNumberOfProteins(uniprotSearch)),
    map((n: number) => this.totalItems$.next(n))
  )

  currentPage$ = new BehaviorSubject(1);
  totalItems$ = new BehaviorSubject<number>(0);
  itemsPerPage$ = new BehaviorSubject<number>(5);

  rdfData$ = new BehaviorSubject<Protein[] | undefined>(undefined);

  pagination$ = combineLatest([this.currentPage$, this.itemsPerPage$, this.uniprotSearch$]).pipe(
    tap(() => this.rdfData$.next(undefined)),
    switchMap(([page, itemsPerPage, uniprotSearch]) => this.queryRegistry(page, itemsPerPage, uniprotSearch)),
    tap((proteins: Protein[]) => this.rdfData$.next(proteins)),
  );

  constructor(
    private rdfService: RdfService,
  ) {
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

  searchRDFData() {
    const sparqlQuery = `
PREFIX schema: <https://schema.org/>

SELECT ?graph (COUNT(DISTINCT ?s) AS ?Proteins) 
WHERE {
    GRAPH ?graph {
        ?s a schema:Protein 
    }
} 
GROUP BY ?graph`;
    return this.rdfService.querySparqlToTSV(sparqlQuery);
  }

  numberOfUniProtProteins() {
    const sparqlQuery = `
PREFIX schema: <https://schema.org/>
SELECT (COUNT(DISTINCT ?identifier) AS ?UniProt)
WHERE {
    ?protein a schema:Protein ;
       schema:sameAs ?identifier .
}`;
    return this.rdfService.querySparqlToTSV(sparqlQuery);
  }

  proteinInGraph() {
    const sparqlQuery = `
PREFIX schema: <https://schema.org/>
PREFIX idp: <https://idpcentral.org/registry/>
SELECT ?UniProt (MAX(?mobidb) as ?MobiDB) (MAX(?ped) as ?PED) (MAX(?disprot) as ?Disprot)
WHERE {
    {
        SELECT ?UniProt ?mobidb ?ped ?disprot
        WHERE {
            GRAPH ?g {
                ?x schema:sameAs ?UniProt .
            }
            BIND((?g = idp:ped) AS ?ped)
            BIND((?g = idp:disprot) AS ?disprot)
            BIND((?g = idp:mobidb) AS ?mobidb)
            {
                SELECT DISTINCT ?UniProt
                WHERE {
                    ?protein a schema:Protein ;
                             schema:sameAs ?UniProt .
                }
            }
        }
    }
}
GROUP BY ?UniProt`;
    return this.rdfService.querySparqlToTSV(sparqlQuery);
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
    ${identifier != '' ? 'FILTER(CONTAINS(REPLACE(STR(?sequenceID), "^.*/", ""),"' + identifier +'"))' : ''}
}`;
    return this.rdfService.querySparqlToTSV(sparqlQuery).pipe(
      map((tsvData: string) => Number(tsvData.split('\n')[1])),
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
                schema:name ?name ;
                schema:identifier ?identifier ;
                dc:title ?source .
        }
    } UNION {
        graph idp:mobidb {
            ?protein schema:sameAs ?sequenceID ;
                schema:hasSequenceAnnotation ?annotationID ;
                schema:name ?name ;
                schema:identifier ?identifier ;
                dc:title ?source .
        }
    } UNION {
        graph idp:ped {
            ?collection a schema:CollectionPage ;
                dc:title ?source ;
                schema:mainEntity ?e ;
                schema:identifier ?identifier .
            ?e schema:itemListElement ?protein .
            ?protein schema:sameAs ?sequenceID ;
                schema:name ?name ;
                schema:hasSequenceAnnotation ?annotationID .
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
                    ${identifier != '' ? 'FILTER(CONTAINS(REPLACE(STR(?sequenceID), "^.*/", ""),"' + identifier +'"))' : ''}
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

    return this.rdfService.querySparqlToTSV(sparqlQuery).pipe(
      map((tsvData: any) => parseTsvToProteins(tsvData)),
    );
  }

  ngOnInit(): void {
  }

  get currentPage() {
    return this.currentPage$.value;
  }

  set currentPage(page: number) {
    this.currentPage$.next(page);
  }

  onItemsPerPageChange(event: any) {
    const newValue = event.target.value; // Get the selected value from the event
    this.itemsPerPage$.next(+newValue); // Update the BehaviorSubject
  }

  searchUniProt() {
    this.uniprotSearch$.next(this.uniProtId);
  }
}
