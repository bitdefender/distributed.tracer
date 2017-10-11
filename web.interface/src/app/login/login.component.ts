import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NotificationsService } from 'angular2-notifications';
 
import { AuthenticationService } from '../authentication.service';
 
@Component({
    //moduleId: module.id,
    templateUrl: 'login.component.html',
    selector: 'app-login',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
    model: any = {};
    loading = false;
    returnUrl: string;
 
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authenticationService: AuthenticationService,
        private notificationsService:NotificationsService
    ) { }
 
    ngOnInit() {
        // reset login status
        this.authenticationService.logout();
 
        // get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }
 
    login() {
        this.loading = true;
        this.authenticationService.login(this.model.username, this.model.password)
            .subscribe(
                data => {
                    this.loading = false;
                    this.notificationsService.success(
                        "Login successful!",
                        "Welcome back"
                    );
                    this.router.navigate([this.returnUrl]);
                },
                error => {
                    this.loading = false;
                    this.notificationsService.error(
                        "Login unsuccessful!",
                        "Incorrect user or password"
                    );
                    this.router.navigate(["/login"]);
                });
    }
}
