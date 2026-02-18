import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router,RouterModule } from '@angular/router';


import Swal from 'sweetalert2';
import config from '../../config';


type sectionRow = {
  id: number;
  name: string;
  state: string;
  createdAt: string;
  updateAt: string;
};

@Component({
  selector: 'app-section',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css'
})
export class SectionComponent {

  constructor(private http: HttpClient, private router: Router) {}

  name: string = '';
  sections: sectionRow[] = []
  isLoading = false;


  filteredSections: sectionRow[] = [];
  searchText: string = '';



  ngOnInit() {
    this.fetchData();
  }


  fetchData() {
    this.http.get(config.apiServer + '/api/section/list').subscribe({
      next: (res: any) => {
      this.sections = (res.results || []).map((r: any) => ({
          id: r.id,
          name: r.name,
        }))

      this.filteredSections = [...this.sections];

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



  add(){
    // 1) validate 
      if (!this.name) {
        Swal.fire({
          title: 'ตรวจสอบข้อมูล',
          text: 'โปรดกรอกข้อมูลให้ครบถ้วน',
          icon: 'error',
        });
        return;
      }

      this.isLoading = true;

      const payload = {
        role: "admin",
        name: this.name
      }

      this.http.post(config.apiServer + '/api/section/create', payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;

          Swal.fire({
                    title: 'Add Section Success',
                    text: 'Section ถูกเพิ่มเข้าฐานข้อมูลเรียบร้อย',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: true,
                  })
                 
                  this.fetchData();
                
        }, error: (err) => {
       this.isLoading = false;

        Swal.fire({
                   title: 'ไม่สามารถบันทึกได้',
                   text: err.error?.message,
                   icon: 'error',
        });
        },
      })
}


onSearch() {
  const q = this.searchText.trim().toLowerCase();

  if (!q) {
    this.filteredSections = [...this.sections];
    return;
  }

  this.filteredSections = this.sections.filter(g =>
    g.name.toLowerCase().includes(q)
  );
}



openAddGroupSwal() {
  Swal.fire({
    title: 'Add Section',
    html: `
      <div style="text-align:left">
        <label style="font-weight:700; margin-bottom:6px; display:block;">Section name</label>
        <input id="swalSectionName" class="swal2-input" placeholder="กรอกชื่อ Section" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#2563eb',
    preConfirm: () => {
      const input = document.getElementById('swalSectionName') as HTMLInputElement | null;
      const name = (input?.value || '').trim();

      if (!name) {
        Swal.showValidationMessage('โปรดกรอกชื่อ Section');
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

    this.http.post(config.apiServer + '/api/section/create', payload).subscribe({
      next: () => {
        this.isLoading = false;

        Swal.fire({
          title: 'Add Section Success',
          text: 'Section ถูกเพิ่มเข้าฐานข้อมูลเรียบร้อย',
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
