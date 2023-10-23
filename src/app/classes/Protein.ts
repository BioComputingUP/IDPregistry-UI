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

  get uniprotId(): string {
    return this.uniprotUri.split('/').pop()!;
  }

  get taxonomyNumber(): string {
    return this.taxonomyUri.split('/').pop()!;
  }

  addExternalSource(sourceName: string, sourceId: string): void {
    this.externalSources.push(new ExternalSource(sourceName, sourceId));
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
