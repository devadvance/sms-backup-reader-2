import { Component, OnInit } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader/sms-loader.component';
import { VcfLoaderComponent } from './vcf-loader/vcf-loader.component';
import { MessageListComponent } from './message-list/message-list.component';
import { SmsStoreService } from './sms-store.service';
import { SmsLoaderService } from './sms-loader.service';
import { VcfLoaderService } from './vcf-loader.service';
import { VcfStoreService } from './vcf-store.service';

const { version: appVersion } = require('../../package.json');

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent   {
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

    onSmsLoaded(loaded: boolean) {
        console.log('Event emit!');
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
        this.smsLoaderService.getLoadedMessages().then(messages => {
            this.smsStoreService.loadAllMessages(messages).then(() => {
                this.smsloaded = loaded;
				if ((this.vcfloaded)&&
					(loaded))
				{					
					this.vcfStoreService.getAllContacts().then(contactsMap => {
						this.smsStoreService.fillContactNames(contactsMap);
						this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);	
					});
				}
				if (loaded)
				{
					this.smsStoreService.broadcastMessagesLoaded(this.smsloaded);					
				}
            });
        });
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
