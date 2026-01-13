import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { MainComponent } from './main.component';
import { SmsLoaderService } from '../sms-loader.service';
import { SmsStoreService } from '../sms-store.service';

describe('MainComponent', () => {
    let component: MainComponent;
    let fixture: ComponentFixture<MainComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [ MainComponent ],
            providers: [SmsStoreService, SmsLoaderService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MainComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
