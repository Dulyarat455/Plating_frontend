import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router,RouterModule } from '@angular/router';


import Swal from 'sweetalert2';
import config from '../../config';


type groupRow = {
  id: number;
  name: string;
};



@Component({
  selector: 'app-group',
  standalone: true,
  imports: [FormsModule,RouterModule],
  templateUrl: './group.component.html',
  styleUrl: './group.component.css'
})
export class GroupComponent {

  constructor(private http: HttpClient, private router: Router) {}

  name: string = '';
  groups: groupRow[] = []
  isLoading = false;


  filteredGroups: groupRow[] = [];
  searchText: string = '';


  ngOnInit() {
     this.fetchData();
  }


  fetchData(){

    this.http.get(config.apiServer + '/api/group/list').subscribe({
      next: (res: any) => {
      this.groups = (res.results || []).map((r: any) => ({
          id: r.id,
          name: r.name,
        }))
      this.filteredGroups = [...this.groups];

      },
      error: (err) => {
        Swal.fire({
          title: 'Error',
          text: err.message,
          icon: 'error',
        });
      },
    });

  }





onSearch() {
  const q = this.searchText.trim().toLowerCase();

  if (!q) {
    this.filteredGroups = [...this.groups];
    return;
  }

  this.filteredGroups = this.groups.filter(g =>
    g.name.toLowerCase().includes(q)
  );
}




openAddGroupSwal() {
  Swal.fire({
    title: 'Add Group',
    html: `
      <div style="text-align:left">
        <label style="font-weight:700; margin-bottom:6px; display:block;">Group name</label>
        <input id="swalGroupName" class="swal2-input" placeholder="กรอกชื่อ group" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2563eb',
    preConfirm: () => {
      const input = document.getElementById('swalGroupName') as HTMLInputElement | null;
      const name = (input?.value || '').trim();

      if (!name) {
        Swal.showValidationMessage('โปรดกรอกชื่อ group');
        return;
      }
      return name;
    }
  }).then((result) => {
    if (!result.isConfirmed) return;

    const name = String(result.value || '').trim();

    this.isLoading = true;

    const payload = {
      role: 'admin',
      name
    };

    this.http.post(config.apiServer + '/api/group/create', payload).subscribe({
      next: () => {
        this.isLoading = false;

        Swal.fire({
          title: 'Add Group Success',
          text: 'Group ถูกเพิ่มเข้าฐานข้อมูลเรียบร้อย',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });

        this.fetchData();
      },
      error: (err) => {
        this.isLoading = false;

        Swal.fire({
          title: 'ไม่สามารถบันทึกได้',
          text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
          icon: 'error',
        });
      }
    });
  });
}




}
