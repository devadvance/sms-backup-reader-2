import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs';

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';

@Component({
    selector: 'contact-list',
    templateUrl: './contact-list.component.html',
    styleUrls: ['./contact-list.component.css'],
})

export class ContactListComponent implements OnInit {

    messagesLoaded: boolean = false;
    loadingSubscription!: Subscription;
    contacts: Contact[] = [];
    selectedContact!: Contact ;
    numfilter: string ="";


    constructor(private smsStoreService: SmsStoreService) { }

    ngOnInit() {
        this.numfilter = '';
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
        .subscribe(messagesLoaded => {
            this.messagesLoaded = messagesLoaded;
            this.getAllContacts();
            return;
        });
    }

    getAllContacts() {
        this.smsStoreService.getAllContacts().then((contacts) => this.contacts = contacts);
    }

    showMessages(contact: Contact) {
        this.selectedContact = contact;
        this.smsStoreService.broadcastContactClicked(contact);
    }

    isSelected(contact: Contact) {
        return(this.selectedContact == contact);
    }
    ngOnDestroy() {
        // prevent memory leak when component is destroyed
        this.loadingSubscription.unsubscribe();
    }

}
