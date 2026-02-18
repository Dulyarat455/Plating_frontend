import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router,RouterModule } from '@angular/router';


import Swal from 'sweetalert2';
import config from '../../config';



type partMasterRow = {
  id: number;
  itemNo: string;
  itemName: string;
  groupId: number;
  groupName: string;
  createdAt: string;
};

type groupRow = {
  id: number;
  name: string;
};

@Component({
  selector: 'app-part-master',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './part-master.component.html',
  styleUrl: './part-master.component.css'
})
export class PartMasterComponent {

  constructor(private http: HttpClient, private router: Router) {}


  partMasters: partMasterRow[] = [];
  groups: groupRow[] = [];
  isLoading = false;
  

  // ฟิลเตอร์ (เลือกใช้กี่อันก็ได้)
  filterItemNo = '';
  filterItemName = '';
  filterGroupId: number | 'all' = 'all';

  // เก็บข้อมูลต้นฉบับ + ข้อมูลที่ถูกกรอง
  partMastersAll: partMasterRow[] = [];
  partMastersView: partMasterRow[] = [];





  ngOnInit() {
      this.fetchData();
      this.fetchGroup();

  }


  fetchData() {
    this.http.get(config.apiServer + '/api/partMaster/list').subscribe({
      next: (res: any) => {
        this.partMastersAll = (res.results || []).map((r: any) => ({
          id: r.id,
          itemNo: r.itemNo,
          itemName: r.itemName,
          groupId: r.groupId,
          groupName: r.groupName,
          createdAt: r.createdAt,
        }));
  
        // ✅ apply filter หลังโหลด
        this.applyFilters();
      },
      error: (err) => {
        Swal.fire({ title: 'Error', text: err.message, icon: 'error' });
      },
    });
  }
  


  fetchGroup(){
    this.http.get(config.apiServer + '/api/group/list').subscribe({
      next: (res: any) => {
      this.groups = (res.results || []).map((r: any) => ({
          id: r.id,
          name: r.name
        }))
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




  applyFilters() {
    const itemNoQ = (this.filterItemNo || '').trim().toLowerCase();
    const itemNameQ = (this.filterItemName || '').trim().toLowerCase();
    const groupIdQ = this.filterGroupId;
  
    this.partMastersView = (this.partMastersAll || []).filter(x => {
      // ✅ ใช้เงื่อนไขเฉพาะอันที่ user กรอก (dynamic)
      if (itemNoQ && !String(x.itemNo || '').toLowerCase().includes(itemNoQ)) return false;
      if (itemNameQ && !String(x.itemName || '').toLowerCase().includes(itemNameQ)) return false;
      if (groupIdQ !== 'all' && Number(x.groupId) !== Number(groupIdQ)) return false;
      return true;
    });
  }
  


  resetFilters() {
    this.filterItemNo = '';
    this.filterItemName = '';
    this.filterGroupId = 'all';
    this.applyFilters();
  }




  exportExcel() {
    const payload = {
      filters: {
        itemNo: (this.filterItemNo || '').trim() || null,
        itemName: (this.filterItemName || '').trim() || null,
        groupId: this.filterGroupId === 'all' ? null : Number(this.filterGroupId),
      }
    };
  
    this.isLoading = true;
  
    this.http.post(
      config.apiServer + '/api/partMaster/exportExcel',
      payload,
      { responseType: 'blob' } // ✅ ได้ไฟล์กลับมา
    ).subscribe({
      next: (blob) => {
        this.isLoading = false;
  
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
  
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth()+1).padStart(2,'0');
        const day = String(d.getDate()).padStart(2,'0');
  
        a.download = `PartMaster_${y}${m}${day}.xlsx`;
        a.click();
  
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          title: 'Export failed',
          text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
          icon: 'error',
        });
      }
    });
  }
  






  openAddPartMasterSwal() {
    if (!this.groups?.length) this.fetchGroup();
  
    const optionsHtml = (this.groups || [])
      .map(g => `<option value="${g.id}">${g.name}</option>`)
      .join('');
  
    const labelStyle = `font-weight:800; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
    const inputStyle = `
      width:100%;
      height:46px;
      padding:10px 12px;
      border:1px solid #cbd5e1;
      border-radius:10px;
      outline:none;
      font-size:15px;
      box-sizing:border-box;
      background:#fff;
    `;
    const hintStyle = `font-size:12px; color:#64748b; margin-top:6px;`;
    const cardStyle = `
      background:#f8fafc;
      border:1px solid rgba(2,6,23,.08);
      border-radius:14px;
      padding:18px;
    `;
  
    Swal.fire({
      title: 'Add PartMaster',
      width: 760,                // ✅ ไม่แคบ ไม่เกิด scroll
      padding: '24px',
      backdrop: true,
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
  
          <div style="${cardStyle}">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <div style="
                width:34px; height:34px; border-radius:10px;
                display:flex; align-items:center; justify-content:center;
                background:rgba(37,99,235,.12); color:#2563eb; font-weight:900;
              ">
                +
              </div>
              <div>
                <div style="font-weight:900; font-size:14px; color:#0f172a;">New PartMaster</div>
                <div style="font-size:12px; color:#64748b;">กรอกข้อมูลให้ครบ แล้วกด Save</div>
              </div>
            </div>
  
            <!-- Row: ItemNo + Group -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label style="${labelStyle}">Item No <span style="color:#ef4444;">*</span></label>
                <input id="swalItemNo" style="${inputStyle}" placeholder="เช่น 1000001234" autocomplete="off" />
                <div style="${hintStyle}">ตัวอย่าง: 1000001234</div>
              </div>
  
              <div>
                <label style="${labelStyle}">Group <span style="color:#ef4444;">*</span></label>
                <select id="swalGroupId" style="${inputStyle}">
                  <option value="" disabled selected>-- เลือก Group --</option>
                  ${optionsHtml}
                </select>
                <div style="${hintStyle}">เลือกตามประเภทงาน</div>
              </div>
            </div>
  
            <!-- ItemName -->
            <div style="margin-top:12px;">
              <label style="${labelStyle}">Item Name <span style="color:#ef4444;">*</span></label>
              <input id="swalItemName" style="${inputStyle}" placeholder="เช่น 31ST-PL20S-020-1Y-CAR" autocomplete="off" />
              <div style="${hintStyle}">ตัวอย่าง: 31ST-PL20S-020-1Y-CAR</div>
            </div>
  
          </div>
  
          <div style="margin-top:10px; font-size:12px; color:#94a3b8;">
            <span style="color:#ef4444;">*</span> จำเป็นต้องกรอก
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        // focus ช่องแรก
        (document.getElementById('swalItemNo') as HTMLInputElement | null)?.focus();
  
        // Enter เพื่อ Save
        const onEnter = (e: KeyboardEvent) => {
          if (e.key === 'Enter') Swal.clickConfirm();
        };
        (document.getElementById('swalItemNo') as HTMLInputElement | null)?.addEventListener('keydown', onEnter);
        (document.getElementById('swalItemName') as HTMLInputElement | null)?.addEventListener('keydown', onEnter);
      },
      preConfirm: () => {
        const itemNoEl = document.getElementById('swalItemNo') as HTMLInputElement | null;
        const itemNameEl = document.getElementById('swalItemName') as HTMLInputElement | null;
        const groupEl = document.getElementById('swalGroupId') as HTMLSelectElement | null;
  
        const itemNo = (itemNoEl?.value || '').trim();
        const itemName = (itemNameEl?.value || '').trim();
        const groupId = (groupEl?.value || '').trim();
  
        if (!itemNo) {
          Swal.showValidationMessage('โปรดกรอก Item No');
          return;
        }
        if (!itemName) {
          Swal.showValidationMessage('โปรดกรอก Item Name');
          return;
        }
        if (!groupId) {
          Swal.showValidationMessage('โปรดเลือก Group');
          return;
        }
  
        return { itemNo, itemName, groupId: Number(groupId) };
      }
    }).then((result) => {
      if (!result.isConfirmed) return;
  
      const { itemNo, itemName, groupId } = result.value as { itemNo: string; itemName: string; groupId: number };
  
      this.isLoading = true;
  
      const payload = { role: 'admin', itemNo, itemName, groupId };
  
      this.http.post(config.apiServer + '/api/partMaster/create', payload).subscribe({
        next: () => {
          this.isLoading = false;
  
          Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: 'เพิ่ม PartMaster เรียบร้อย',
            timer: 1200,
            showConfirmButton: false
          });
  
          this.fetchData();
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'บันทึกไม่สำเร็จ',
            text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
          });
        }
      });
    });
  }
  




  openImportExcelSwal() {
    Swal.fire({
      title: 'Import PartMaster (Excel)',
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
          <label style="font-weight:700; margin-bottom:6px; display:block;">
            Excel file (.xlsx)
          </label>
          <input id="swalExcelFile" type="file" accept=".xlsx,.xls"
            class="swal2-file" style="width:100%;" />
  
          <div style="margin-top:10px; font-size:12px; color:#6b7280;">
            Header ต้องมี: <b>ItemNo</b>, <b>ItemName</b>, <b>Group</b>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Import',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const fileEl = document.getElementById('swalExcelFile') as HTMLInputElement | null;
        const file = fileEl?.files?.[0];
  
        if (!file) {
          Swal.showValidationMessage('โปรดเลือกไฟล์ Excel');
          return;
        }
        return { file };
      }
    }).then((result) => {
      if (!result.isConfirmed) return;
  
      const { file } = result.value as { file: File };
  
      const fd = new FormData();
      fd.append('file', file);
      fd.append('role', 'admin');
  
      this.isLoading = true;
  
      this.http.post(config.apiServer + '/api/partMaster/importExcel', fd).subscribe({
        next: (res: any) => {
          this.isLoading = false;
  
          const sum = res?.summary || {};
          const dup = res?.duplicates || [];
          const invalid = res?.invalidRows || [];
  
          const showDup = dup.slice(0, 10)
            .map((x: any) => `<li>${x.itemNo} | ${x.itemName}</li>`)
            .join('');
  
          const showInvalid = invalid.slice(0, 10)
            .map((x: any) => `<li>Row ${x.row}: ${x.itemNo || '-'} | ${x.itemName || '-'} | ${x.group || '-'} <i>(${x.reason})</i></li>`)
            .join('');
  
          Swal.fire({
            title: 'Import Result',
            icon: 'success',
            html: `
              <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
                <div><b>Inserted:</b> ${sum.inserted ?? 0}</div>
                <div><b>Skipped duplicate:</b> ${sum.skippedDuplicate ?? 0}</div>
                <div><b>Invalid rows:</b> ${sum.invalid ?? 0}</div>
  
                ${dup.length ? `
                  <hr/>
                  <div style="font-weight:700; margin-bottom:6px;">Duplicate (10 รายการแรก)</div>
                  <ul style="padding-left:18px; margin:0;">${showDup}</ul>
                  ${dup.length > 10 ? `<div style="margin-top:6px; color:#6b7280;">...และอีก ${dup.length - 10} รายการ</div>` : ''}
                ` : ''}
  
                ${invalid.length ? `
                  <hr/>
                  <div style="font-weight:700; margin-bottom:6px;">Invalid rows (10 รายการแรก)</div>
                  <ul style="padding-left:18px; margin:0; color:#b91c1c;">${showInvalid}</ul>
                  ${invalid.length > 10 ? `<div style="margin-top:6px; color:#6b7280;">...และอีก ${invalid.length - 10} รายการ</div>` : ''}
                ` : ''}
              </div>
            `
          });
  
          this.fetchData();
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Import failed',
            text: err?.error?.message || err?.message || 'เกิดข้อผิดพลาด',
            icon: 'error',
          });
        }
      });
    });
  }





  openEditPartMasterSwal(item: partMasterRow) {
    if (!this.groups?.length) this.fetchGroup();
  
    const optionsHtml = (this.groups || [])
      .map(g => `<option value="${g.id}" ${Number(g.id) === Number(item.groupId) ? 'selected' : ''}>${g.name}</option>`)
      .join('');
  
    const labelStyle = `font-weight:800; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
    const inputStyle = `
      width:100%;
      height:46px;
      padding:10px 12px;
      border:1px solid #cbd5e1;
      border-radius:10px;
      outline:none;
      font-size:15px;
      box-sizing:border-box;
      background:#fff;
    `;
    const hintStyle = `font-size:12px; color:#64748b; margin-top:6px;`;
    const cardStyle = `
      background:#f8fafc;
      border:1px solid rgba(2,6,23,.08);
      border-radius:14px;
      padding:18px;
    `;
  
    Swal.fire({
      title: 'Edit PartMaster',
      width: 760,
      padding: '24px',
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
                <div style="font-weight:900; font-size:14px; color:#0f172a;">Update PartMaster</div>
                <div style="font-size:12px; color:#64748b;">แก้ไขแล้วกด Save</div>
              </div>
            </div>
  
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label style="${labelStyle}">Item No <span style="color:#ef4444;">*</span></label>
                <input id="swalItemNo" style="${inputStyle}" value="${(item.itemNo || '').replace(/"/g, '&quot;')}" />
                <div style="${hintStyle}">อย่าเว้นวรรคหน้า/หลัง</div>
              </div>
  
              <div>
                <label style="${labelStyle}">Group <span style="color:#ef4444;">*</span></label>
                <select id="swalGroupId" style="${inputStyle}">
                  <option value="" disabled>-- เลือก Group --</option>
                  ${optionsHtml}
                </select>
                <div style="${hintStyle}">เปลี่ยน group ได้</div>
              </div>
            </div>
  
            <div style="margin-top:12px;">
              <label style="${labelStyle}">Item Name <span style="color:#ef4444;">*</span></label>
              <input id="swalItemName" style="${inputStyle}" value="${(item.itemName || '').replace(/"/g, '&quot;')}" />
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const itemNoEl = document.getElementById('swalItemNo') as HTMLInputElement | null;
        const itemNameEl = document.getElementById('swalItemName') as HTMLInputElement | null;
        const groupEl = document.getElementById('swalGroupId') as HTMLSelectElement | null;
  
        const itemNo = (itemNoEl?.value || '').trim();
        const itemName = (itemNameEl?.value || '').trim();
        const groupId = (groupEl?.value || '').trim();
  
        if (!itemNo) { Swal.showValidationMessage('โปรดกรอก Item No'); return; }
        if (!itemName) { Swal.showValidationMessage('โปรดกรอก Item Name'); return; }
        if (!groupId) { Swal.showValidationMessage('โปรดเลือก Group'); return; }
  
        return { id: item.id, itemNo, itemName, groupId: Number(groupId) };
      }
    }).then((r) => {
      if (!r.isConfirmed) return;
  
      const payload = r.value as { id:number; itemNo:string; itemName:string; groupId:number };
  
      this.isLoading = true;
      this.http.put(config.apiServer + '/api/partMaster/edit', payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
  
          Swal.fire({ icon:'success', title:'Saved', timer: 1000, showConfirmButton:false });
  
          // ✅ รีโหลด/หรือ update แบบ local ก็ได้
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




  confirmDeletePartMaster(item: partMasterRow) {
    Swal.fire({
      title: 'Delete PartMaster?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
          <div><b>ItemNo:</b> ${item.itemNo}</div>
          <div><b>ItemName:</b> ${item.itemName}</div>
          <div><b>Group:</b> ${item.groupName || '-'}</div>
        </div>
      `
    }).then((r) => {
      if (!r.isConfirmed) return;
  
      this.isLoading = true;
  
      // ✅ route เป็น POST → ส่ง body ตรงๆ
      this.http.post(config.apiServer + '/api/partMaster/delete', { id: item.id })
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
  
  
  
  
  


}
