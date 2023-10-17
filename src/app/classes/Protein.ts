class SequenceRange {
  constructor(
    public start: string,
    public end: string,
    public annotationName: string,
    public annotationCode: string
  ) {}
}

export class ExternalSource {
  constructor(
    public name: string,
    public sourceID: string,
    public sequenceRanges: SequenceRange[]
  ) {}
}

export class Protein {
  constructor(
    public sequenceID: string,
    public organismName: string,
    public name: string,
    public sources: ExternalSource[]
  ) {}

  static fromJSON(data: any): Protein {
    const sequenceID = data.sequenceID.value;
    const organismName = data.organismName.value;
    const name = data.name.value;
    const sourceID = data.sourceID.value;
    const sourceName = data.source.value;
    const start = data.start.value;
    const end = data.end.value;
    const annotationName = data.annotationName.value;
    const annotationCode = data.annotationCode.value;

    const protein = new Protein(sequenceID, organismName, name, []);
    let source = protein.sources.find((source) => source.sourceID === sourceID);
    if (!source) {
      source = new ExternalSource(sourceID, sourceName, []);
      protein.sources.push(source);
    }
    source.sequenceRanges.push(new SequenceRange(start, end, annotationName, annotationCode));

    return protein;
  }
}
