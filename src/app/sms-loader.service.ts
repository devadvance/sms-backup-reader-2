import { Injectable } from '@angular/core';
import { Message } from './message';

@Injectable()
export class SmsLoaderService {
    messages: Message[];

    constructor() { }

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
        this.messages = new Array<Message>();
        let reader: FileReader = new FileReader();
        let parser: any = new DOMParser();
        let xmlDoc: any;

        reader.readAsText(file, 'UTF-8');

        return new Promise((resolve, reject) => {
            reader.onload = (event: any) => { // Shouldn't need 'any' but this fixes an issue with TS definitions
            var cleanedText = this.cleanString(event.target.result);
            xmlDoc = parser.parseFromString(cleanedText, 'text/xml');
            for (let sms of xmlDoc.getElementsByTagName('sms')) {
                this.messages.push({
                    contact: sms.getAttribute('address'),
                    type: parseInt(sms.getAttribute('type')),
                    timestamp: sms.getAttribute('date'),
                    date: new Date(parseInt(sms.getAttribute('date'))),
                    body: sms.getAttribute('body')
                });
            }
            resolve();
        }

    }).catch(this.handleError);
    }

}
