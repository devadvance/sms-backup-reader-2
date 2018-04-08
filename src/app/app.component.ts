import { Component, OnInit } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { VcfLoaderComponent } from './vcf-loader/vcf-loader.component';
import { MessageListComponent } from './message-list/message-list.component';
import { SmsStoreService } from './sms-store.service';
import { SmsLoaderService } from './sms-loader.service';
import { VcfLoaderService } from './vcf-loader.service';
import { VcfStoreService } from './vcf-store.service';
var URLSearchParams = require('url-search-params');
const { version: appVersion } = require('../../package.json');

import idb from 'idb';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit  {
    title = 'SMS Backup Reader 2.0';
    smsloaded: boolean = false;
    vcfloaded: boolean = false;
    private appVersion;	
    country: string = "US";


    constructor(private smsStoreService: SmsStoreService,
        private smsLoaderService: SmsLoaderService,
        private vcfLoaderService: VcfLoaderService,
        private vcfStoreService: VcfStoreService) 
    {
        this.appVersion = appVersion;
    }

    private getQueryParameter(key: string): string {
        const parameters = new URLSearchParams(window.location.search);
        return parameters.get(key);
    }

    ngOnInit() {
        if (this.getQueryParameter('country')) {
            this.country = this.getQueryParameter('country');
            this.smsStoreService.changeCountry(this.country);
            this.vcfStoreService.changeCountry(this.country);
            console.log(this.getQueryParameter('country'));
        }

		//check for support
        if (!('indexedDB' in window)) {
            console.log('This browser doesn\'t support IndexedDB');
            return;
        }

        let dbPromise = idb.open('sms-br-2-db1', 1, upgradeDB => {
            console.log('Setting up IndexedDB object stores');
            if (!upgradeDB.objectStoreNames.contains('messages')) {
                let messageOS = upgradeDB.createObjectStore('messages', {keyPath: 'messageId', autoIncrement:true});
                messageOS.createIndex('contactAddress', 'contactAddress', {unique: false});
            }

            if (!upgradeDB.objectStoreNames.contains('contacts')) {
                let contactOS = upgradeDB.createObjectStore('contacts', {keyPath: 'contactAddress'});
                contactOS.createIndex('contactName', 'contactName', {unique: false});
            }
        });

        dbPromise.then(db => {
            const tx = db.transaction('messages', 'readwrite');
            tx.objectStore('messages').clear();
            return tx.complete;
        });

        dbPromise.then(db => {
            const tx = db.transaction('contacts', 'readwrite');
            tx.objectStore('contacts').clear();
            return tx.complete;
        });
    }

    onSmsLoaded(loaded: boolean) {
        console.log('Event emit! inside onSmsLoaded');
        if (loaded) {
            if (this.smsloaded) {
                console.log('Clear then load :)');
                this.smsloaded = false;
                this.smsStoreService.clearAllMessages().then(() => {
                    this.loadMessages(loaded);
                });
            } else {
                this.loadMessages(loaded);
            }
        }
    }
	
    onVcfLoaded(loaded: boolean) {
        console.log('Event emit!');
        if (this.vcfloaded) {
            console.log('Clear then load :)');
            this.vcfloaded = false;
            this.vcfStoreService.clearAllContacts().then(() => {
                this.loadContacts(loaded);
            });
        } else {
            this.loadContacts(loaded);			
        }

    }
	
	
    private loadMessages(loaded: boolean): void {
        /*this.smsLoaderService.getLoadedMessages().then(messages => {
            this.smsStoreService.loadAllMessages(messages).then(() => {
                this.smsloaded = loaded;
                if ((this.vcfloaded) && (loaded)) {					
                    this.vcfStoreService.getAllContacts().then(contactsMap => {
                        this.smsStoreService.fillContactNames(contactsMap);
                        this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);	
                    });
                }
                if (loaded){
                    this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);					
                }
            });
        });*/
        console.log('Inside app.component:loadMessages');
        this.smsloaded = loaded;
        if ((this.vcfloaded) && (loaded)) {                    
            this.vcfStoreService.getAllContacts().then(contactsMap => {
                this.smsStoreService.fillContactNames(contactsMap);
                this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);    
            });
        }
        if (loaded){
            this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);                    
        }
    }
	
    private loadContacts(loaded: boolean): void {
        this.vcfLoaderService.getLoadedContacts().then(contacts => {
            this.vcfStoreService.loadAllContacts(contacts).then(() => {
                this.vcfloaded = loaded;
                if (this.smsloaded) {
                    this.vcfStoreService.getAllContacts().then(contactsMap => {
                        this.smsStoreService.fillContactNames(contactsMap);	
                    });
                }
            });
        });
    }
    
}
