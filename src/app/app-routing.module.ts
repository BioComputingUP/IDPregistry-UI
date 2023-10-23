import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from "./pages/home/home.component";
import { SparqlComponent } from './pages/sparql/sparql.component';

const routes: Routes = [
  {
    path : '',
    redirectTo : '/home',
    pathMatch : 'full',
  },
  {path : 'home', component : HomeComponent},
  {path : 'sparql', component : SparqlComponent},
];

@NgModule({
  imports : [RouterModule.forRoot(routes)],
  exports : [RouterModule],
})
export class AppRoutingModule {
}
