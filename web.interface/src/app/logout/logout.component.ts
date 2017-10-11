import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from 'angular2-notifications';

import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css']
})
export class LogoutComponent implements OnInit {

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private notificationsService:NotificationsService
    ) { }
 

  ngOnInit() {
    this.authenticationService.logout();
    this.notificationsService.info(
      "Logout!",
      "Bye bye"
    );
    this.router.navigate(["/"]);
  }

}
