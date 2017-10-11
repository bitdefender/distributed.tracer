import { Component, OnInit } from '@angular/core';
import { NgbDropdown, NgbDropdownConfig } from '@ng-bootstrap/ng-bootstrap';

import { AuthenticationService } from '../authentication.service';

@Component({
  selector: 'app-usermenu',
  templateUrl: './usermenu.component.html',
  styleUrls: ['./usermenu.component.css'],
  providers: [NgbDropdown, NgbDropdownConfig]
})

export class UsermenuComponent implements OnInit {
  logged = false;
  userName = "";
  
  userMenuOpen = false;
  
  constructor(private ngbDropdown:NgbDropdown, private authenticationService:AuthenticationService) {
  }

  ngOnInit() {
    this.authenticationService.currentUser.subscribe(user => {
      if (null == user) {
        this.logged = false;
        return;
      }
      
      this.logged = true;
      this.userName = user.firstName;
    });
    
    this.authenticationService.updateAuthenticatedUser();
  }

}
