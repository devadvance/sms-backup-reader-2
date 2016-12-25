/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { SmsLoaderComponent } from './sms-loader.component';

describe('SmsLoaderComponent', () => {
    let component: SmsLoaderComponent;
    let fixture: ComponentFixture<SmsLoaderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ SmsLoaderComponent ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SmsLoaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
