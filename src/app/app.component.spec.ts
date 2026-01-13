import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { SmsLoaderService } from './sms-loader.service';
import { SmsStoreService } from './sms-store.service';
import { VcfLoaderService } from './vcf-loader.service';
import { VcfStoreService } from './vcf-store.service';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            declarations: [AppComponent],
            providers: [SmsStoreService, SmsLoaderService, VcfLoaderService, VcfStoreService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should have the expected title', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app.title).toEqual('SMS Backup Reader 2.0');
    });
});
