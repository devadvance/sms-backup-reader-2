import { Injectable } from '@angular/core';
import { Message } from './message';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import awesomePhone from 'awesome-phonenumber';

import idb from 'idb';

@Injectable()
export class SmsLoaderService {
    messages: Message[];
    countryCode: string;
    //messagesProcessing:boolean = false;

    constructor() { }

    //http://stackoverflow.com/questions/34376854/delegation-eventemitter-or-observable-in-angular2/35568924#35568924
    // Observable source
    private _messagesProcessingSource = new BehaviorSubject<boolean>(false);
    // Observable stream
    messagesProcessing$ = this._messagesProcessingSource.asObservable();
    // Service command
    broadcastMessagesProcessing(messagesProcessing: boolean) {
        this._messagesProcessingSource.next(messagesProcessing);
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        return Promise.reject(error.message || error);
    }

    //55296 >= X <= 57343
    //D800 - DFFF
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

    getLoadedMessages(): Promise<Message[]> {
        return new Promise((resolve, reject) => {
            resolve(this.messages);
        }).catch(this.handleError);
    }

    private decodeHtml(str: string): string {
        var txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }

    loadSMSFile(file: File): Promise<any> {
        this.broadcastMessagesProcessing(true);
        this.messages = new Array<Message>();
        let reader: FileReader = new FileReader();
        let parser: any = new DOMParser();
        let xmlDoc: any;
        let dbPromise = idb.open('sms-br-2-db1', 1, upgradeDB => { });

        reader.readAsText(file, 'UTF-8');

        return new Promise((resolve, reject) => {
            reader.onload = (event: any) => { // Shouldn't need 'any' but this fixes an issue with TS definitions
                var cleanedText = this.cleanString(event.target.result);
                xmlDoc = parser.parseFromString(cleanedText, 'text/xml');
                
                // Add the SMS to IndexedDB
                dbPromise.then(function(db) {
                    let tx = db.transaction('messages', 'readwrite');
                    let messageOS = tx.objectStore('messages');
                    for (let sms of xmlDoc.getElementsByTagName('sms')) {
                        let message = {
                            contactAddress: sms.getAttribute('address'),
                            contactName: sms.getAttribute('contact_name'),
                            type: parseInt(sms.getAttribute('type')),
                            timestamp: sms.getAttribute('date'),
                            date: new Date(parseInt(sms.getAttribute('date'))),
                            body: sms.getAttribute('body')
                        };
                        messageOS.add(message);
                    }
                    return tx.complete;
                }).then(function() {
                    console.log('added all SMS to the message OS!');
                });

                // Add the SMS to a basic JS array
                for (let sms of xmlDoc.getElementsByTagName('sms')) {
                    this.messages.push({
                        contactAddress: sms.getAttribute('address'),
                        contactName: sms.getAttribute('contact_name'),
                        type: parseInt(sms.getAttribute('type')),
                        timestamp: sms.getAttribute('date'),
                        date: new Date(parseInt(sms.getAttribute('date'))),
                        body: sms.getAttribute('body')
                    });
                }

                // Add the MMS to IndexedDB
                dbPromise.then(function(db) {
                    let tx = db.transaction('messages', 'readwrite');
                    let messageOS = tx.objectStore('messages');

                    for (let mms of xmlDoc.getElementsByTagName('mms')) {                
                        let contactAddress:string = '';
                        let body:string = '';
                        let type:number = 3;
                        for (let addr of mms.getElementsByTagName('addr')) {
                            if ((addr.getAttribute('type') == "137") || (contactAddress == 'insert-address-token')) {
                                contactAddress = addr.getAttribute('address');
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
                        let message = {
                            contactAddress: contactAddress,
                            contactName: mms.getAttribute('contact_name'),
                            type: type,
                            timestamp: mms.getAttribute('date'),
                            date: new Date(parseInt(mms.getAttribute('date'))),
                            body: body
                        };
                        messageOS.add(message);
                    }
                    return tx.complete;
                }).then(function() {
                    console.log('added all MMS to the message OS!');
                });

                // Add the MMS to a basic JS array
    			for (let mms of xmlDoc.getElementsByTagName('mms')) {				
    				let contactAddress:string = '';
    				let body:string ="";
    				let type:number = 3;
    				for (let addr of mms.getElementsByTagName('addr')) {
    					if ((addr.getAttribute('type') == "137") || 
    					    (contactAddress == 'insert-address-token'))
    					{
    						contactAddress = addr.getAttribute('address');
    					}
    					if (contactAddress == 	'insert-address-token')
    					{
    						type = 4;
    					}
    				}
    				for (let part of mms.getElementsByTagName('part')) {
    					if (part.getAttribute('ct') == "image/jpeg")
    					{
    						body = body + '<img style="vertical-align:top" src="data:image/jpeg;base64,' +  part.getAttribute('data') + '"/>';
    					}
    					if (part.getAttribute('ct') == "text/plain")
    					{
    						body = body + '<div>'+ part.getAttribute('text') + '<div/>';
    					}
    				}
                    this.messages.push({
                        contactAddress: contactAddress,
                        contactName: mms.getAttribute('contact_name'),
                        type: type,
                        timestamp: mms.getAttribute('date'),
                        date: new Date(parseInt(mms.getAttribute('date'))),
                        body: body
                    });
                }

                this.broadcastMessagesProcessing(false);
                resolve();
            } // reader
 
        }).catch(this.handleError); // new promise
    } //loadSMS

}
