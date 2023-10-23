import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  Completion,
  CompletionContext,
  completionKeymap,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxTree } from "@codemirror/language";
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view"
import { githubLight } from '@uiw/codemirror-theme-github';
import { sparql, SparqlLanguage } from "codemirror-lang-sparql"
import { BehaviorSubject, catchError, filter, map, Observable, of, tap } from 'rxjs';
import { Error } from '../../pages/home/home.component';
import { RdfService } from '../../services/rdf.service';
import { ThemeHandlerService } from '../../services/theme-handler.service';

@Component({
  selector : 'app-sparql-editor',
  templateUrl : './sparql-editor.component.html',
  styleUrls : ['./sparql-editor.component.scss'],
})
export class SparqlEditorComponent implements AfterViewInit, OnChanges {
  @ViewChild('sparqlEditor') sparqlEditor!: ElementRef;

  rdfData$: Observable<string[][]> | undefined;

  @Output()
  tsvData$ = new EventEmitter<string[][]>();
  @Input()
  exampleQuery!: string;

  execTime$ = new BehaviorSubject<number>(0);
  waitingResponse = false;

  state: EditorState | undefined;
  view: EditorView | undefined;
  themeChange$ = this.themeService.selectedTheme$.pipe(
    tap((theme) => this.changeTheme(theme == 'dark')),
  );
  error$ = new BehaviorSubject<Error | undefined>(undefined);
  private themeConfig: Compartment | undefined;

  constructor(
    protected rdfService: RdfService,
    protected themeService: ThemeHandlerService,
  ) {
  }

  completeSPARQL(context: CompletionContext) {

    const sparqlKeywords = [
      "SELECT",
      "DISTINCT",
      "FROM",
      "WHERE",
      "GRAPH",
      "ORDER BY",
      "GROUP BY",
      "FILTER",
      "PREFIX",
      "LIMIT",
      "OFFSET",
      "OPTIONAL",
      "UNION",
      "FILTER",
      "SERVICE",
      // Add more keywords as needed
    ].map(keyword => ({label : keyword, type : "keyword"}));

    const sparqlPrefixes = [
      ["afn", "http://jena.apache.org/ARQ/function#"],
      ["agg", "http://jena.apache.org/ARQ/function/aggregate#"],
      ["apf", "http://jena.apache.org/ARQ/property#"],
      ["array", "http://www.w3.org/2005/xpath-functions/array"],
      ["dcterms", "http://purl.org/dc/terms/"],
      ["disprot", "https://disprot.org"],
      ["fn", "http://www.w3.org/2005/xpath-functions"],
      ["geoext", "http://rdf.useekm.com/ext#"],
      ["geof", "http://www.opengis.net/def/function/geosparql/"],
      ["gn", "http://www.geonames.org/ontology#"],
      ["graphdb", "http://www.ontotext.com/config/graphdb#"],
      ["identifiers", "https://identifiers.org/"],
      ["idp", "https://idpcentral.org/registry/"],
      ["list", "http://jena.apache.org/ARQ/list#"],
      ["map", "http://www.w3.org/2005/xpath-functions/map"],
      ["math", "http://www.w3.org/2005/xpath-functions/math"],
      ["mobidb", "https://mobidb.org/"],
      ["ofn", "http://www.ontotext.com/sparql/functions/"],
      ["omgeo", "http://www.ontotext.com/owlim/geo#"],
      ["owl", "http://www.w3.org/2002/07/owl#"],
      ["path", "http://www.ontotext.com/path#"],
      ["pav", "http://purl.org/pav/"],
      ["ped", "https://proteinensemble.org/"],
      ["rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"],
      ["rdfs", "http://www.w3.org/2000/01/rdf-schema#"],
      ["rep", "http://www.openrdf.org/config/repository#"],
      ["sail", "http://www.openrdf.org/config/sail#"],
      ["schema", "https://schema.org/"],
      ["spif", "http://spinrdf.org/spif#"],
      ["sr", "http://www.openrdf.org/config/repository/sail#"],
      ["uniprot", "http://purl.uniprot.org/uniprot/"],
      ["wgs", "http://www.w3.org/2003/01/geo/wgs84_pos#"],
      ["xsd", "http://www.w3.org/2001/XMLSchema#"],
    ].map(([prefix, iri]) => (
      {label : prefix, type : "type", apply : `${prefix}: <${iri}>`, detail : 'IRI'}),
    );

    const sparqlPrefixes2 = [
      ["afn:", "http://jena.apache.org/ARQ/function#"],
      ["agg:", "http://jena.apache.org/ARQ/function/aggregate#"],
      ["apf:", "http://jena.apache.org/ARQ/property#"],
      ["array:", "http://www.w3.org/2005/xpath-functions/array"],
      ["dcterms:", "http://purl.org/dc/terms/"],
      ["disprot:", "https://disprot.org"],
      ["fn:", "http://www.w3.org/2005/xpath-functions"],
      ["geoext:", "http://rdf.useekm.com/ext#"],
      ["geof:", "http://www.opengis.net/def/function/geosparql/"],
      ["gn:", "http://www.geonames.org/ontology#"],
      ["graphdb:", "http://www.ontotext.com/config/graphdb#"],
      ["identifiers:", "https://identifiers.org/"],
      ["idp:", "https://idpcentral.org/registry/"],
      ["list:", "http://jena.apache.org/ARQ/list#"],
      ["map:", "http://www.w3.org/2005/xpath-functions/map"],
      ["math:", "http://www.w3.org/2005/xpath-functions/math"],
      ["mobidb:", "https://mobidb.org/"],
      ["ofn:", "http://www.ontotext.com/sparql/functions/"],
      ["omgeo:", "http://www.ontotext.com/owlim/geo#"],
      ["owl:", "http://www.w3.org/2002/07/owl#"],
      ["path:", "http://www.ontotext.com/path#"],
      ["pav:", "http://purl.org/pav/"],
      ["ped:", "https://proteinensemble.org/"],
      ["rdf:", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"],
      ["rdfs:", "http://www.w3.org/2000/01/rdf-schema#"],
      ["rep:", "http://www.openrdf.org/config/repository#"],
      ["sail:", "http://www.openrdf.org/config/sail#"],
      ["schema:", "https://schema.org/"],
      ["spif:", "http://spinrdf.org/spif#"],
      ["sr:", "http://www.openrdf.org/config/repository/sail#"],
      ["uniprot:", "http://purl.uniprot.org/uniprot/"],
      ["wgs:", "http://www.w3.org/2003/01/geo/wgs84_pos#"],
      ["xsd:", "http://www.w3.org/2001/XMLSchema#"],
    ].map(([prefix, iri]) => ({
        label : prefix,
        displayLabel : prefix.slice(0, -1),
        type : "type",
        apply : (view: EditorView, completion: Completion, from: number, to: number) => {
          // Add a new line at the start of the query to add the prefix declaration
          const doc = view.state.doc;
          const declaration = `PREFIX ${prefix} <${iri}>\n`;
          const rest = doc.toString();
          const text = view.state.toText(declaration + rest);
          const transaction = view.state.update({
            changes : {
              from : 0, to : doc.length, insert : text,
            },
          });
          if (transaction) {
            view.dispatch(transaction);
          }
        },
        detail : 'IRI',
      }),
    );

    function completePrefix(nodeBefore: any, context: CompletionContext) {
      // Get the text before the current position
      let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos);

      // Check if we are at the beginning of a keyword
      let prefixBefore = /\w*$/.exec(textBefore);

      if (!prefixBefore && !context.explicit) return null

      return {
        from : prefixBefore ? nodeBefore.from + prefixBefore.index : context.pos,
        options : sparqlPrefixes,
        filter : true,
        validFor : /\w*$/,
      };
    }

    function completeKeyword(nodeBefore: any, context: CompletionContext) {
      // Get the text before the current position
      let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos);

      // Check if we are at the beginning of a keyword
      let keywordBefore = /\w*$/.exec(textBefore);

      if (!keywordBefore && !context.explicit) return null

      return {
        from : keywordBefore ? nodeBefore.from + keywordBefore.index : context.pos,
        options : sparqlKeywords,
        // Allow autocompletion at the start of the query or after whitespace
        validFor : /\w*$/,
      };
    }

    // Function to check if a prefix is already declared in the query
    function isPrefixDeclared(prefix: string, context: CompletionContext): boolean {
      const doc = context.state.doc;

      for (let line of doc.iterLines()) {
        const lineText = line.trim();
        if (lineText.startsWith("PREFIX")) {
          // Check if the prefix declaration matches
          const parts = lineText.split(/\s+/);
          if (parts.length === 3 && parts[1] === prefix) {
            return true;
          }
        }
      }

      return false;
    }

    function addPrefixDeclaration(nodeBefore: any, context: CompletionContext) {
      // Get the current IRI prefix
      let iriPrefix = context.state.sliceDoc(nodeBefore.from, context.pos);
      // Remove the colon at the end
      // iriPrefix = iriPrefix.slice(0, -1);
      const prefixDeclared = isPrefixDeclared(iriPrefix, context);
      // Check if the prefix is already declared in the query
      if (!prefixDeclared) {
        // Search in the available prefixes to see if it's valid
        const availablePrefixes = sparqlPrefixes2.map((x) => x.label);
        if (availablePrefixes.includes(iriPrefix)) {
          return {
            from : nodeBefore.from,
            options : sparqlPrefixes2,
            validFor : /w*$/,
          };
        }
      }
      return null;
    }

    // Resolve the node before the current position
    let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
    let nodeBeforeBefore = syntaxTree(context.state).resolveInner(nodeBefore.from, -1);

    if ((nodeBeforeBefore.name === "PrefixDecl" && nodeBefore.name === "Keyword") ||
      (nodeBeforeBefore.name === "Unit" && nodeBefore.name === "PrefixDecl")) {
      return completePrefix(nodeBefore, context);
    }

    if (nodeBefore.name === "Keyword" || nodeBefore.name === "Unit") {
      return completeKeyword(nodeBefore, context);
    }

    if (nodeBefore.name === "Pname_ns") {
      return addPrefixDeclaration(nodeBefore, context);
    }

    return null;
  }

  ngAfterViewInit() {
    // Create a keymap that triggers the formatting
    const formatSqlKeymap = keymap.of([
      {
        key : 'Ctrl-Shift-f', // Customize the key binding as needed
        run : (view) => {
          let formattedSql = view.state.doc.toString();

          view.dispatch(view.state.update({
            changes : {
              from : 0, to : view.state.doc.length, insert : formattedSql,
            },
          }));
          return true;
        },
      },
    ]);

    this.themeConfig = new Compartment();

    let theme;
    if (this.themeService.getTheme() == 'dark') {
      theme = this.themeConfig.of(oneDark);
    } else {
      theme = this.themeConfig.of(githubLight);
    }

    const sparqlCompletion = SparqlLanguage.data.of({
      autocomplete : this.completeSPARQL,
    })

    this.state = EditorState.create({
      doc : this.exampleQuery,
      extensions : [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        // crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        sparqlCompletion,
        sparql(),
        theme,
        keymap.of([indentWithTab]),
        formatSqlKeymap,
        EditorView.lineWrapping,
        drawSelection(),
        EditorState.tabSize.of(8),
      ],
    })

    this.view = new EditorView({
      state : this.state,
      parent : this.sparqlEditor.nativeElement,
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['exampleQuery'] && this.view) {
      this.view.dispatch({
        changes : {
          from : 0, to : this.view.state.doc.length, insert : this.exampleQuery,
        },
      });
    }
  }

  submitQuery() {
    this.error$.next(undefined);
    this.waitingResponse = true;

    this.rdfData$ = this.rdfService.makeSPARQLquery(this.view?.state.doc.toString() || '').pipe(
      map(({execTime, csv}) => {
        this.execTime$.next(execTime);
        this.waitingResponse = false;
        return csv.split('\n')
      }),
      map((lines: string[]) => lines.map((line: string) => line.split(','))),
      catchError((err) => {
        this.error$.next({
          message : err.error,
          status : err.status,
        });
        console.error(err);
        return of();
      }),
      filter((tsv) => tsv !== undefined),
      tap((tsv) => this.tsvData$.emit(tsv)),
    );
  }

  changeTheme(dark: boolean) {
    this.view?.dispatch({
      effects : this.themeConfig?.reconfigure(dark ? oneDark : githubLight),
    });
  }

  copyCurl() {
    // Create a CuRL command and copy it to the clipboard
    const curl = this.rdfService.querySparqlToCuRL(this.view?.state.doc.toString() || '');
    navigator.clipboard.writeText(curl);
  }
}

