import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DateFormat = 'european' | 'us' | 'custom';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  theme: 'light' | 'dark' = 'light';
  accentColor: string = '#1976d2';
  dateFormat: DateFormat = 'european';
  customDateFormat: string = 'dd.MM.yyyy HH:mm:ss';
  showDuplicates: boolean = false;
  sortOrder: 'oldest' | 'newest' = 'oldest'; // allow both values
  debugMode: boolean = false;

  private _showDuplicatesSource = new BehaviorSubject<boolean>(this.showDuplicates);
  showDuplicates$ = this._showDuplicatesSource.asObservable();

  constructor() {
    this.loadSettingsFromCookie();
  }

  private saveSettingsToCookie() {
    const settings = {
      theme: this.theme,
      accentColor: this.accentColor,
      dateFormat: this.dateFormat,
      customDateFormat: this.customDateFormat,
      showDuplicates: this.showDuplicates,
      sortOrder: this.sortOrder,
      debugMode: this.debugMode,
    };
    const encoded = encodeURIComponent(JSON.stringify(settings));
    document.cookie = `smsbr2settings=${encoded};path=/;max-age=31536000`;
  }

  private loadSettingsFromCookie() {
    const match = document.cookie.match(/(?:^|; )smsbr2settings=([^;]*)/);
    if (match) {
      try {
        const settings = JSON.parse(decodeURIComponent(match[1]));
        Object.assign(this, settings);
      } catch {}
    }
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme = theme;
    this.saveSettingsToCookie();
    document.body.classList.toggle('dark-theme', theme === 'dark');
  }

  setAccentColor(color: string) {
    this.accentColor = color;
    this.saveSettingsToCookie();
    document.documentElement.style.setProperty('--accent-color', color);
  }

  setDateFormat(format: DateFormat, custom?: string) {
    this.dateFormat = format;
    if (custom !== undefined) this.customDateFormat = custom;
    this.saveSettingsToCookie();
  }

  setShowDuplicates(show: boolean) {
    this.showDuplicates = show;
    this.saveSettingsToCookie();
    this._showDuplicatesSource.next(show);
  }

  setSortOrder(order: 'newest' | 'oldest') {
    this.sortOrder = order;
    this.saveSettingsToCookie();
  }

  setDebugMode(debug: boolean) {
    this.debugMode = debug;
    this.saveSettingsToCookie();
  }
}
