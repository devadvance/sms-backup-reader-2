import { Component, OnInit } from '@angular/core';
import {Subscription} from 'rxjs/Subscription';

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';

@Component({
    selector: 'message-list',
    templateUrl: './message-list.component.html',
    styleUrls: ['./message-list.component.css']
})

export class MessageListComponent implements OnInit {

    messages: Message[];
    messageMap: Map<string, Message[]>;

    messagesLoaded: boolean;
    loadingSubscription: Subscription;
    contactClickedSubscription: Subscription;
    selectedContact: Contact;

    constructor(private smsStoreService: SmsStoreService) { }

    ngOnInit() {
        this.loadingSubscription = this.smsStoreService.messagesLoaded$
        .subscribe(messagesLoaded => {
            this.messagesLoaded = messagesLoaded;
            this.getAllMessages();
            return;
        });

        this.contactClickedSubscription = this.smsStoreService.contactClicked$
        .subscribe(contact => {
            this.selectedContact = contact;
            if (contact) {
                this.messages = this.messageMap.get(contact.address);
            }
            return;
        });
    }

    ngOnDestroy() {
        this.loadingSubscription.unsubscribe();
        this.contactClickedSubscription.unsubscribe();
    }

    getAllMessages(): void {
        this.messages = new Array<Message>();
        this.smsStoreService.getAllMessages().then(messageMap => {
            this.messageMap = messageMap;
        });
    }

    showMessages(contactId: string): void {
        this.messages = this.messageMap.get(contactId);
    }

}
