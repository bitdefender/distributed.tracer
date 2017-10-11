/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ExecutableService } from './executable.service';

describe('ExecutableService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExecutableService]
    });
  });

  it('should ...', inject([ExecutableService], (service: ExecutableService) => {
    expect(service).toBeTruthy();
  }));
});
