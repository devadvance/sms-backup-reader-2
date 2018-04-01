import { TestBed, inject } from '@angular/core/testing';


import { VcfLoaderService } from './vcf-loader.service';

describe('VcfLoaderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VcfLoaderService]
    });
  });

  it('should be created', inject([VcfLoaderService], (service: VcfLoaderService) => {
    expect(service).toBeTruthy();
  }));
});
