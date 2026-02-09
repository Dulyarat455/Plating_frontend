import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import config from '../../config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authStatus = new BehaviorSubject<boolean>(false);
  authStatus$ = this.authStatus.asObservable();


   // true ถ้ามี token ตั้งแต่เปิดหน้า
   private loggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem('plating_token'));
   isLoggedIn$ = this.loggedIn$.asObservable();


  // เพิ่ม BehaviorSubject สำหรับแจ้ง component refresh
  private refreshComponents = new BehaviorSubject<boolean>(false);
  refreshComponents$ = this.refreshComponents.asObservable();

  private authStateChange = new BehaviorSubject<boolean>(false);

  // เพิ่ม Subject สำหรับ auth state
  private authState = new BehaviorSubject<{
    isAuthenticated: boolean;
    token: string | null;
    empNo: string | null;
  }>({
    isAuthenticated: false,
    token: null,
    empNo: null,
  });
  authState$ = this.authState.asObservable();
  
  constructor(private router: Router, private http: HttpClient) {}

  login(userData: any) {
    //เปลี่ยนชื่อ token ตาม Project ที่ทำด้วย
    localStorage.setItem('plating_token', userData.token);
    localStorage.setItem('plating_name', userData.name);
    localStorage.setItem('plating_userId', userData.id);
    localStorage.setItem('plating_empNo', userData.empNo);
    localStorage.setItem('plating_groupId', userData.groupId);
    localStorage.setItem('plating_groupName', userData.groupName);
    localStorage.setItem('plating_sectionId', userData.sectionId);
    localStorage.setItem('plating_sectionName', userData.sectionName);


    this.authStatus.next(true);
    this.refreshComponents.next(true);
  }

  logout() {
    localStorage.removeItem('plating_token');
    localStorage.removeItem('plating_name');
    localStorage.removeItem('plating_userId');
    localStorage.removeItem('plating_empNo');
    localStorage.removeItem('plating_groupId');
    localStorage.removeItem('plating_groupName');
    localStorage.removeItem('plating_sectionId');
    localStorage.removeItem('plating_sectionName');
    this.authStatus.next(false);
    window.location.href = '/PlatingPress';
    // this.refreshComponents.next(true); // แจ้ง components ให้ refresh
    // this.router.navigate(['/']);
  }

  getUserLevel() {
    const token = localStorage.getItem('angular_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(config.apiServer + '/api/user/getLevelFromToken', {
      headers,
    });
  }

  updateAuthStatus(status: boolean) {
    this.authStatus.next(status);
  }

  notifyLogin() {
    this.authStateChange.next(true);
  }
}
