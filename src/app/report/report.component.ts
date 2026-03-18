import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import config from '../../config';
import Swal from 'sweetalert2';

type ReportRow = {
  id: number;
  issueId: number;
  receiveId: number | null;

  issueDate: string | null;
  receiveDate: string | null;

  issueShipment: string | null;
  receiveShipment: string | null;

  issueNo: string | null;
  ReceiveNo: string | null;

  groupName: string | null;

  vender: string | null;
  controlLot: string | null;

  issueByEmpNo: string | null;
  issueByName: string | null;
  shiftIssue: string | null;

  receiveByEmpNo: string | null;
  receiveByName: string | null;
  shiftReceive: string | null;

  itemNo: string;
  itemName: string;
  wosNo: string;
  dwg: string | null;
  dieNo: string;
  lotNo: string;
  qty: number;
  BoxState: string;
  status: string;
};

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './report.component.html',
  styleUrl: './report.component.css'
})
export class ReportComponent implements OnInit {
  rows: ReportRow[] = [];
  filteredRows: ReportRow[] = [];

  isLoading = false;
  errorMsg = '';

  totalCount = 0;
  completeCount = 0;
  waitCount = 0;

  // filters
  fItemNo = '';
  fItemName = '';
  fBoxState = '';
  fVendor = '';
  fControlLot = '';
  fIssueNo = '';
  fReceiveNo = '';
  fGroupName = '';

  // ✅ new shipment date filters
  issueShipDateFrom = '';
  issueShipDateTo = '';

  receiveShipDateFrom = '';
  receiveShipDateTo = '';

  // dropdown options
  itemNoOptions: string[] = [];
  itemNameOptions: string[] = [];
  vendorOptions: string[] = [];
  controlLotOptions: string[] = [];
  issueNoOptions: string[] = [];
  receiveNoOptions: string[] = [];
  groupOptions: string[] = [];

  isExporting = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // ✅ ShipmentDate(I) default = เมื่อวาน ถึง วันนี้
    this.issueShipDateTo = this.toInputDate(today);
    this.issueShipDateFrom = this.toInputDate(yesterday);

    // ✅ ShipmentDate(R) default = All
    this.receiveShipDateFrom = '';
    this.receiveShipDateTo = '';

    this.fetchReport();
  }

  onResetFilter() {
    this.fItemNo = '';
    this.fItemName = '';
    this.fBoxState = '';
    this.fVendor = '';
    this.fControlLot = '';
    this.fIssueNo = '';
    this.fReceiveNo = '';
    this.fGroupName = '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // ✅ reset ตาม rule ใหม่
    this.issueShipDateTo = this.toInputDate(today);
    this.issueShipDateFrom = this.toInputDate(yesterday);

    this.receiveShipDateFrom = '';
    this.receiveShipDateTo = '';

    this.applyFilter();
  }

  fetchReport() {
    this.isLoading = true;

    this.http.get<any[]>(config.apiServer + '/api/report/list').subscribe({
      next: (data) => {
        this.rows = data || [];
        this.buildOptions();
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire('Error', err?.error?.message || 'Load failed', 'error');
      }
    });
  }

  buildOptions() {
    const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

    this.itemNoOptions = uniq(this.rows.map(x => x.itemNo));
    this.itemNameOptions = uniq(this.rows.map(x => x.itemName));
    this.vendorOptions = uniq(this.rows.map(x => x.vender || ''));
    this.controlLotOptions = uniq(this.rows.map(x => x.controlLot || ''));
    this.issueNoOptions = uniq(this.rows.map(x => x.issueNo || ''));
    this.receiveNoOptions = uniq(this.rows.map(x => x.ReceiveNo || ''));
    this.groupOptions = uniq(this.rows.map(x => x.groupName || ''));
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  applyFilter() {
    let out = [...this.rows];

    if (this.fItemNo) out = out.filter(x => x.itemNo === this.fItemNo);
    if (this.fItemName) out = out.filter(x => x.itemName === this.fItemName);
    if (this.fBoxState) out = out.filter(x => (x.BoxState || '').toLowerCase() === this.fBoxState);
    if (this.fVendor) out = out.filter(x => x.vender === this.fVendor);
    if (this.fControlLot) out = out.filter(x => x.controlLot === this.fControlLot);
    if (this.fIssueNo) out = out.filter(x => x.issueNo === this.fIssueNo);
    if (this.fReceiveNo) out = out.filter(x => x.ReceiveNo === this.fReceiveNo);
    if (this.fGroupName) out = out.filter(x => x.groupName === this.fGroupName);

    // ✅ ShipmentDate(I) Range
    if (this.issueShipDateFrom) {
      const from = new Date(this.issueShipDateFrom).getTime();
      out = out.filter(x => x.issueShipment && new Date(x.issueShipment).getTime() >= from);
    }

    if (this.issueShipDateTo) {
      const to = new Date(this.issueShipDateTo).getTime() + 86400000;
      out = out.filter(x => x.issueShipment && new Date(x.issueShipment).getTime() <= to);
    }

    // ✅ ShipmentDate(R) Range
    if (this.receiveShipDateFrom) {
      const from = new Date(this.receiveShipDateFrom).getTime();
      out = out.filter(x => x.receiveShipment && new Date(x.receiveShipment).getTime() >= from);
    }

    if (this.receiveShipDateTo) {
      const to = new Date(this.receiveShipDateTo).getTime() + 86400000;
      out = out.filter(x => x.receiveShipment && new Date(x.receiveShipment).getTime() <= to);
    }

    this.filteredRows = out;
    this.computeSummary(out);
  }

  computeSummary(list: ReportRow[]) {
    this.totalCount = list.length;
    const complete = list.filter(x => (x.BoxState || '').toLowerCase() === 'complete').length;
    this.completeCount = complete;
    this.waitCount = this.totalCount - this.completeCount;
  }

  toDateText(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${m}/${y}`;
  }

  toTimeText(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  exportExcel() {
    const filters = {
      itemNo: this.fItemNo,
      itemName: this.fItemName,
      boxState: this.fBoxState,
      groupName: this.fGroupName,
      vendor: this.fVendor,
      controlLot: this.fControlLot,
      issueNo: this.fIssueNo,
      receiveNo: this.fReceiveNo,

      // ✅ new shipment ranges
      issueShipDateFrom: this.issueShipDateFrom,
      issueShipDateTo: this.issueShipDateTo,
      receiveShipDateFrom: this.receiveShipDateFrom,
      receiveShipDateTo: this.receiveShipDateTo,
    };

    this.isExporting = true;

    this.http.post(
      config.apiServer + '/api/report/exportExcel',
      { filters },
      { responseType: 'blob' }
    ).subscribe({
      next: blob => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');

        const fileStamp =
          now.getFullYear() +
          pad(now.getMonth() + 1) +
          pad(now.getDate()) +
          '_' +
          pad(now.getHours()) +
          pad(now.getMinutes());

        const filename = `Report_${fileStamp}.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: err => {
        this.isExporting = false;
        Swal.fire('Error', err?.error?.message || 'Export failed', 'error');
      }
    });
  }

  onEdit(row: ReportRow) {
    console.log('edit', row);
    alert(`Edit box id: ${row.id}`);
  }

  onDelete(row: ReportRow) {
    const ok = confirm(`ลบรายการ box id: ${row.id} ?`);
    if (!ok) return;

    console.log('delete', row);
    alert(`(demo) deleted box id: ${row.id}`);
  }


  private ymdToStartLocal(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }
  
  private ymdToEndLocal(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }



}