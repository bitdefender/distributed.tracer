/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ExtendedHttpService } from './extended-http.service';

describe('ExtendedHttpService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExtendedHttpService]
    });
  });

  it('should ...', inject([ExtendedHttpService], (service: ExtendedHttpService) => {
    expect(service).toBeTruthy();
  }));
});
