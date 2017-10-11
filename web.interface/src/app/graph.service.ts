import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response, URLSearchParams } from '@angular/http';


@Injectable()
export class GraphService {

    constructor(private http: Http) { }
    
    getGraph(id: string) {
        return this.http.get(
            '/api/graph/' + id + '?type=SVG', 
            this.jwt(false)
        ).map((response: Response) => {
            return response.text();
        });
    }

    // private helper methods
    private jwt(sendJson: boolean) {
        // create authorization header with jwt token
        let hdrs = {};
        
        if (sendJson) {
            hdrs['Content-Type'] = 'application/json';
        }
        
        let currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.token) {
            hdrs['Authorization'] = 'Bearer ' + currentUser.token;
        }
        
        let ro = new RequestOptions({ headers: new Headers(hdrs)});
        return ro;
    }

}
