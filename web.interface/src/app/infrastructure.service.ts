import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';

@Injectable()
export class InfrastructureService {

  constructor(private http: Http) { }

  getStatus() {
    return this.http.get(
      '/api/infrastructure',
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  getExecStatus(id) {
    return this.http.get(
      '/api/infrastructure/' + id,
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  ensureRunning(id, values) {
    return this.http.post(
      '/api/infrastructure/' + id,
      values,
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  runTest(id) {
    return this.http.post(
      '/api/infrastructure/run/' + id, {},
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
    });
  }

  terminateProcess(pmid) {
    return this.http.delete(
      '/api/infrastructure/' + pmid,
      this.jwt(false)
    ).map((response: Response) => {
      return response.json();
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
