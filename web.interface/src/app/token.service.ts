import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';


@Injectable()
export class TokenService {

  constructor(private http:Http) { }

  getAll() {
      return this.http.get('/api/tokens', this.jwt()).map((response: Response) => response.json());
  }

  create(token: any) {
      return this.http.post('/api/tokens', token, this.jwt()).map((response: Response) => response.json());
  }

  /*update(user: User) {
      return this.http.put('/api/users/' + user.id, user, this.jwt()).map((response: Response) => response.json());
  }*/

  delete(id: string) {
      return this.http.delete('/api/tokens/' + id, this.jwt()).map((response: Response) => response.json());
  }

  // private helper methods

  private jwt() {
      // create authorization header with jwt token
      let currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (currentUser && currentUser.token) {
          let headers = new Headers({ 'Authorization': 'Bearer ' + currentUser.token });
          return new RequestOptions({ headers: headers });
      }
  }
}
