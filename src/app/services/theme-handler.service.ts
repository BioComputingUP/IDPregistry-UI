import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { ReplaySubject } from 'rxjs';

// Define theme name
export type Theme = 'light' | 'dark';

@Injectable({
  providedIn : 'root',
})
export class ThemeHandlerService {

  // Define emitter for theme color
  selectedTheme$ = new ReplaySubject<Theme>(1);
  // Define theme cookie key
  readonly THEME_KEY = 'idpkg_theme_color';
  // Define default theme
  readonly DEFAULT_THEME = 'light' as const;

  constructor(private cookieService: CookieService) {
    // Get theme from cookie
    this.selectedTheme$.next(this.getTheme());
  }

  // Set theme in cookie
  setTheme(theme: Theme): void {
    // Just store theme name in cookie
    this.cookieService.set(this.THEME_KEY, theme);
    // Emit selected theme
    this.selectedTheme$.next(theme);
  }

  // Retrieve theme from cookie
  getTheme(): Theme {
    // Case theme is stored in cookie, return it
    if (this.cookieService.check(this.THEME_KEY)) {
      // Get theme name as string
      const theme = this.cookieService.get(this.THEME_KEY);
      // Case theme name is valid
      if (theme === 'light' || theme === 'dark') {
        // Then, return theme name
        return theme;
      }
    }
    // Otherwise, return default theme
    return this.DEFAULT_THEME;
  }
}
