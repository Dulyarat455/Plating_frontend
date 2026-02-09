import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import Swal from 'sweetalert2';
import config from '../../config';

/* =======================
   Types
======================= */

type HeaderIssueTemp = {
  id: number;
  sentDate: string;
  sentDateByUser: string;
  userId: number;
  groupId: number;
  shift: string;
  venderId: number;
  controlLotId: number;
  itemNo: string;
  itemName: string;
  qtyBox: number;
  status: string;
};

type FetchHeaderResp = {
  results: HeaderIssueTemp | null;
};

type CreateHeaderResp = {
  message: string;
  data: HeaderIssueTemp;
};

type VendorRow = {
  id: number;
  name: string;
};

type ControlLotRow = {
  id: number;
  name: string;
};

type PartMasterRow = {
  id: number;
  itemNo: string;
  itemName: string;
  groupId: number;
};

type PartMasterListResp = {
  results: PartMasterRow[];
};

type HeaderForm = {
  sentDateByUser: string; // "YYYY-MM-DDTHH:mm"
  shift: string;
  venderId: number | null;
  controlLotId: number | null;
  itemNo: string;
  itemName: string;
  qtyBox: number | null;
};



type UpdateHeaderResp = {
  message: string;
  data: HeaderIssueTemp;
};



@Component({
  selector: 'app-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css',
})
export class IssueComponent implements OnInit {
  header: HeaderIssueTemp | null = null;

  // loading states
  isLoadingHeader = false;
  isSavingHeader = false;
  isLoadingVendor = false;
  isLoadingControlLot = false;
  isLoadingItem = false;

  isEditingHeader = false;

  form: HeaderForm = this.createEmptyForm();

  userId: number | null = null;
  groupId: number | null = null;

  vendors: VendorRow[] = [];
  controlLots: ControlLotRow[] = [];
  items: PartMasterRow[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.userId = Number(localStorage.getItem('plating_userId')) || null;
    this.groupId = Number(localStorage.getItem('plating_groupId')) || null;

    if (!this.userId || !this.groupId) {
      Swal.fire({
        title: 'Error',
        text: 'ไม่พบ userId / groupId (กรุณา login ใหม่)',
        icon: 'error',
      });
      return;
    }

    this.fetchVendors();
    this.fetchControlLots();
    this.fetchItems();
    this.fetchHeader();
  }

  /* =======================
     UI Helpers
  ======================= */

  get showHeaderForm(): boolean {
    return !this.header || this.isEditingHeader;
  }

  createEmptyForm(): HeaderForm {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return {
      sentDateByUser: `${y}-${m}-${day}`,
      shift: '',
      venderId: null,
      controlLotId: null,
      itemNo: '',
      itemName: '',
      qtyBox: null,
    };
  }

  isoToYmd(iso: string): string {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapHeaderToForm(h: HeaderIssueTemp): HeaderForm {
    return {
      sentDateByUser: this.isoToYmd(h.sentDateByUser),
      shift: h.shift,
      venderId: h.venderId,
      controlLotId: h.controlLotId,
      itemNo: h.itemNo,
      itemName: h.itemName,
      qtyBox: h.qtyBox,
    };
  }

  vendorName(id: number) {
    return this.vendors.find(v => v.id === id)?.name ?? '-';
  }

  controlLotName(id: number) {
    return this.controlLots.find(c => c.id === id)?.name ?? '-';
  }

  /* =======================
     Fetch APIs (no complete)
  ======================= */

  fetchVendors() {
    this.isLoadingVendor = true;

    this.http.get(config.apiServer + '/api/vendor/list').subscribe({
      next: (res: any) => {
        this.vendors = res.results || [];
        this.isLoadingVendor = false;
      },
      error: (err) => {
        console.error(err);
        this.vendors = [];
        this.isLoadingVendor = false;

        Swal.fire({
          title: 'Error',
          text: err?.message || 'Cannot load Vendor',
          icon: 'error',
        });
      },
    });
  }

  fetchControlLots() {
    this.isLoadingControlLot = true;

    this.http.get(config.apiServer + '/api/controlLot/list').subscribe({
      next: (res: any) => {
        this.controlLots = res.results || [];
        this.isLoadingControlLot = false;
      },
      error: (err) => {
        console.error(err);
        this.controlLots = [];
        this.isLoadingControlLot = false;

        Swal.fire({
          title: 'Error',
          text: err?.message || 'Cannot load Control Lot',
          icon: 'error',
        });
      },
    });
  }

  fetchItems() {
    if (!this.groupId) return;

    this.isLoadingItem = true;

    this.http.post(config.apiServer + '/api/partMaster/filterByGroup', {
      groupId: this.groupId,
    }).subscribe({
      next: (res: any) => {
        this.items = res.results || [];
        this.isLoadingItem = false;
      },
      error: (err) => {
        console.error(err);
        this.items = [];
        this.isLoadingItem = false;

        Swal.fire({
          title: 'Error',
          text: err?.message || 'Cannot load Item',
          icon: 'error',
        });
      },
    });
  }

  fetchHeader() {
    if (!this.userId) return;

    this.isLoadingHeader = true;

    this.http.post(config.apiServer + '/api/issue/fetchHeaderTempByUser', {
      userId: this.userId,
    }).subscribe({
      next: (res: any) => {
        // ✅ สำคัญ: results เป็น object หรือ null เท่านั้น
        this.header = res.results ?? null;

        if (!this.header) {
          this.isEditingHeader = true;
          this.form = this.createEmptyForm();
        } else {
          this.isEditingHeader = false;
          this.form = this.mapHeaderToForm(this.header);
        }

        this.isLoadingHeader = false;
      },
      error: (err) => {
        console.error(err);
        this.header = null;
        this.isEditingHeader = true;
        this.form = this.createEmptyForm();
        this.isLoadingHeader = false;

        Swal.fire({
          title: 'Error',
          text: err?.message || 'Cannot load Header',
          icon: 'error',
        });
      },
    });
  }

  /* =======================
     Actions
  ======================= */

  onClickEditHeader() {
    if (!this.header) return;
    this.form = this.mapHeaderToForm(this.header);
    this.isEditingHeader = true;
  }

  onCancelEditHeader() {
    if (!this.header) return;
    this.form = this.mapHeaderToForm(this.header);
    this.isEditingHeader = false;
  }

  onSelectItemNo(itemNo: string) {
    const found = this.items.find(i => i.itemNo === itemNo);
    this.form.itemNo = itemNo;
    this.form.itemName = found?.itemName ?? '';
  }

  onSaveHeader() {
    // validate
    if (!this.form.sentDateByUser) return this.toast('warning', 'กรุณาเลือกวันที่ส่งงาน');
    if (!this.form.shift) return this.toast('warning', 'กรุณาเลือก Shift');
    if (!this.form.venderId) return this.toast('warning', 'กรุณาเลือก Vendor');
    if (!this.form.controlLotId) return this.toast('warning', 'กรุณาเลือก Control Lot');
    if (!this.form.itemNo) return this.toast('warning', 'กรุณาเลือก Item');
    if (!this.form.qtyBox || this.form.qtyBox <= 0) return this.toast('warning', 'กรุณาใส่ QTY BOX');
  
    this.isSavingHeader = true;
  
    // ✅ base payload
    const basePayload: any = {
      userId: this.userId,
      groupId: this.groupId,
      shift: this.form.shift,
      venderId: this.form.venderId,
      controlLotId: this.form.controlLotId,
      itemNo: this.form.itemNo,
      itemName: this.form.itemName,
      qtyBox: this.form.qtyBox,
      sentDateByUser: this.form.sentDateByUser,
    };


    const sentISO = new Date(this.form.sentDateByUser).toISOString();

    basePayload.sentDateByUser = sentISO;


  
    // ✅ ถ้าเป็น edit (มี header อยู่แล้ว และกำลังแก้)
    const isEditMode = !!this.header && this.isEditingHeader;
  
    const url = isEditMode
      ? config.apiServer + '/api/issue/updateHeaderTemp'
      : config.apiServer + '/api/issue/createHeaderTemp';
  
    // ✅ update ต้องส่ง headTempId
    if (isEditMode) {
      basePayload.headTempId = this.header!.id;
    }
  
    this.http.post<any>(url, basePayload).subscribe({
      next: (res: any) => {
        this.header = res.data ?? null;
  
        if (this.header) {
          this.form = this.mapHeaderToForm(this.header);
          this.isEditingHeader = false;
          this.toast('success', isEditMode ? 'อัปเดต Header สำเร็จ' : 'บันทึก Header สำเร็จ');
        }
  
        this.isSavingHeader = false;
      },
      error: (err) => {
        console.error(err);
        this.isSavingHeader = false;
  
        Swal.fire({
          title: 'Error',
          text: err?.error?.message || err?.message || 'บันทึก Header ไม่สำเร็จ',
          icon: 'error',
        });
      },
    });
  }
  

  /* =======================
     Swal helper
  ======================= */
  private toast(icon: 'success' | 'warning' | 'error' | 'info', title: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
    });
  }
}
