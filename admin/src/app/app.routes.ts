import { Routes } from '@angular/router';
import { UsersComponent } from './users/users.component';
import { RoutePaths } from './constants/route-path.enum';
import { UserFormComponent } from './user-form/user-form.component';
import { ResourceManagerComponent } from './resource-manager/resource-manager.component';
import { TermsComponent } from './terms/terms.component';
import { TermFormComponent } from './term-form/term-form.component';

export const routes: Routes = [
    { path: '', redirectTo: RoutePaths.Users, pathMatch: 'full' },
    { path: RoutePaths.NewUser, component: UserFormComponent },
    { path: RoutePaths.Users, component: UsersComponent },
    { path: 'user/:id', component: UserFormComponent },
    { path: RoutePaths.ResourceManager, component: ResourceManagerComponent },
    { path: RoutePaths.Terms, component: TermsComponent },
    { path: RoutePaths.newTerm, component: TermFormComponent },
    { path: 'term/:id', component: TermFormComponent },



];