import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule, Http } from '@angular/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxPaginationModule } from 'ngx-pagination';
import { Ng2FilterPipeModule } from 'ng2-filter-pipe';
import { ClipboardModule } from 'ngx-clipboard';
import { FileUploader } from 'ng2-file-upload';
import { SimpleNotificationsModule  } from 'angular2-notifications';

import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { NopageComponent } from './nopage/nopage.component';

import { Routing } from './app.routing';

import { AuthenticationService } from './authentication.service';
import { UserService } from './user.service';
import { ExecutableService } from './executable.service';
import { TokenService } from './token.service';
import { CorpusService } from './corpus.service';
import { InfrastructureService } from './infrastructure.service';
import { ExtendedHttpService } from './extended-http.service';
import { GraphService } from './graph.service';

import { UsermenuComponent } from './usermenu/usermenu.component';
import { ExecutablesComponent } from './executables/executables.component';
import { ExecutableDetailsComponent } from './executable-details/executable-details.component';
import { AddExecutableComponent } from './add-executable/add-executable.component';

import { FilterExecutablePipe } from './filter-executable.pipe';
import { FileSizePipe } from './file-size.pipe';

import { Err403Component } from './err403/err403.component';
import { Err404Component } from './err404/err404.component';
import { TokensComponent } from './tokens/tokens.component';
import { LogoutComponent } from './logout/logout.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';

import { EqualValidatorDirective } from './equal-validator.directive';
import { ExecutableDetailsGeneralComponent } from './executable-details-general/executable-details-general.component';
import { ExecutableDetailsTestsComponent } from './executable-details-tests/executable-details-tests.component';
import { TestsComponent } from './tests/tests.component';
import { BinaryPipe } from './binary.pipe';
import { TextPipe } from './text.pipe';
import { ExecutableDetailsCorpusComponent } from './executable-details-corpus/executable-details-corpus.component';
import { InfrastructureComponent } from './infrastructure/infrastructure.component';
import { CountDirective } from './count.directive';
import { ExecutableDetailsResourcesComponent } from './executable-details-resources/executable-details-resources.component';
import { SlideshowComponent } from './slideshow/slideshow.component';
import { ExecutableDetailsGraphComponent } from './executable-details-graph/executable-details-graph.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    NopageComponent,
    UsermenuComponent,
    ExecutablesComponent,
    ExecutableDetailsComponent,
    AddExecutableComponent,
    FilterExecutablePipe,
    FileSizePipe,
    Err403Component,
    Err404Component,
    TokensComponent,
    LogoutComponent,
    FileSizePipe,
    BinaryPipe,
    TextPipe,
    UserSettingsComponent,
    EqualValidatorDirective,
    ExecutableDetailsGeneralComponent,
    ExecutableDetailsTestsComponent,
    TestsComponent,
    ExecutableDetailsCorpusComponent,
    InfrastructureComponent,
    CountDirective,
    ExecutableDetailsResourcesComponent,
    SlideshowComponent,
    ExecutableDetailsGraphComponent,
    TextPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
//    MaterialModule.forRoot(),
    NgbModule.forRoot(),
    NgxPaginationModule,
    Ng2FilterPipeModule,
    ClipboardModule,
    SimpleNotificationsModule.forRoot(),
    Routing
  ],
  providers: [
    AuthenticationService,
    UserService,
    ExecutableService,
    TokenService,
    CorpusService,
    InfrastructureService,
    GraphService,
    { provide: Http, useClass: ExtendedHttpService }
  ],
  bootstrap: [AppComponent]
})

export class AppModule { }
