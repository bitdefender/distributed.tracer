import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { UserService } from '../user.service';

@Component({
    //moduleId: module.id,
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
 
export class RegisterComponent {
    model: any = {
        permissions : {}
    };
    loading = false;
 
    constructor(
        private router: Router,
        private userService: UserService) { }
 
    register() {
        this.loading = true;

        let newUser = JSON.parse(JSON.stringify(this.model));
        newUser.permissions = [];

        for (var perm in this.model.permissions) {
            if (this.model.permissions[perm]) {
                newUser.permissions.push(perm);
            }
        }

        this.userService.create(newUser)
            .subscribe(
                data => {
                    // set success message and pass true paramater to persist the message after redirecting to the login page
                    this.router.navigate(['/login']);
                },
                error => {
                    this.loading = false;
                });
    }
}