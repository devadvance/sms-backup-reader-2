import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import { Contact } from './contact';
var vCard = require('vcf');
import awesomePhone from 'awesome-phonenumber';

@Injectable()
export class VcfStoreService {
	contacts: string = null;
    contactMap: Map<string, string>;
    countryCode: string;
    contactsLoaded: boolean;
	text: string;
	
    constructor() { 
        this.contactsLoaded = false;
        this.countryCode = 'US';
    }

    areContactsLoaded(): Promise<boolean> {
        return Promise.resolve(this.contactsLoaded);
    }

    changeCountry(countryCode: string): Promise<void> {
        return new Promise((resolve, reject) => {
			if (this.countryCode != countryCode)
			{
				this.countryCode = countryCode;
				if (this.contacts) {
					this.loadAllContacts(this.contacts);
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
    private _contactsLoadedSource = new BehaviorSubject<boolean>(false);
    // Observable stream
    contactsLoaded$ = this._contactsLoadedSource.asObservable();
    // Service command
    broadcastMessagesLoaded(contactsLoaded: boolean) {
        this._contactsLoadedSource.next(contactsLoaded);
    }

	addContacttoMap(tel :Object, contactName:Object)
	{
		if ((tel != '') && tel.hasOwnProperty("_data"))
		{
			let phone = new awesomePhone(tel["_data"], this.countryCode);
			let contactNum: string = phone.getNumber('international'); 
			let name = contactName["_data"];
			if (name.search('=') >=0) {
				name = name.replace(/={1}/g, '%');
				name = decodeURI(name);
			}
			if (!contactNum) {
				contactNum = tel["_data"];
			}
			console.log(contactNum + ":" + name);
			this.contactMap.set(contactNum, name);					
		}
	}
	
    loadAllContacts(contacts: string): Promise<void> {
		this.contacts = contacts;
        this.contactMap = new Map();
        return new Promise((resolve, reject) => {
			/*console.log(contacts);*/
			var arcontacts = vCard.parse(contacts);			
            var content = '';
            for (let contact of arcontacts) {
				var tel;
				var tels;
				var i;
				tels = contact.get('tel');
				if (tels)
				{
					if (tels.length)
					{
						for (i = 0; i < tels.length; i++) {
							this.addContacttoMap(tels[i], contact.get('fn'));	
						}
					}
					else
					{
						this.addContacttoMap(tels, contact.get('fn'))
					}
				}	
			}			
			this.contactsLoaded = true;
            resolve();
        });
    }

    clearAllContacts(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.contactMap = new Map();
            this.contactsLoaded = false;
            console.log('Cleared in service: ');
            resolve();
        });
    }

   
    getAllContacts(): Promise<Map<string, string>> {
        return new Promise((resolve, reject) => {
            resolve(this.contactMap);
        });
    }

    // Get the contact name
    getContact(numberId: string): Promise<string> {
        let contact: string;
        return new Promise((resolve, reject) => {
            contact = this.contactMap.get(numberId);
            resolve(contact);
        });
    }
}
