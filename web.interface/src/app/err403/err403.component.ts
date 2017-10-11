import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-err403',
  templateUrl: './err403.component.html',
  styleUrls: ['./err403.component.css']
})
export class Err403Component implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
  }

  goHome() {
    this.router.navigate(["/"]);
  }

}
