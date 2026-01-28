import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { IssueComponent } from './issue/issue.component';
import { ReceiveComponent } from './receive/receive.component';

export const routes: Routes = [
  {
    path: '',
    component: SignInComponent,
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'issue',
    component: IssueComponent,
  },
  {
    path: 'receive',
    component: ReceiveComponent,
  },
  
  {
    path: '404',
    component: NotFoundComponent,
  },
  {
    path: '**',
    redirectTo: '404',
  },

  // {
  //   path: '**',
  //   redirectTo: '',
  // },
];
