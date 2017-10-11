/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { AddExecutableComponent } from './add-executable.component';

describe('AddExecutableComponent', () => {
  let component: AddExecutableComponent;
  let fixture: ComponentFixture<AddExecutableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddExecutableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddExecutableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
