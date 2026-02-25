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

  issueDate: string | null;     // ISO string
  receiveDate: string | null;   // ISO string

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
  // data
  rows: ReportRow[] = [];
  filteredRows: ReportRow[] = [];

  // UI state
  isLoading = false;
  errorMsg = '';

  // filter
  vendorKeyword = '';

  // summary
  totalCount = 0;
  completeCount = 0;
  waitCount = 0;

  // filters
fItemNo = '';
fItemName = '';
fBoxState = '';
fVendor = '';
fControlLot = '';
dateFrom = '';
dateTo = '';
fIssueNo = '';
fReceiveNo = '';
fGroupName = '';


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

    this.dateTo = this.toInputDate(today);
    this.dateFrom = this.toInputDate(yesterday);

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
  
    this.dateTo = this.toInputDate(today);
    this.dateFrom = this.toInputDate(yesterday);
  
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



  // ---------- filtering ----------

  applyFilter() {
    let out = [...this.rows];
  
    if (this.fItemNo)
      out = out.filter(x => x.itemNo === this.fItemNo);
  
    if (this.fItemName)
      out = out.filter(x => x.itemName === this.fItemName);
  
    if (this.fBoxState)
      out = out.filter(x => (x.BoxState || '').toLowerCase() === this.fBoxState);
  
    if (this.fVendor)
      out = out.filter(x => x.vender === this.fVendor);
  
    if (this.fControlLot)
      out = out.filter(x => x.controlLot === this.fControlLot);

    if (this.fIssueNo)
      out = out.filter(x => x.issueNo === this.fIssueNo);
    
    if (this.fReceiveNo)
      out = out.filter(x => x.ReceiveNo === this.fReceiveNo);

    if (this.fGroupName)
      out = out.filter(x => x.groupName === this.fGroupName);

    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      out = out.filter(x => x.issueDate && new Date(x.issueDate).getTime() >= from);
    }
  
    if (this.dateTo) {
      const to = new Date(this.dateTo).getTime() + 86400000;
      out = out.filter(x => x.issueDate && new Date(x.issueDate).getTime() <= to);
    }
  
    this.filteredRows = out;
    this.computeSummary(out);
  }
  // ---------- summary ----------
  computeSummary(list: ReportRow[]) {
    this.totalCount = list.length;
  
    const complete = list.filter(x => (x.BoxState || '').toLowerCase() === 'complete').length;
    this.completeCount = complete;
  
    // ถ้า BoxState ไม่ใช่ complete ให้ถือเป็น wait (กันเคส null/อื่นๆ)
    this.waitCount = this.totalCount - this.completeCount;
  }

  // ---------- date/time helpers  ----------
  toDateText(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    // แสดงเป็น YYYY-MM-DD (คุณจะปรับ format ทีหลังได้)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    //return `${y}-${m}-${day}`;
    return `${day}/${m}/${y}`;
  }

  toTimeText(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    // HH:mm:ss
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
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
    };

    this.isExporting = true;
  
    this.http.post(
      config.apiServer + '/api/report/exportExcel',
      { filters },
      { responseType: 'blob' }
    ).subscribe({
      next: blob => {
  
        // ===========================
        // ✅ generate filename (YYYYMMDD_HHMM)
        // ===========================
  
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
  
        // ===========================
        // download
        // ===========================
  
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




  // ---------- actions ----------
  onEdit(row: ReportRow) {
    // TODO: ปรับ route ให้ตรงหน้าที่จะไปแก้
    // ตัวอย่าง: ไปหน้า issue/receive detail หรือ box edit
    // this.router.navigate(['/box-edit', row.id]);
    console.log('edit', row);
    alert(`Edit box id: ${row.id}`);
  }

  onDelete(row: ReportRow) {
    const ok = confirm(`ลบรายการ box id: ${row.id} ?`);
    if (!ok) return;

    // TODO: ผูก API delete จริง
    // this.http.delete(`${config.apiUrl}/report/${row.id}`)...
    console.log('delete', row);
    alert(`(demo) deleted box id: ${row.id}`);
  }
}