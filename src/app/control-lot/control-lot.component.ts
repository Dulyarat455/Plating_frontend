import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router,RouterModule } from '@angular/router';

import Swal from 'sweetalert2';
import config from '../../config';


type controlLotRow = {
  id: number;
  name: string;
};


@Component({
  selector: 'app-control-lot',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './control-lot.component.html',
  styleUrl: './control-lot.component.css'
})
export class ControlLotComponent {

  constructor(private http: HttpClient, private router: Router) {}
  
    name: string = '';
    controlLots: controlLotRow[] = []
    isLoading = false;
  
  
    filteredControlLot: controlLotRow[] = [];
    searchText: string = '';
  
    ngOnInit() {
      this.fetchData();
    }



    fetchData() {
      this.http.get(config.apiServer + '/api/controlLot/list').subscribe({
        next: (res: any) => {
        this.controlLots = (res.results || []).map((r: any) => ({
            id: r.id,
            name: r.name,
          }))
  
        this.filteredControlLot = [...this.controlLots];
  
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
        this.filteredControlLot = [...this.controlLots];
        return;
      }
    
      this.filteredControlLot = this.controlLots.filter(g =>
        g.name.toLowerCase().includes(q)
      );
    }



    openAddControlLotSwal() {
      Swal.fire({
        title: 'Add Control-Lot',
        html: `
          <div style="text-align:left">
            <label style="font-weight:700; margin-bottom:6px; display:block;">Control-Lot name</label>
            <input id="swalControlLotName" class="swal2-input" placeholder="กรอกชื่อ Control-Lot" />
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#2563eb',
        preConfirm: () => {
          const input = document.getElementById('swalControlLotName') as HTMLInputElement | null;
          const name = (input?.value || '').trim();
    
          if (!name) {
            Swal.showValidationMessage('โปรดกรอกชื่อ Control-Lot');
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
    
        this.http.post(config.apiServer + '/api/controlLot/create', payload).subscribe({
          next: () => {
            this.isLoading = false;
    
            Swal.fire({
              title: 'Add Control-Lot Success',
              text: 'Control-Lot ถูกเพิ่มเข้าฐานข้อมูลเรียบร้อย',
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
