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

type HeaderReceiveTemp = {
  id: number;
  sentDate: string;
  receiveDateByUser: string;
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

type FetchHeaderResp = { results: HeaderReceiveTemp | null };

type VendorRow = { id: number; name: string };
type ControlLotRow = { id: number; name: string };
type PartMasterRow = { id: number; itemNo: string; itemName: string; groupId: number };

type HeaderForm = {
  receiveDateByUser: string; // YYYY-MM-DDTHH:mm
  shift: string;
  venderId: number | null;
  controlLotId: number | null;
  itemNo: string;
  itemName: string;
  qtyBox: number | null;
};

type BoxForm = {
  itemNo: string;
  itemName: string;
  wosNo: string;
  dwg: string;
  dieNo: string;
  lotNo: string;
  qty: number | null;
};

type BoxReceiveTempRow = {
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

type FetchBoxTempResp = { results: BoxReceiveTempRow[] };

@Component({
  selector: 'app-receive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receive.component.html',
  styleUrl: './receive.component.css',
})
export class ReceiveComponent implements OnInit, AfterViewInit {

  header: HeaderReceiveTemp | null = null;

  isLoadingHeader = false;
  isSavingHeader = false;
  isLoadingVendor = false;
  isLoadingControlLot = false;
  isLoadingItem = false;

  isEditingHeader = false;

  userId: number | null = null;
  groupId: number | null = null;

  vendors: VendorRow[] = [];
  controlLots: ControlLotRow[] = [];
  items: PartMasterRow[] = [];

  form: HeaderForm = this.createEmptyForm();

  // ===== Scan inputs (เหมือน Issue) =====
  @ViewChild('scanItemNo') scanItemNo!: ElementRef<HTMLInputElement>;
  @ViewChild('scanItemName') scanItemName!: ElementRef<HTMLInputElement>;
  @ViewChild('scanWosNo') scanWosNo!: ElementRef<HTMLInputElement>;
  @ViewChild('scanDwg') scanDwg!: ElementRef<HTMLInputElement>;
  @ViewChild('scanDieNo') scanDieNo!: ElementRef<HTMLInputElement>;
  @ViewChild('scanLotNo') scanLotNo!: ElementRef<HTMLInputElement>;
  @ViewChild('scanQty') scanQty!: ElementRef<HTMLInputElement>;

  isSavingBox = false;
  boxForm: BoxForm = this.createEmptyBoxForm();

  isLoadingSaved = false;
  savedRows: BoxReceiveTempRow[] = [];

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
    this.fetchHeader(); // ✅ เปิดใช้แล้ว
  }

  ngAfterViewInit(): void {
    this.focusScanFirst();
  }

  /* =======================
     Helpers
  ======================= */

  get showHeaderForm(): boolean {
    return !this.header || this.isEditingHeader;
  }

  get isBoxFull(): boolean {
    if (!this.header) return false;
    return (this.savedRows?.length ?? 0) >= (this.header.qtyBox ?? 0);
  }

  createEmptyForm(): HeaderForm {
    const d = new Date();
    const f = (v: number) => String(v).padStart(2, '0');

    return {
      receiveDateByUser: `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())}T${f(d.getHours())}:${f(d.getMinutes())}`,
      shift: '',
      venderId: null,
      controlLotId: null,
      itemNo: '',
      itemName: '',
      qtyBox: null,
    };
  }

  createEmptyBoxForm(): BoxForm {
    return { itemNo: '', itemName: '', wosNo: '', dwg: '', dieNo: '', lotNo: '', qty: null };
  }

 isoToDatetimeLocal(iso: string) {
    const d = new Date(iso);
    const f = (v: number) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${f(d.getMonth() + 1)}-${f(d.getDate())}T${f(d.getHours())}:${f(d.getMinutes())}`;
  }

  private mapHeaderToForm(h: HeaderReceiveTemp): HeaderForm {
    return {
      receiveDateByUser: this.isoToDatetimeLocal(h.receiveDateByUser),
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

  onSelectItemNo(v: string) {
    const f = this.items.find(x => x.itemNo === v);
    this.form.itemNo = v;
    this.form.itemName = f?.itemName ?? '';
  }

  /* =======================
     Focus logic
  ======================= */

  private focusEl(ref?: ElementRef<HTMLInputElement>) {
    setTimeout(() => {
      const el = ref?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    }, 0);
  }

  private focusScanFirst() {
    if (!this.header || this.isEditingHeader) return;
    if (this.isBoxFull) return;

    setTimeout(() => {
      const el = this.scanItemNo?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    }, 120);
  }

  onScanEnter(field: 'itemNo'|'itemName'|'wosNo'|'dwg'|'dieNo'|'lotNo'|'qty', ev: any) {
    if (ev?.key === 'Enter') ev.preventDefault();
    if (!this.header || this.isEditingHeader || this.isSavingBox || this.isBoxFull) return;

    const requiredOk =
      !!this.boxForm.itemNo &&
      !!this.boxForm.itemName &&
      !!this.boxForm.wosNo &&
      !!this.boxForm.dwg &&
      !!this.boxForm.dieNo &&
      !!this.boxForm.lotNo &&
      this.boxForm.qty != null &&
      this.boxForm.qty > 0;

    switch (field) {
      case 'itemNo':   if (!this.boxForm.itemNo) return; return this.focusEl(this.scanItemName);
      case 'itemName': if (!this.boxForm.itemName) return; return this.focusEl(this.scanWosNo);
      case 'wosNo':    if (!this.boxForm.wosNo) return; return this.focusEl(this.scanDwg);
      case 'dwg':      if (!this.boxForm.dwg) return; return this.focusEl(this.scanDieNo);
      case 'dieNo':    if (!this.boxForm.dieNo) return; return this.focusEl(this.scanLotNo);
      case 'lotNo':    if (!this.boxForm.lotNo) return; return this.focusEl(this.scanQty);
      case 'qty':      if (!requiredOk) return; return this.onConfirmLot();
    }
  }

  onClearBoxForm() {
    this.boxForm = this.createEmptyBoxForm();
    this.focusScanFirst();
  }

  /* =======================
     Fetch APIs
  ======================= */

  fetchVendors() {
    this.isLoadingVendor = true;
    this.http.get(config.apiServer + '/api/vendor/list').subscribe({
      next: (r: any) => { this.vendors = r.results || []; this.isLoadingVendor = false; },
      error: () => { this.isLoadingVendor = false; Swal.fire('Error', 'Load Vendor fail', 'error'); },
    });
  }

  fetchControlLots() {
    this.isLoadingControlLot = true;
    this.http.get(config.apiServer + '/api/controlLot/list').subscribe({
      next: (r: any) => { this.controlLots = r.results || []; this.isLoadingControlLot = false; },
      error: () => { this.isLoadingControlLot = false; Swal.fire('Error', 'Load ControlLot fail', 'error'); },
    });
  }

  fetchItems() {
    this.isLoadingItem = true;
    this.http.post(config.apiServer + '/api/partMaster/filterByGroup', { groupId: this.groupId }).subscribe({
      next: (r: any) => { this.items = r.results || []; this.isLoadingItem = false; },
      error: () => { this.isLoadingItem = false; Swal.fire('Error', 'Load Item fail', 'error'); },
    });
  }

  fetchHeader() {
    this.isLoadingHeader = true;
    this.http.post<FetchHeaderResp>(config.apiServer + '/api/receive/fetchHeaderTempByUser', { userId: this.userId }).subscribe({
      next: (r) => {
        this.header = r.results ?? null;

        if (this.header) {
          this.form = this.mapHeaderToForm(this.header);
          this.isEditingHeader = false;
          this.fetchBoxTempByHeadId();
        } else {
          this.isEditingHeader = true;
          this.form = this.createEmptyForm();
          this.savedRows = [];
        }

        this.isLoadingHeader = false;
      },
      error: () => {
        this.isLoadingHeader = false;
        Swal.fire('Error', 'Load Header fail', 'error');
      },
    });
  }

  fetchBoxTempByHeadId() {
    if (!this.header || this.isEditingHeader) {
      this.savedRows = [];
      return;
    }

    this.isLoadingSaved = true;
    this.http.post<FetchBoxTempResp>(config.apiServer + '/api/receive/fetchBoxTempByHeadId', { headerId: this.header.id }).subscribe({
      next: (res) => {
        this.savedRows = res.results || [];
        this.isLoadingSaved = false;
        this.focusScanFirst();
      },
      error: (err) => {
        console.error(err);
        this.savedRows = [];
        this.isLoadingSaved = false;
        Swal.fire({ title: 'Error', text: err?.error?.message || err?.message || 'Load Saved List fail', icon: 'error' });
      },
    });
  }

  /* =======================
     Header actions
  ======================= */

  onClickEditHeader() {
    if (!this.header) return;
    this.form = this.mapHeaderToForm(this.header);
    this.isEditingHeader = true;
    this.savedRows = [];
  }

  onCancelEditHeader() {
    if (!this.header) return;
    this.isEditingHeader = false;
    this.fetchBoxTempByHeadId();
  }

  onSaveHeader() {
    if (!this.form.receiveDateByUser) return this.toast('warning', 'เลือกวันที่');
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
      receiveDateByUser: new Date(this.form.receiveDateByUser).toISOString(),
    };

    const isEdit = !!this.header && this.isEditingHeader;
    const url = isEdit ? '/api/receive/updateHeaderTemp' : '/api/receive/createHeaderTemp';
    if (isEdit) payload.headTempId = this.header!.id;

    this.http.post<any>(config.apiServer + url, payload).subscribe({
      next: (r) => {
        this.header = r.data;
        this.isEditingHeader = false;
        this.toastFull('success', 'Save Header OK');
        this.fetchBoxTempByHeadId();
        this.isSavingHeader = false;
      },
      error: () => {
        this.isSavingHeader = false;
        Swal.fire('Error', 'Save fail', 'error');
      },
    });
  }

  /* =======================
     Temp box actions
  ======================= */

  onConfirmLot() {
    if (!this.header || this.isEditingHeader) {
      return this.toast('warning', 'กรุณาบันทึก Header ให้เสร็จก่อน');
    }

    if (this.isBoxFull) return this.toastFull('info', 'ครบจำนวน BOX แล้ว');

    if (!this.boxForm.itemNo) return this.toast('warning', 'กรุณากรอก Item No.');
    if (!this.boxForm.itemName) return this.toastFull('warning', 'กรุณากรอก Item Name');
    if (!this.boxForm.wosNo) return this.toastFull('warning', 'กรุณากรอก WOS No.');
    if (!this.boxForm.dwg) return this.toastFull('warning', 'กรุณากรอก DWG');
    if (!this.boxForm.dieNo) return this.toastFull('warning', 'กรุณากรอก Die No.');
    if (!this.boxForm.lotNo) return this.toastFull('warning', 'กรุณากรอก Lot No.');
    if (this.boxForm.qty == null || this.boxForm.qty <= 0) return this.toastFull('warning', 'กรุณากรอก QTY');

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

    this.http.post<any>(config.apiServer + '/api/receive/createBoxTemp', payload).subscribe({
      next: () => {
        this.toastFullScan('success', 'Confirm Lot สำเร็จ');
        this.boxForm = this.createEmptyBoxForm();
        this.fetchBoxTempByHeadId();
        this.isSavingBox = false;
      },
      error: (err) => {
        console.error(err);
        this.isSavingBox = false;
        Swal.fire({ title: 'Error', text: err?.error?.message || err?.message || 'Confirm Lot ไม่สำเร็จ', icon: 'error' });
      },
    });
  }

  onDeleteRow(r: BoxReceiveTempRow) {
    if (!r?.id) return;

    Swal.fire({
      title: 'ลบรายการนี้?',
      html: `
        <div style="text-align:left">
          <div><b>Item:</b> ${r.itemNo}</div>
          <div><b>WOS:</b> ${r.wosNo}</div>
          <div><b>LOT:</b> ${r.lotNo}</div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.http.post<any>(config.apiServer + '/api/receive/deleteBoxTemp', { boxTempId: r.id }).subscribe({
        next: () => {
          this.toastFull('success', 'ลบสำเร็จ');
          this.fetchBoxTempByHeadId();
          setTimeout(() => this.focusScanFirst(), 150);
        },
        error: (err) => {
          console.error(err);
          Swal.fire({ title: 'Error', text: err?.error?.message || err?.message || 'Delete fail', icon: 'error' });
        },
      });
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
      customClass: { container: 'app-toast-container', popup: 'app-toast' },
    });
  }

  private toastFull(icon: any, title: string) {
    Swal.fire({
      icon,
      title,
      timer: 1800,
      showConfirmButton: false,
      customClass: { container: 'app-toast-container', popup: 'app-toast' },
    });
  }

  private toastFullScan(icon: any, title: string) {
    Swal.fire({
      icon,
      title,
      timer: 500,
      showConfirmButton: false,
      customClass: { container: 'app-toast-container', popup: 'app-toast' },
    });
  }
}
