import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs/Subscription';

import { SmsLoaderComponent } from '../sms-loader/sms-loader.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { SmsStoreService } from '../sms-store.service';
import { SmsLoaderService } from '../sms-loader.service';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

    messagesPlaceholder: string;
    contactsPlaceholder: string;
    countryCodePlaceholder: string;
    messagesLoaded: boolean;
    loadingSubscription: Subscription;

    constructor(private smsStoreService: SmsStoreService, private smsLoaderService: SmsLoaderService) {
    }

    ngOnInit() {
        this.messagesPlaceholder = 'Messages will appear here. Please select a backup file. Large backups will freeze the UI.';
        this.countryCodePlaceholder = 'Note: Please check SETTINGS to change your country code before loading!';
        this.contactsPlaceholder = 'Contacts will appear here. Please select a backup file.';
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
        .subscribe(messagesLoaded => {
            this.messagesLoaded = messagesLoaded;
            return;
        });
    }

}
