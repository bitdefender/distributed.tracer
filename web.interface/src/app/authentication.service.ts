import { Injectable } from '@angular/core';
import { Http, Headers, Response, RequestOptions } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import { Subject }    from 'rxjs/Subject';

import { UserService } from './user.service';

import { User } from './models/user.js';

import 'rxjs/add/operator/map'
 
@Injectable()
export class AuthenticationService {
    private currentUserSource = new Subject<User>();
    
    currentUser = this.currentUserSource.asObservable();
 
    constructor(private http: Http, private userService:UserService) { }
 
    updateAuthenticatedUser() {
        if (null == localStorage.getItem('currentUser')) {
            this.currentUserSource.next(null);
            return;
        }
        
        //let _cthis = this;
        this.userService.getCurrent().subscribe(
            user => this.currentUserSource.next(user)
        );
    }
 
    login(username: string, password: string) {
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        return this.http.post(
                '/api/users/authenticate', 
                JSON.stringify({ username: username, password: password }),
                options
            ).map((response: Response) => {
                // login successful if there's a jwt token in the response
                let user = response.json();
                if (user && user.token) {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    this.updateAuthenticatedUser();
                }
            });
    }
 
    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');
        this.updateAuthenticatedUser();
    }
}