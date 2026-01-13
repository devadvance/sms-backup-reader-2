import { TestBed } from '@angular/core/testing';

import { VcfLoaderService } from './vcf-loader.service';

describe('VcfLoaderService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VcfLoaderService],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(VcfLoaderService);
    expect(service).toBeTruthy();
  });
});
