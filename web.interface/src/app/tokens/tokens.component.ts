import { ChangeDetectionStrategy, Component, Input, OnInit } from "@angular/core";
import { PaginationInstance } from 'ngx-pagination';
import { NotificationsService } from 'angular2-notifications';

import { TokenService } from '../token.service';
import { AuthenticationService } from '../authentication.service';

import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-tokens',
  templateUrl: './tokens.component.html',
  styleUrls: ['./tokens.component.css']
})
export class TokensComponent implements OnInit {

  public filter: string = '';
  public config: PaginationInstance = {
      id: 'advanced',
      itemsPerPage: 10,
      currentPage: 1
  };

  private closeResult: string;

  availablePermissions: any = {
    execRead : false,
    execWrite : false,
    tokens : false,
    users : false
  };
  model: any[] = [];
  newtoken: any = {
    permissions: {}
  };
  loading = false;

  constructor(
    private modalService: NgbModal, 
    private tokenService:TokenService, 
    private authenticationService:AuthenticationService,
    private notificationsService:NotificationsService
  ) { }

  private clearToken() {
    this.newtoken = {
      permissions : {}
    };
  }

  ngOnInit() {
    this.authenticationService.currentUser.subscribe(user => {
      this.availablePermissions = {
        execRead : false,
        execWrite : false,
        tokens : false,
        users : false
      };
      if (null == user) {
        return;
      }

      for (let perm in user.permissions) {
        this.availablePermissions[user.permissions[perm]] = true;
      }
    });
    
    this.authenticationService.updateAuthenticatedUser();

    this.loadData();
  }

  onPageChange(number: number) {
    this.config.currentPage = number;
  }

  open(content) {
    this.modalService.open(content).result.then((result) => {
      if ('OK' == result) {
        this.createToken();
      } else {
        this.clearToken();
      }
    }, (reason) => {
      this.clearToken();
    });
  }

  createToken() {
    this.tokenService.create(this.newtoken).subscribe(
      ret => {
        this.clearToken();
        this.loadData();
        this.notificationsService.success(
          'Token created',
          'Token ' + ret.name + ' ready'
        );
      },
      error => {
        this.clearToken();
        this.notificationsService.error(
          'Could not create token',
          error
        );
      }
    );
  }

  deleteToken(tokenId) {
    this.tokenService.delete(tokenId).subscribe(
      data => {
        this.loadData();
        this.notificationsService.info(
          'Token removed',
          'Please update your scripts accordingly!'
        );
      },
      error => {
        this.loadData();
        this.notificationsService.error(
          'Could not delete token',
          error
        );
      }
    );
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }

  loadData() {
    this.loading = true;
    this.tokenService.getAll()
      .subscribe(
        data => {
          this.model = data;
          this.loading = false;
        },
        error => {
          this.loading = false;
        }
      );
  }
}
