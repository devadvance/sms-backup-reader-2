import { Component, OnInit } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { MessageListComponent } from './message-list/message-list.component';
import { SmsStoreService } from './sms-store.service';
import { SmsLoaderService } from './sms-loader.service';

const { version: appVersion } = require('../../package.json');

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    title = 'SMS Backup Reader 2.0';
    loaded: boolean = false;
    private appVersion;

    constructor(private smsStoreService: SmsStoreService, private smsLoaderService: SmsLoaderService) {
        this.appVersion = appVersion;
    }

    onLoaded(loaded: boolean) {
        console.log('Event emit!');
        if (loaded) {
            if (this.loaded) {
                console.log('Clear then load :)');
                this.loaded = false;
                this.smsStoreService.clearAllMessages().then(() => {
                    this.loadMessages(loaded);
                });
            } else {
                this.loadMessages(loaded);
            }
        }
    }

    private loadMessages(loaded: boolean): void {
        this.smsLoaderService.getLoadedMessages().then(messages => {
            this.smsStoreService.loadAllMessages(messages).then(() => {
                this.loaded = loaded;
                this.smsStoreService.broadcastMessagesLoaded(this.loaded);
            });
        });
    }
    
}
