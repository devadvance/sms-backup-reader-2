import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

import { Message } from './message';
import { Contact } from './contact';

import awesomePhone from 'awesome-phonenumber';
import idb from 'idb';

@Injectable()
export class SmsStoreService {
    messages: Message[];
    contacts: Contact[];
    contactMap: Map<string, Contact>;
    messageMap: Map<string, Message[]>;
    countryCode: string;
    messagesLoaded: boolean;

    constructor() { 
        this.messagesLoaded = false;
        this.countryCode = 'US';
        console.log('Inside constructor: ' + this.countryCode);
    }

    //55296 >= X <= 57343
    //D800 - DFFF
    /**
     * Clean UTF-16-like surrogate pairs to UTF-8 proper.
     *
     * Backup files include UTF-16-like surrogate pairs for anything that sits
     * outside of basic English. cleanString converts these to proper UTF-8
     * for use within SMS Backup Reader 2.
     * @param {string} str The string containg UTF-16-like surrogate pairs
     * @return {string} The string with the surrogate pairs replaced with UTF-8
     */
    private cleanString(str: string): string {
        return str.replace(/&#(\d+);&#(\d+);/g, (match: string, unit1: string, unit2: string) => {
            let unitA: number = parseInt(unit1);
            let unitB: number = parseInt(unit2);
            if (unitA >= 55296 && unitA <= 57343) {
                return String.fromCodePoint(unitA, unitB);
            } else {
                return match;
            }
        });
    }

    /**
     * Generic error handler
     *
     * @param {any} str The string containg UTF-16-like surrogate pairs
     * @return {Promise<any>} The string with the surrogate pairs replaced with UTF-8
     */
    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        return Promise.reject(error.message || error);
    }

    /**
     * Helper during loading file used to add or update contact info.
     * 
     * This helper function is called while loading from a backup file.
     * It either adds a new contact to the JS map, or if the contact
     * already exists, it increments the message count for that contact.
     *
     * @param {string} contactAddress Unique address of this contact
     * @param {string} contactName Name of the contact
     */
    addOrUpdateContact(contactAddress:string, contactName:string) {
        if (this.contactMap.has(contactAddress)) {
            this.contactMap.get(contactAddress).messageCount += 1;
        } else {
            let newContact = {
                address: contactAddress,
                name: (contactName != '(Unknown)') ? contactName : null,
                messageCount: 1
            }
            this.contactMap.set(contactAddress, newContact);
        }

        return;
    }

    /**
     * Main function for loading SMS and MMS from a backup
     *
     * @param {File} file File to load
     * @return {Promise<any>} Promise indicating the file has been loaded
     */
    loadBackupFile(file: File): Promise<any> {
        //console.log('Inside loadBackupFile: ' + this.countryCode);

        // Send a broadcast indicating loading has started
        this.broadcastMessagesProcessing(true);
        
        //this.messages = new Array<Message>();
        let reader: FileReader = new FileReader();
        let parser: any = new DOMParser();
        let xmlDoc: any;
        
        this.contactMap = new Map();

        reader.readAsText(file, 'UTF-8');

        return new Promise((resolve, reject) => {
            //console.log('Inside loadBackupFile:newPromise ' + this.countryCode);
            reader.onload = (event: any) => { // Shouldn't need 'any' but this fixes an issue with TS definitions
                //console.log('Inside loadBackupFile:reader.onload ' + this.countryCode);
                var cleanedText = this.cleanString(event.target.result);
                xmlDoc = parser.parseFromString(cleanedText, 'text/xml');
                let dbPromise = idb.open('sms-br-2-db1', 1, upgradeDB => { });
                var self = this;

                // Add the SMS to IndexedDB
                dbPromise.then(function(db) {
                    //console.log('Inside loadBackupFile:dPromise.then ' + self.countryCode);
                    let tx = db.transaction('messages', 'readwrite');
                    let messageOS = tx.objectStore('messages');
                    for (let sms of xmlDoc.getElementsByTagName('sms')) {

                        // Parse the address into proper format, if possible
                        let phone = new awesomePhone(sms.getAttribute('address'), self.countryCode);
                        let contactAddress: string = phone.getNumber('international');  
                        if (!contactAddress) {
                            contactAddress = sms.getAttribute('address');
                        }

                        // Create a new message
                        let message: Message = {
                            contactAddress: contactAddress,
                            contactName: sms.getAttribute('contact_name'),
                            type: parseInt(sms.getAttribute('type')),
                            timestamp: sms.getAttribute('date'),
                            date: new Date(parseInt(sms.getAttribute('date'))),
                            body: sms.getAttribute('body')
                        };

                        // Add message to IDB
                        messageOS.add(message); 

                        // Add new contact or update message count
                        self.addOrUpdateContact(contactAddress, sms.getAttribute('contact_name'));
                    }

                    return tx.complete;
                }).then(function() {
                    console.log('added all SMS to the message OS!');
                    return idb.open('sms-br-2-db1', 1, upgradeDB => { });
                }).then(function(db) {
                    let tx = db.transaction('messages', 'readwrite');
                    let messageOS = tx.objectStore('messages');

                    for (let mms of xmlDoc.getElementsByTagName('mms')) {                
                        let contactAddress:string = '';
                        let body:string = '';
                        let type:number = 3;
                        for (let addr of mms.getElementsByTagName('addr')) {
                            if ((addr.getAttribute('type') == "137") || (contactAddress == 'insert-address-token')) {
                                // Parse the address into proper format, if possible
                                let phone = new awesomePhone(addr.getAttribute('address'), self.countryCode);
                                contactAddress = phone.getNumber('international');  
                                if (!contactAddress) {
                                    contactAddress = addr.getAttribute('address');
                                }
                            }
                            
                            if (contactAddress == 'insert-address-token') {
                                type = 4;
                            }
                        }
                        
                        for (let part of mms.getElementsByTagName('part')) {
                            if (part.getAttribute('ct') == 'image/jpeg') {
                                body = body + '<img style="vertical-align:top" src="data:image/jpeg;base64,' +  part.getAttribute('data') + '"/>';
                            }
                            
                            if (part.getAttribute('ct') == 'text/plain') {
                                body = body + '<div>'+ part.getAttribute('text') + '<div/>';
                            }
                        }

                        // Create a new message
                        let message = {
                            contactAddress: contactAddress,
                            contactName: mms.getAttribute('contact_name'),
                            type: type,
                            timestamp: mms.getAttribute('date'),
                            date: new Date(parseInt(mms.getAttribute('date'))),
                            body: body
                        };

                        // Add message to IDB
                        messageOS.add(message);

                        // Add new contact or update message count
                        self.addOrUpdateContact(contactAddress, mms.getAttribute('contact_name'));
                    }
                    return tx.complete;
                }).then(function() {
                    console.log('added all MMS to the message OS!');
                    self.broadcastMessagesProcessing(false);
                    console.log('Reached resolve!!');
                    resolve();
                });

                
            } // Close reader
 
        }).catch(this.handleError); // Close new promise
    } // Close loadBackupFile

    areMessagesLoaded(): Promise<boolean> {
        return Promise.resolve(this.messagesLoaded);
    }

    changeCountry(countryCode: string): Promise<any> {
        return new Promise((resolve, reject) => {
			if (this.countryCode != countryCode)
			{
				this.countryCode = countryCode;
				if (this.messagesLoaded) {
					this.loadAllMessages(this.messages);
				}
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

    //http://stackoverflow.com/questions/34376854/delegation-eventemitter-or-observable-in-angular2/35568924#35568924
    // Observable source
    private _messagesProcessingSource = new BehaviorSubject<boolean>(false);
    // Observable stream
    messagesProcessing$ = this._messagesProcessingSource.asObservable();
    // Service command
    broadcastMessagesProcessing(messagesProcessing: boolean) {
        this._messagesProcessingSource.next(messagesProcessing);
    }

    loadAllMessages(messages: Message[]): Promise<void> {
		this.messages = messages;
        this.messageMap = new Map();
        this.contacts = new Array<Contact>();
        return new Promise((resolve, reject) => {
            this.messages = messages;
            for (let message of messages) {
                let mapEntry;
                let phone = new awesomePhone(message.contactAddress, this.countryCode);
                let contactAddress: string = phone.getNumber('international');  
                if (!contactAddress) {
                    contactAddress = message.contactAddress;
                }
                //console.log(`contact: ${contactAddress}`);
                if(!(mapEntry = this.messageMap.get(contactAddress))) {
                    mapEntry = new Array<Message>();
                    mapEntry.push(message);
                    this.messageMap.set(contactAddress, mapEntry);
                } else {
                    mapEntry.push(message);
                }
            }
			//sort by timestamp
			this.messageMap.forEach(( value: Message[], key: string) => {
				value = value.sort((message1, message2) => message1.date.getTime() - message2.date.getTime());
				this.messageMap.set(key, value);
			});
            this.messageMap.forEach((value: Message[], key: string) => {
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

    clearAllMessages(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.messageMap = new Map();
            this.messages = new Array<Message>();
            this.messagesLoaded = false;
            console.log('Cleared in service: ' + JSON.stringify(this.messages));
            resolve();
        });
    }

    // Get all messages for all contacts
    getAllMessages(): Promise<Map<string, Message[]>> {
        return new Promise((resolve, reject) => {
            resolve(this.messageMap);
        });
    }

    // this.contacts = [...messageMap.keys()]; // need to target ES6 for this to work
    getAllContacts(): Promise<Contact[]> {
        console.log('Inside sms-store:getAllContacts');
        return new Promise((resolve, reject) => {
            //resolve(this.contacts);
            resolve([ ...this.contactMap.values() ]);
        });
    }

    // Get the messages for a specific contact
    getMessages(contactAddress: string): Promise<Message[]> {
        let returnMessages: Message[];
        return new Promise((resolve, reject) => {
            returnMessages = this.messageMap.get(contactAddress);
            resolve(returnMessages);
        });
    }

    getContactMessages(contactAddress: string): Promise<Message[]> {
        let returnMessages: Message[] = new Array<Message>();
        let dbPromise = idb.open('sms-br-2-db1', 1, upgradeDB => { });
        /*return new Promise((resolve, reject) => {
            returnMessages = this.messageMap.get(contactAddress);
            resolve(returnMessages);
        });*/

        let range = IDBKeyRange.only(contactAddress);
        return new Promise((resolve, reject) => {
            dbPromise.then(function(db) {
                var tx = db.transaction(['messages'], 'readonly');
                var messageOS = tx.objectStore('messages');
                var index = messageOS.index('contactAddress');
                return index.openCursor(range);
            }).then(function showRange(cursor) {
                if (!cursor) {return;}
                //console.log('Cursored at:', cursor.key);
                //console.log('Cursored at:', cursor.value);

                //for (var field in cursor.value) {
                //    console.log(cursor.value[field]);
                //}
                returnMessages.push(cursor.value);
                return cursor.continue().then(showRange);
            }).then(function() {
                console.log('Done cursoring');
                resolve(returnMessages);
            });
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



