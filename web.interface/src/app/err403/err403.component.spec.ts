/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { Err403Component } from './err403.component';

describe('Err403Component', () => {
  let component: Err403Component;
  let fixture: ComponentFixture<Err403Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Err403Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Err403Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
