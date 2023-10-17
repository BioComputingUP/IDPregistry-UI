import { NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { RouterOutlet } from "@angular/router";
import { HttpClientModule } from "@angular/common/http";
import { ProteinRowComponent } from './components/protein-row/protein-row.component';

@NgModule({
  declarations : [
    AppComponent,
    HomeComponent,
    ProteinRowComponent,
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
