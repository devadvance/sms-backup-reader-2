import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import { Message } from './message';
import { Contact } from './contact';

import awesomePhone from 'awesome-phonenumber';

@Injectable()
export class SmsStoreService {

    messages: Message[];
    contacts: Contact[];
    messageMap: Map<String, Message[]>;
    countryCode: string;
    

    messagesLoaded: boolean;

    constructor() { 
        this.messagesLoaded = false;
        this.countryCode = 'US';
    }

    areMessagesLoaded(): Promise<boolean> {
        return Promise.resolve(this.messagesLoaded);
    }

    changeCountry(countryCode: string): Promise<void> {
        return new Promise((resolve, reject) => {
			if (this.countryCode != countryCode)
			{
				this.countryCode = countryCode;
				this.loadAllMessages(this.messages);
			}
            resolve();
        });
    }

    getCountry(): Promise<string> {
        return new Promise((resolve, reject) => {
            resolve(this.countryCode);
        });
    }

    //http://stackoverflow.com/questions/34376854/delegation-eventemitter-or-observable-in-angular2/35568924#35568924
    // Observable source
    private _messagesLoadedSource = new BehaviorSubject<boolean>(false);
    // Observable stream
    messagesLoaded$ = this._messagesLoadedSource.asObservable();
    // Service command
    broadcastMessagesLoaded(messagesLoaded: boolean) {
        this._messagesLoadedSource.next(messagesLoaded);
    }

    // Observable source
    private _contactClickedSource = new BehaviorSubject<Contact>(null);
    // Observable stream
    contactClicked$ = this._contactClickedSource.asObservable();
    // Service command
    broadcastContactClicked(contactClicked: Contact) {
        this._contactClickedSource.next(contactClicked);
    }

    loadAllMessages(messages: Message[]): Promise<void> {
		this.messages = messages;
        this.messageMap = new Map();
        this.contacts = new Array<Contact>();
        return new Promise((resolve, reject) => {
            this.messages = messages;
            for (let message of messages) {
                let mapEntry;
                let phone = new awesomePhone(message.contactNumber, this.countryCode);
                let contactNum: string = phone.getNumber('international');  
                if (!contactNum) {
                    contactNum = message.contactNumber;
                }
                //console.log(`contact: ${contactNum}`);
                if(!(mapEntry = this.messageMap.get(contactNum))) {
                    mapEntry = new Array<Message>();
                    mapEntry.push(message);
                    this.messageMap.set(contactNum, mapEntry);
                } else {
                    mapEntry.push(message);
                }
            }
			//sort by timestamp
			this.messageMap.forEach(( value: Message[], key: string) => {
				value = value.sort((message1, message2) => message1.date.getTime() - message2.date.getTime());
				this.messageMap.set(key, value);
			});
            this.messageMap.forEach((value: Message[], key: String) => {
                let contactName = value[0].contactName;
                this.contacts.push({
                    name: (contactName != '(Unknown)') ? contactName : null,
                    address: key as string,
                    messageCount: value.length
                });
            });

            resolve();
        });
    }

    clearAllMessages(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.messageMap = new Map();
            this.messages = new Array<Message>();
            this.messagesLoaded = false;
            console.log('Cleared in service: ' + JSON.stringify(this.messages));
            resolve();
        });
    }

    // Get all messages for all contacts
    getAllMessages(): Promise<Map<String, Message[]>> {
        return new Promise((resolve, reject) => {
            resolve(this.messageMap);
        });
    }

    // this.contacts = [...messageMap.keys()]; // need to target ES6 for this to work
    getAllContacts(): Promise<Contact[]> {
        return new Promise((resolve, reject) => {
            resolve(this.contacts);
        });
    }

    // Get the messages for a specific contact
    getMessages(contactId: string): Promise<Message[]> {
        let returnMessages: Message[];
        return new Promise((resolve, reject) => {
            returnMessages = this.messageMap.get(contactId);
            resolve(returnMessages);
        });
    }
	
	fillContactNames(contactMap: Map<string, string>): Promise<void> {
		return new Promise((resolve, reject) => {
			//console.log(this.contacts);
			this.contacts.forEach(function(contact)
			{
				let name: string;
				console.log(contact.address);
				name = contactMap.get(contact.address);
				if (name)
				{
					contact.name = name;
					console.log(contact.name);
				}
				else
				{
					console.log("not found");
				}
			});
			resolve();
		});
	}
}



