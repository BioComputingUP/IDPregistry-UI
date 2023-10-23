import { NgOptimizedImage } from '@angular/common';
import { HttpClientModule } from "@angular/common/http";
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from "@angular/router";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from './app.component';
import { ProteinRowComponent } from './components/protein-row/protein-row.component';
import { SparqlEditorComponent } from './components/sparql-editor/sparql-editor.component';
import { SparqlResultsComponent } from './components/sparql-results/sparql-results.component';
import { HomeComponent } from './pages/home/home.component';
import { SparqlComponent } from './pages/sparql/sparql.component';

@NgModule({
  declarations : [
    AppComponent,
    HomeComponent,
    ProteinRowComponent,
    SparqlComponent,
    SparqlEditorComponent,
    SparqlResultsComponent,
  ],
  imports : [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule,
    RouterOutlet,
    NgOptimizedImage,
    FormsModule,
  ],
  providers : [],
  bootstrap : [AppComponent],
})
export class AppModule {
}
