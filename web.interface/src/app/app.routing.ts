import { Routes, RouterModule } from '@angular/router';

import { NopageComponent } from './nopage/nopage.component';

import { LoginComponent } from './login/login.component';
import { LogoutComponent } from './logout/logout.component';

import { RegisterComponent } from './register/register.component';
import { Err403Component } from './err403/err403.component';
import { Err404Component } from './err404/err404.component';

import { TokensComponent } from './tokens/tokens.component';
import { ExecutablesComponent } from './executables/executables.component';
import { ExecutableDetailsComponent, ExecutablesRoutes } from './executable-details/executable-details.component';
import { AddExecutableComponent } from './add-executable/add-executable.component';
import { UserSettingsComponent } from './user-settings/user-settings.component';
import { TestsComponent } from './tests/tests.component';
import { InfrastructureComponent } from './infrastructure/infrastructure.component';
import { SlideshowComponent } from './slideshow/slideshow.component';

const appRoutes: Routes = [
    { path: '', component: SlideshowComponent },
    { path: 'login', component: LoginComponent },
    { path: 'logout', component: LogoutComponent },
    
    { path: 'register', component: RegisterComponent },
    { path: 'settings', component: UserSettingsComponent },
    { path: 'tokens', component: TokensComponent },
    
    { path: 'err403', component: Err403Component },
    { path: 'err404', component: Err404Component },

    { path: 'tests/:execId/:testId', component: TestsComponent },

    ...ExecutablesRoutes,
    { path: 'executables', component: ExecutablesComponent },
    { path: 'addexecutable', component: AddExecutableComponent },

    { path: 'infrastructure', component: InfrastructureComponent },

    // otherwise redirect to home
    { path: '**', component: NopageComponent }
];

export const Routing = RouterModule.forRoot(appRoutes /*, {enableTracing: true}*/);