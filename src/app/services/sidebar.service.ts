import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _open$ = new BehaviorSubject<boolean>(true); // default เปิด
  open$ = this._open$.asObservable();

  setOpen(v: boolean) { this._open$.next(v); }
  toggle() { this._open$.next(!this._open$.value); }
  get value() { return this._open$.value; }
}
