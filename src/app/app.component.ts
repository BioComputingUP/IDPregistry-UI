import { Component } from '@angular/core';
import { map } from 'rxjs';
import { Theme, ThemeHandlerService } from './services/theme-handler.service';

@Component({
  selector : 'app-root',
  templateUrl : './app.component.html',
  styleUrls : ['./app.component.scss'],
})
export class AppComponent {
  title = 'idpcentral';

  // Define theme selector
  selectedTheme$ = this.themeHandlerService.selectedTheme$;

  // Define the update pipeline
  themeUpdated$ = this.selectedTheme$.pipe(
    // Just update body
    map((theme) => {
      // Get body element
      const body = document.getElementsByTagName('body')[0];
      // Update theme
      body.setAttribute('data-bs-theme', theme);
    }),
  );


  constructor(private themeHandlerService: ThemeHandlerService) {
  }

  // Set theme
  onThemeSelected(theme: Theme): void {
    // Set theme
    this.themeHandlerService.setTheme(theme);
  }
}
