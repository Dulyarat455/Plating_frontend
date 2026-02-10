import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
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

type VendorRow = { id: number; name: string };
type ControlLotRow = { id: number; name: string };
type PartMasterRow = { id: number; itemNo: string; itemName: string; groupId: number };

type HeaderForm = {
  sentDateByUser: string; // YYYY-MM-DDTHH:mm
  shift: string;
  venderId: number | null;
  controlLotId: number | null;
  itemNo: string;
  itemName: string;
  qtyBox: number | null;
};

// ===== Types สำหรับ Temp Stack =====
type BoxForm = {
  itemNo: string;
  itemName: string;
  wosNo: string;
  dwg: string;
  dieNo: string;
  lotNo: string;
  qty: number | null;
};

type CreateBoxTempResp = {
  message: string;
  data: any;
};

// ===== Types สำหรับ Saved List (IQC) =====
type BoxIssueTempRow = {
  id: number;
  headerId: number;
  itemNo: string;
  itemName: string;
  wosNo: string;
  dwg: string;
  dieNo: string;
  lotNo: string;
  qty: number;
};

type FetchBoxTempResp = {
  results: BoxIssueTempRow[];
};

/* =======================
   Component
======================= */

@Component({
  selector: 'app-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue.component.html',
  styleUrl: './issue.component.css',
})
export class IssueComponent implements OnInit, AfterViewInit {
  header: HeaderIssueTemp | null = null;

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

  // ✅ ช่องสแกนตัวแรกของ Temp Stack (ต้องมี #scanItemNo ใน HTML)
  @ViewChild('scanItemNo') scanItemNo!: ElementRef<HTMLInputElement>;
  


  // ===== Box Temp =====
  isSavingBox = false;
  boxForm: BoxForm = this.createEmptyBoxForm();

  // ===== Saved List scan box =====
  isLoadingSaved = false;
  savedRows: BoxIssueTempRow[] = [];

  constructor(private http: HttpClient) {}

  /* =======================
     Lifecycle
  ======================= */

  ngOnInit(): void {
    this.userId = Number(localStorage.getItem('plating_userId')) || null;
    this.groupId = Number(localStorage.getItem('plating_groupId')) || null;

    if (!this.userId || !this.groupId) {
      Swal.fire('Error', 'ไม่พบ userId / groupId', 'error');
      return;
    }

    this.fetchVendors();
    this.fetchControlLots();
    this.fetchItems();
    this.fetchHeader();
  }

  ngAfterViewInit(): void {
    // เผื่อเคส header ถูก set แล้วก่อน view init
    this.focusScanFirst();
  }

  /* =======================
     Helpers
  ======================= */

  get showHeaderForm(): boolean {
    return !this.header || this.isEditingHeader;
  }

  /** ✅ ครบจำนวน BOX แล้วไหม (ใช้ไป hide/disable scan area ใน HTML) */
  get isBoxFull(): boolean {
    if (!this.header) return false;
    return (this.savedRows?.length ?? 0) >= this.header.qtyBox;
  }

  createEmptyForm(): HeaderForm {
    const d = new Date();
    const f = (v: number) => String(v).padStart(2, '0');

    // ✅ datetime-local = YYYY-MM-DDTHH:mm
    return {
      sentDateByUser: `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(
        d.getDate()
      )}T${f(d.getHours())}:${f(d.getMinutes())}`,
      shift: '',
      venderId: null,
      controlLotId: null,
      itemNo: '',
      itemName: '',
      qtyBox: null,
    };
  }

  createEmptyBoxForm(): BoxForm {
    return {
      itemNo: '',
      itemName: '',
      wosNo: '',
      dwg: '',
      dieNo: '',
      lotNo: '',
      qty: null,
    };
  }

  isoToYmd(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private isoToDatetimeLocal(iso: string) {
    const d = new Date(iso);
    const f = (v: number) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())}T${f(
      d.getHours()
    )}:${f(d.getMinutes())}`;
  }

  private mapHeaderToForm(h: HeaderIssueTemp): HeaderForm {
    return {
      sentDateByUser: this.isoToDatetimeLocal(h.sentDateByUser), // ✅ ให้ input datetime-local เห็นเวลา
      shift: h.shift,
      venderId: h.venderId,
      controlLotId: h.controlLotId,
      itemNo: h.itemNo,
      itemName: h.itemName,
      qtyBox: h.qtyBox,
    };
  }

  vendorName(id: number) {
    return this.vendors.find((v) => v.id === id)?.name ?? '-';
  }

  controlLotName(id: number) {
    return this.controlLots.find((c) => c.id === id)?.name ?? '-';
  }

  /* =======================
     Focus Logic
  ======================= */

  private focusScanFirst() {
    // focus เฉพาะตอน header มีแล้ว และไม่ได้ edit header
    if (!this.header || this.isEditingHeader) return;

    // ✅ ถ้าครบแล้ว ไม่ต้อง focus/scan
    if (this.isBoxFull) return;

    // ✅ ต้องหน่วงเล็กน้อย เพราะตอน save header form จะถูกซ่อน แล้ว Temp Stack เพิ่ง render
    setTimeout(() => {
      const el = this.scanItemNo?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    }, 120);
  }

  // 🔁 ใช้กับ (keydown.tab)/(keydown.enter) ใน HTML
  // ✅ ใช้ any เพื่อกัน Error template: Event not assignable to KeyboardEvent
  loopFocusToFirst(ev: any) {
    if (!this.header || this.isEditingHeader) return;

    if (ev?.key === 'Tab') ev.preventDefault();
    this.focusScanFirst();
  }

  /* =======================
     Saved List (IQC)
  ======================= */

  fetchBoxTempByHeadId() {
    // ✅ ไม่มี header / กำลัง edit -> ไม่ยิง และเคลียร์ตาราง
    if (!this.header || this.isEditingHeader) {
      this.savedRows = [];
      return;
    }

    this.isLoadingSaved = true;

    this.http
      .post<FetchBoxTempResp>(config.apiServer + '/api/issue/fetchBoxTempByHeadId', {
        headerId: this.header.id,
      })
      .subscribe({
        next: (res) => {
          this.savedRows = res.results || [];
          this.isLoadingSaved = false;

          // ✅ โหลดเสร็จ ถ้ายังไม่ full -> โฟกัสช่องแรก
          this.focusScanFirst();
        },
        error: (err) => {
          console.error(err);
          this.savedRows = [];
          this.isLoadingSaved = false;

          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Load Saved List fail',
            icon: 'error',
          });
        },
      });
  }

  /* =======================
     Temp Stack Actions
  ======================= */

  onClearBoxForm() {
    this.boxForm = this.createEmptyBoxForm();
    this.focusScanFirst();
  }

  onConfirmLot() {
    if (!this.header || this.isEditingHeader) {
      return this.toast('warning', 'กรุณาบันทึก Header ให้เสร็จก่อน');
    }

    // ✅ ถ้าครบแล้ว ไม่ต้องให้ confirm เพิ่ม
    if (this.isBoxFull) {
      return this.toast('info', 'ครบจำนวน BOX แล้ว');
    }

    // validate
    if (!this.boxForm.itemNo) return this.toast('warning', 'กรุณากรอก Item No.');
    if (!this.boxForm.itemName) return this.toast('warning', 'กรุณากรอก Item Name');
    if (!this.boxForm.wosNo) return this.toast('warning', 'กรุณากรอก WOS No.');
    if (!this.boxForm.dwg) return this.toast('warning', 'กรุณากรอก DWG');
    if (!this.boxForm.dieNo) return this.toast('warning', 'กรุณากรอก Die No.');
    if (!this.boxForm.lotNo) return this.toast('warning', 'กรุณากรอก Lot No.');
    if (this.boxForm.qty == null || this.boxForm.qty <= 0)
      return this.toast('warning', 'กรุณากรอก QTY');

    this.isSavingBox = true;

    const payload = {
      headTempId: this.header.id,
      itemNo: this.boxForm.itemNo,
      itemName: this.boxForm.itemName,
      wosNo: this.boxForm.wosNo,
      dwg: this.boxForm.dwg,
      dieNo: this.boxForm.dieNo,
      lotNo: this.boxForm.lotNo,
      qty: this.boxForm.qty,
    };

    this.http
      .post<CreateBoxTempResp>(config.apiServer + '/api/issue/createBoxTemp', payload)
      .subscribe({
        next: (_res: any) => {
          this.toast('success', 'Confirm Lot สำเร็จ');

          // ✅ clear ก่อน
          this.boxForm = this.createEmptyBoxForm();

          // ✅ refresh ตาราง IQC (โหลดเสร็จจะ focus ให้เองใน fetchBoxTempByHeadId)
          this.fetchBoxTempByHeadId();

          this.isSavingBox = false;
        },
        error: (err) => {
          console.error(err);
          this.isSavingBox = false;

          Swal.fire({
            title: 'Error',
            text: err?.error?.message || err?.message || 'Confirm Lot ไม่สำเร็จ',
            icon: 'error',
          });
        },
      });
  }

  /* =======================
     Fetch APIs
  ======================= */

  fetchVendors() {
    this.isLoadingVendor = true;
    this.http.get(config.apiServer + '/api/vendor/list').subscribe({
      next: (r: any) => {
        this.vendors = r.results || [];
        this.isLoadingVendor = false;
      },
      error: (_e) => {
        this.isLoadingVendor = false;
        Swal.fire('Error', 'Load Vendor fail', 'error');
      },
    });
  }

  fetchControlLots() {
    this.isLoadingControlLot = true;
    this.http.get(config.apiServer + '/api/controlLot/list').subscribe({
      next: (r: any) => {
        this.controlLots = r.results || [];
        this.isLoadingControlLot = false;
      },
      error: (_e) => {
        this.isLoadingControlLot = false;
        Swal.fire('Error', 'Load ControlLot fail', 'error');
      },
    });
  }

  fetchItems() {
    this.isLoadingItem = true;
    this.http
      .post(config.apiServer + '/api/partMaster/filterByGroup', {
        groupId: this.groupId,
      })
      .subscribe({
        next: (r: any) => {
          this.items = r.results || [];
          this.isLoadingItem = false;
        },
        error: (_e) => {
          this.isLoadingItem = false;
          Swal.fire('Error', 'Load Item fail', 'error');
        },
      });
  }

  fetchHeader() {
    this.isLoadingHeader = true;
    this.http
      .post<FetchHeaderResp>(config.apiServer + '/api/issue/fetchHeaderTempByUser', {
        userId: this.userId,
      })
      .subscribe({
        next: (r) => {
          this.header = r.results ?? null;

          if (this.header) {
            this.form = this.mapHeaderToForm(this.header);
            this.isEditingHeader = false;

            // ✅ โหลดตาราง IQC เมื่อมี header
            this.fetchBoxTempByHeadId();
          } else {
            this.isEditingHeader = true;
            this.form = this.createEmptyForm();

            // ✅ ไม่มี header -> เคลียร์ตาราง
            this.savedRows = [];
          }

          this.isLoadingHeader = false;
        },
        error: (_e) => {
          this.isLoadingHeader = false;
          Swal.fire('Error', 'Load Header fail', 'error');
        },
      });
  }

  /* =======================
     Header Actions
  ======================= */

  onClickEditHeader() {
    if (!this.header) return;
    this.form = this.mapHeaderToForm(this.header);
    this.isEditingHeader = true;

    // optional: ตอน edit ไม่ต้องโชว์ list
    this.savedRows = [];
  }

  onCancelEditHeader() {
    if (!this.header) return;
    this.isEditingHeader = false;

    // ✅ กลับมาโหลด list (โหลดเสร็จจะ focus ให้เอง)
    this.fetchBoxTempByHeadId();
  }

  onSelectItemNo(v: string) {
    const f = this.items.find((x) => x.itemNo === v);
    this.form.itemNo = v;
    this.form.itemName = f?.itemName ?? '';
  }

  onSaveHeader() {
    if (!this.form.sentDateByUser) return this.toast('warning', 'เลือกวันที่');
    if (!this.form.shift) return this.toast('warning', 'เลือก Shift');

    this.isSavingHeader = true;

    const payload: any = {
      userId: this.userId,
      groupId: this.groupId,
      shift: this.form.shift,
      venderId: this.form.venderId,
      controlLotId: this.form.controlLotId,
      itemNo: this.form.itemNo,
      itemName: this.form.itemName,
      qtyBox: this.form.qtyBox,
      // datetime-local เป็น local time -> แปลงเป็น ISO ส่ง backend
      sentDateByUser: new Date(this.form.sentDateByUser).toISOString(),
    };

    const isEdit = !!this.header && this.isEditingHeader;
    const url = isEdit ? '/api/issue/updateHeaderTemp' : '/api/issue/createHeaderTemp';

    if (isEdit) payload.headTempId = this.header!.id;

    this.http.post<any>(config.apiServer + url, payload).subscribe({
      next: (r) => {
        this.header = r.data;
        this.isEditingHeader = false;
        this.toast('success', 'Save Header OK');

        // ✅ โหลดตาราง IQC (โหลดเสร็จจะ focus ให้เอง)
        this.fetchBoxTempByHeadId();

        this.isSavingHeader = false;
      },
      error: (_e) => {
        this.isSavingHeader = false;
        Swal.fire('Error', 'Save fail', 'error');
      },
    });
  }

  /* =======================
     Toast
  ======================= */

  private toast(icon: any, title: string) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      timer: 1800,
      showConfirmButton: false,
    });
  }
}
