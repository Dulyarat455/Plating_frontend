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




    confirmDeleteControlLot(item: controlLotRow) {
      Swal.fire({
        title: 'Delete ControlLot?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        html: `
          <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
            <div><b>ControlLot Name:</b> ${item.name}</div>
          </div>
        `
      }).then((r) => {
        if (!r.isConfirmed) return;
    
        this.isLoading = true;
    
        // ✅ route เป็น POST → ส่ง body ตรงๆ
        this.http.post(config.apiServer + '/api/controlLot/delete', { id: item.id })
          .subscribe({
            next: () => {
              this.isLoading = false;
              Swal.fire({ icon: 'success', title: 'Deleted', timer: 900, showConfirmButton: false });
              this.fetchData();
            },
            error: (err) => {
              this.isLoading = false;
              Swal.fire({
                icon: 'error',
                title: 'ลบไม่สำเร็จ',
                text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
              });
            }
          });
      });
    }






    confirmEditControlLot(item: controlLotRow) {
      const labelStyle = `font-weight:800; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
      const inputStyle = `
        width:100%;
        height:44px;
        padding:10px 12px;
        border:1px solid #cbd5e1;
        border-radius:12px;
        outline:none;
        font-size:14px;
        box-sizing:border-box;
        background:#fff;
      `;
      const cardStyle = `
        background:#f8fafc;
        border:1px solid rgba(2,6,23,.08);
        border-radius:14px;
        padding:14px;
      `;
      const hintStyle = `font-size:12px; color:#64748b; margin-top:6px;`;
    
      Swal.fire({
        title: 'Edit ControlLot',
        width: 620,
        padding: '18px',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        html: `
          <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
            <div style="${cardStyle}">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                <div style="
                  width:34px; height:34px; border-radius:10px;
                  display:flex; align-items:center; justify-content:center;
                  background:rgba(37,99,235,.12); color:#2563eb; font-weight:900;
                ">✎</div>
    
                <div>
                  <div style="font-weight:900; font-size:14px; color:#0f172a;">Update ControlLot</div>
                  <div style="font-size:12px; color:#64748b;">แก้ชื่อ ControlLOt แล้วกด Save</div>
                </div>
              </div>
    
              <label style="${labelStyle}">ControlLot Name <span style="color:#ef4444;">*</span></label>
              <input id="swalControlLotName" style="${inputStyle}"
                value="${String(item.name || '').replace(/"/g, '&quot;')}"
                placeholder="เช่น Test ENG / งานแยกชุบ "
                autocomplete="off"
              />
              <div style="${hintStyle}">ห้ามเว้นวรรคหน้า/หลัง และชื่อห้ามซ้ำ</div>
            </div>
          </div>
        `,
        didOpen: () => {
          const el = document.getElementById('swalControlLotName') as HTMLInputElement | null;
          el?.focus();
          el?.select();
    
          // Enter = Save
          el?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter') Swal.clickConfirm();
          });
        },
        preConfirm: () => {
          const nameEl = document.getElementById('swalControlLotName') as HTMLInputElement | null;
          const name = (nameEl?.value || '').trim();
    
          if (!name) {
            Swal.showValidationMessage('โปรดกรอก ControlLot Name');
            return;
          }
          return { id: item.id, name };
        }
      }).then((r) => {
        if (!r.isConfirmed) return;
    
        const payload = r.value as { id: number; name: string };
    
        this.isLoading = true;
    
        this.http.put(config.apiServer + '/api/controlLot/edit', payload).subscribe({
          next: () => {
            this.isLoading = false;
    
            Swal.fire({
              icon: 'success',
              title: 'Saved',
              text: 'แก้ไข ControlLot เรียบร้อย',
              timer: 1000,
              showConfirmButton: false
            });
    
            // ✅ refresh
            this.fetchData();
          },
          error: (err) => {
            this.isLoading = false;
    
            Swal.fire({
              icon: 'error',
              title: 'แก้ไขไม่สำเร็จ',
              text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
            });
          }
        });
      });
    }












    



  
  

}
