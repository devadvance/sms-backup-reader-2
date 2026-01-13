import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { SmsLoaderComponent } from './sms-loader.component';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';

describe('SmsLoaderComponent', () => {
    let component: SmsLoaderComponent;
    let fixture: ComponentFixture<SmsLoaderComponent>;
	let filename : string;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormsModule],
            declarations: [ SmsLoaderComponent ],
            providers: [SmsLoaderService, SmsStoreService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SmsLoaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
