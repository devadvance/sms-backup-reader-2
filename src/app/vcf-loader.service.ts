import { Injectable } from '@angular/core';

@Injectable()
export class VcfLoaderService {
  vcards : string;
  constructor() { }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        return Promise.reject(error.message|| error);
    }

    loadVCFFile(file: File): Promise<string> {
        let reader: FileReader = new FileReader();

        reader.readAsText(file, 'UTF-8');

        return new Promise((resolve, reject) => {
				reader.onload = (event: any) => { // Shouldn't need 'any' but this fixes an issue with TS definitions			
				this.vcards = event.target.result;
				resolve(<string>this.vcards);				
			}
        }).catch(this.handleError);
    }
	
	getLoadedContacts(): Promise<any> {
        return new Promise((resolve, reject) => {			
            resolve(<string>this.vcards);
        }).catch(this.handleError);
    }
}
