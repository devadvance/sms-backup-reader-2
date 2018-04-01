import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { VcfLoaderService } from '../vcf-loader.service';


@Component({
    selector: 'vcf-loader',
    templateUrl: './vcf-loader.component.html',
    styleUrls: ['./vcf-loader.component.css']
})
export class VcfLoaderComponent implements OnInit {
    @Output() onLoaded = new EventEmitter<boolean>();
    sampleText: String = 'not loaded';
    loaded: boolean = false;

    constructor(
        private VcfLoaderService: VcfLoaderService,
        ) { }

    ngOnInit() {
    }

    fileChange(fileEvent: any): void {
        console.log(fileEvent.target.files);
        var file: File;
        if (fileEvent.target.files && fileEvent.target.files.length >= 1) {
            file = fileEvent.target.files[0];
            this.VcfLoaderService.loadVCFFile(file).then(result => {
                this.sampleText = 'Loaded!';
                this.onLoaded.emit(true);
                this.loaded = true;
                });
        }
    }
}

