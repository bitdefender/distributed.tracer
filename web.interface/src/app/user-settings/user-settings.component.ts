import { Component, OnInit } from '@angular/core';
import { NotificationsService } from 'angular2-notifications';

import { UserService } from '../user.service';

@Component({
  selector: 'app-user-settings',
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  loading : boolean = false;
  userLoading : boolean = false;
  passLoading : boolean = false;
  oldModel : any = {
    firstName : "",
    lastName : ""
  };
  model : any = {
    firstName : "",
    lastName: ""
  };
  passModel : any = {
    oldPass : "",
    newPass : "",
    conPass : ""
  };

  constructor(
    private userService: UserService,
    private notificationsService:NotificationsService
    ) { }

  ngOnInit() {
    this.loadData();
  }

  clearUserForm() {
    this.model = {
      firstName : this.oldModel.firstName,
      lastName : this.oldModel.lastName
    };
  }

  clearPassForm() {
    this.passModel = {
      oldPass : "",
      newPass : "",
      conPass : ""
    };
  }

  updateUser() {
    this.userLoading = true;

    this.userService.updateCurrent(this.model)
      .subscribe(data => {
        this.userLoading = false;
        this.notificationsService.success(
          "User info changed!",
          "You have changed your user information"
        );
      },
      err => {
        this.userLoading = false;
        this.notificationsService.error(
          "User info not changed!",
          err.error
        );
      });
  }

  updatePass() {
    this.passLoading = true;

    if (this.passModel.newPass != this.passModel.conPass) {
      this.passLoading = false;
      this.notificationsService.error(
        "Couldn't set new password!",
        "You didn't re-typed the new password correctly."
      );
      return;
    }

    let upd = {
      oldPass : this.passModel.oldPass,
      newPass : this.passModel.newPass
    };

    this.userService.updateCurrent(upd)
      .subscribe(data => {
        this.passLoading = false;
        this.notificationsService.success(
          "Password changed!",
          "You have changed your password"
        );
      },
      err => {
        this.passLoading = false;
        this.notificationsService.error(
          "Password was not changed!",
          err.error
        );
      });
  }

  loadData() {
    this.loading = true;
    this.userService.getCurrent().subscribe(
      data => {
        this.oldModel = {
          firstName : data.firstName,
          lastName : data.lastName
        };
        this.clearUserForm();
        this.loading = false;
      },
      error => {
        this.loading = false;
      }
    );
  }

}
