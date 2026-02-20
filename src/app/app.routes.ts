import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { IssueComponent } from './issue/issue.component';
import { ReceiveComponent } from './receive/receive.component';
import { GroupComponent } from './group/group.component';
import { SectionComponent } from './section/section.component';
import { PartMasterComponent } from './part-master/part-master.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { VendorComponent } from './vendor/vendor.component';
import { ControlLotComponent } from './control-lot/control-lot.component';
import { ReportComponent } from './report/report.component';


export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'signin',
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
    path: 'group',
    component: GroupComponent,
  },
  {
    path: 'section',
    component: SectionComponent,
  },
  {
    path: 'partmaster',
    component: PartMasterComponent,
  },
  {
    path: 'signup',
    component: SignUpComponent,
  },
  {
    path: 'vendor',
    component: VendorComponent,
  },
  {
    path: 'control-lot',
    component: ControlLotComponent,
  },

  {
    path: 'report',
    component: ReportComponent,
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
