import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';

@Component({
    selector: 'sms-loader',
    templateUrl: './sms-loader.component.html',
    styleUrls: ['./sms-loader.component.css']
})
export class SmsLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    sampleText: string = 'not loaded';
    loaded: boolean = false;
	filename : string ='';
    constructor(
        private smsLoaderService: SmsLoaderService,
        private smsStoreService: SmsStoreService
        ) { }

    ngOnInit() {
    }

    fileChange(fileEvent: any): void {
        console.log('Inside sms-loader:fileChange');
        console.log(fileEvent.target.files);
		console.log(this);
        var file: File;
        if (fileEvent.target.files && fileEvent.target.files.length >= 1) {
            file = fileEvent.target.files[0];
            //this.smsLoaderService.loadSMSFile(file).then(result => {
            this.smsStoreService.loadBackupFile(file).then(result => {
                console.log('Inside sms-loader:fileChange:callback');
                this.sampleText = 'Loaded!';
                this.onLoaded.emit(true);
                this.loaded = true;
				this.filename = '';
				console.log(this);
			});
        }
    }

}
