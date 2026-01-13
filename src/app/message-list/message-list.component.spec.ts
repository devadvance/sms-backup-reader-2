import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';

import { MessageListComponent } from './message-list.component';
import { MessageTypePipe } from '../message-type.pipe';
import { SmsStoreService } from '../sms-store.service';

describe('MessageListComponent', () => {
    let component: MessageListComponent;
    let fixture: ComponentFixture<MessageListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CommonModule],
            declarations: [ MessageListComponent, MessageTypePipe ],
            providers: [SmsStoreService],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MessageListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
