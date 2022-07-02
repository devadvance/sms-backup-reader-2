import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';  

import { Message } from '../message';
import { Contact } from '../contact';
import { SmsStoreService }  from '../sms-store.service';

@Component({
    selector: 'message-list',
    templateUrl: './message-list.component.html',
    styleUrls: ['./message-list.component.css']
})

export class MessageListComponent implements OnInit {

    messages: Message[] =[];
    messageMap: Map<string, Message[]> = new Map();

    messagesLoaded: boolean = false;
    loadingSubscription!: Subscription;
    contactClickedSubscription!: Subscription;
    selectedContact: Contact = new Contact("", 0,"");

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
                var messages = this.messageMap.get(contact.address);
                if (messages) {
                    this.messages = messages;
                }
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
        var messages =  this.messageMap.get(contactId);
        if (messages) {
            this.messages = messages;
        }
    }

}
