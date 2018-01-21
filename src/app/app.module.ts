import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { ContactListComponent } from './contact-list/contact-list.component';
import { MessageListComponent } from './message-list/message-list.component';

import { SmsStoreService }  from './sms-store.service';
import { SmsLoaderService }  from './sms-loader.service';
import { CountrySelectComponent } from './country-select/country-select.component';
import { MessageTypePipe } from './message-type.pipe';
import { MainComponent } from './main/main.component';
import { SettingsComponent } from './settings/settings.component';
import {ContactSearchPipe} from './components/pipes/contact-search-pipe';
const appRoutes: Routes = [
{ path: 'main', component: MainComponent },
{ path: 'settings', component: SettingsComponent },
{ path: '',
redirectTo: '/main',
pathMatch: 'full'
}];

@NgModule({
    declarations: [
    AppComponent,
    SmsLoaderComponent,
    ContactListComponent,
    MessageListComponent,
    CountrySelectComponent,
    MessageTypePipe,
    MainComponent,
    SettingsComponent,
    ContactSearchPipe,
    ],
    imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(appRoutes)
    ],
    providers: [SmsStoreService, SmsLoaderService],
    bootstrap: [AppComponent]
})
export class AppModule { }
