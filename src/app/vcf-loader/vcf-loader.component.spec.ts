import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { VcfLoaderComponent } from './vcf-loader.component';

describe('VcfLoaderComponent', () => {
  let component: VcfLoaderComponent;
  let fixture: ComponentFixture<VcfLoaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ VcfLoaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VcfLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
