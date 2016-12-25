/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { CountrySelectComponent } from './country-select.component';

describe('CountrySelectComponent', () => {
    let component: CountrySelectComponent;
    let fixture: ComponentFixture<CountrySelectComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ CountrySelectComponent ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CountrySelectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
