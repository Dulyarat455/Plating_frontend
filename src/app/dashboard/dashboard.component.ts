import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import config from '../../config';
import Swal from 'sweetalert2';

/* ---------------- types ---------------- */

type BoxRow = {
  itemNo: string;
  itemName: string;
  wos: string;
  dwg: string;
  die: string;
  lotNo: string;
  qty: number;
  boxStatus: string;
};

type LotIssueRow = {
  dateTime: string;          // display
  ShipmentTime: string;      // display
  dateIso: string;           // ✅ filter เทียบจริง

  vendor: string;
  shift: string;
  groupName: string;

  lotIssueNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;

  controlLot: string;
  itemNo: string;
  itemName: string;
  userName: string;
  userEmpNo: string;
};

type LotReceiveRow = {
  dateTime: string;
  ShipmentTime: string;
  dateIso: string;           // ✅ filter เทียบจริง

  vendor: string;
  shift: string;
  groupName: string;

  lotReceiveNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;

  controlLot: string;
  itemNo: string;
  itemName: string;
  userName: string;
  userEmpNo: string;
};

type ApiBoxRow = {
  id: number;
  issueId: number;
  receiveId: number | null;
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

type ApiIssueRow = {
  id: number;
  issueLotNo: string;
  sentDate: string;
  sentDateByUser: string;
  userId: number;
  userName: string;
  userEmpNo: string;
  groupId: number;
  groupName: string;
  shift: string;
  vender: string;
  controlLot: string;
  itemNo: string;
  itemName: string;
  qtyBox: number;
  qtySum: number;
  lotState: string;
  boxes: ApiBoxRow[];
  boxCount: number;
};

type ApiIssueListResp = { results: ApiIssueRow[] };

type ApiReceiveRow = {
  id: number;
  receiveLotNo: string;
  receiveDate: string;
  receiveDateByUser: string;
  userId: number;
  userName: string;
  userEmpNo: string;
  groupId: number;
  groupName: string;
  shift: string;
  vender: string;
  controlLot: string;
  itemNo: string;
  itemName: string;
  qtyBox: number;
  qtySum: number;
  lotState: string;
  boxes: ApiBoxRow[];
  boxCount: number;
};

type ApiReceiveListResp = { results: ApiReceiveRow[] };

type VendorSummaryRow = {
  vendor: string;
  totalIssue: number;
  totalReceive: number;
  balance: number;
  receiveRate: number;   // capped by matched receive
  overReceive?: number;  // receive เกิน issue
  accent: string;
};

type FilterState = {
  dateFrom: string;   // yyyy-MM-dd
  dateTo: string;     // yyyy-MM-dd
  shift: string;      // dropdown single (All | value)
  group: string;      // dropdown single (All | value)
  vendor: string;     // dropdown single (All | value)  // tables only
  status: string;   // ✅ tables only (All | Wait | Complete)
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  constructor(private http: HttpClient) {}

  isLoadingIssue = false;
  isLoadingReceive = false;

  // ✅ raw (ทั้งหมด)
  private issueLotsAll: LotIssueRow[] = [];
  private receiveLotsAll: LotReceiveRow[] = [];

  // ✅ view (หลัง filter)
  issueLots: LotIssueRow[] = [];
  receiveLots: LotReceiveRow[] = [];

  vendorSummary: VendorSummaryRow[] = [];

  // ✅ dropdown options (dynamic)
  shiftOptions: string[] = ['All'];
  groupOptions: string[] = ['All'];
  vendorOptions: string[] = ['All']; // tables only
  statusOptions: string[] = ['All', 'Wait', 'Complete']; // ✅ tables only

  // ✅ filter state (single-select)
  filters: FilterState = this.buildDefaultFilters();

  private vendorAccentMap = new Map<string, string>();
  private vendorPalette = ['#3b82f6', '#22c55e', '#f59e0b', '#14b8a6', '#ef4444', '#0ea5e9', '#84cc16'];

  ngOnInit(): void {
    this.fetchIssueLots();
    this.fetchReceiveLots();
  }

  // expand state
  expandedLot: { issue?: string | null; receive?: string | null } = { issue: null, receive: null };

  toggleLot(type: 'issue' | 'receive', key: string) {
    this.expandedLot[type] = this.expandedLot[type] === key ? null : key;
  }
  isExpanded(type: 'issue' | 'receive', key: string) {
    return this.expandedLot[type] === key;
  }

  /* ---------------- helpers ---------------- */

  private buildDefaultFilters(): FilterState {
    const today = new Date();
    const ytd = new Date();
    ytd.setDate(today.getDate() - 1);

    const toYMD = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    return {
      dateFrom: toYMD(ytd),   // ✅ เมื่อวาน
      dateTo: toYMD(today),   // ✅ วันนี้
      shift: 'All',
      group: 'All',
      vendor: 'All',          // tables only
      status: 'All', // ✅
    };
  }

  resetFilters() {
    this.filters = this.buildDefaultFilters();
    this.applyFilters();
  }

  private toDateTimeStr(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private mapStatus(lotState: string): 'Wait' | 'Complete' {
    const s = String(lotState || '').toLowerCase();
    return (s === 'complete' || s === 'done' || s === 'received') ? 'Complete' : 'Wait';
  }

  private norm(v?: string | null): string {
    return (v || '').trim().toUpperCase();
  }

  private ymdToStart(d: string): Date {
    return new Date(`${d}T00:00:00`);
  }
  private ymdToEnd(d: string): Date {
    return new Date(`${d}T23:59:59.999`);
  }

  /* ---------------- API ---------------- */

  fetchIssueLots() {
    this.isLoadingIssue = true;

    this.http.get<ApiIssueListResp>(config.apiServer + '/api/issue/list')
      .subscribe({
        next: (res) => {
          const rows = res?.results || [];

          this.issueLotsAll = rows.map((x) => {
            const dateIso = x.sentDate || x.sentDateByUser;
            return {
              dateIso,
              dateTime: this.toDateTimeStr(dateIso),
              ShipmentTime: this.toDateTimeStr(x.sentDateByUser),

              vendor: x.vender,
              shift: x.shift,
              groupName: x.groupName,

              lotIssueNo: x.issueLotNo,
              boxCount: x.boxCount ?? (x.boxes?.length ?? 0),
              totalQty: x.qtySum ?? 0,
              status: this.mapStatus(x.lotState),
              controlLot: x.controlLot,

              itemNo: x.itemNo,
              itemName: x.itemName,
              userName: x.userName,
              userEmpNo: x.userEmpNo,

              boxes: (x.boxes || []).map((b) => ({
                itemNo: b.itemNo,
                itemName: b.itemName,
                wos: b.wosNo,
                dwg: b.dwg ?? '-',
                die: b.dieNo,
                lotNo: b.lotNo,
                qty: b.qty,
                boxStatus: b.BoxState
              })),
            };
          });

          this.refreshFilterOptions();
          this.applyFilters();
          this.isLoadingIssue = false;
        },
        error: (err) => {
          console.error(err);
          this.issueLotsAll = [];
          this.refreshFilterOptions();
          this.applyFilters();
          this.isLoadingIssue = false;
        }
      });
  }

  fetchReceiveLots() {
    this.isLoadingReceive = true;

    this.http.get<ApiReceiveListResp>(config.apiServer + '/api/receive/list')
      .subscribe({
        next: (res) => {
          const rows = res?.results || [];

          this.receiveLotsAll = rows.map((x) => {
            const dateIso = x.receiveDate;
            return {
              dateIso,
              dateTime: this.toDateTimeStr(dateIso),
              ShipmentTime: this.toDateTimeStr(x.receiveDateByUser),

              vendor: x.vender,
              shift: x.shift,
              groupName: x.groupName,

              lotReceiveNo: x.receiveLotNo,
              boxCount: x.boxCount ?? (x.boxes?.length ?? 0),
              totalQty: x.qtySum ?? 0,
              status: this.mapStatus(x.lotState),
              controlLot: x.controlLot,

              itemNo: x.itemNo,
              itemName: x.itemName,
              userName: x.userName,
              userEmpNo: x.userEmpNo,

              boxes: (x.boxes || []).map((b) => ({
                itemNo: b.itemNo,
                itemName: b.itemName,
                wos: b.wosNo,
                dwg: b.dwg ?? '-',
                die: b.dieNo,
                lotNo: b.lotNo,
                qty: b.qty,
                boxStatus: b.BoxState
              })),
            };
          });

          this.refreshFilterOptions();
          this.applyFilters();
          this.isLoadingReceive = false;
        },
        error: (err) => {
          console.error(err);
          this.receiveLotsAll = [];
          this.refreshFilterOptions();
          this.applyFilters();
          this.isLoadingReceive = false;
        }
      });
  }

  /* ---------------- Filter Core ---------------- */

  /** เรียกทุกครั้งเมื่อ filter เปลี่ยน */
  applyFilters() {
    const f = this.filters;

    const start = this.ymdToStart(f.dateFrom);
    const end = this.ymdToEnd(f.dateTo);

    const shiftPick = this.norm(f.shift);
    const groupPick = this.norm(f.group);
    const vendorPick = this.norm(f.vendor);
    const statusPick = this.norm(f.status); // ✅

    const passCommon = (row: { dateIso: string; shift: string; groupName: string }) => {
      const dt = new Date(row.dateIso);
      if (dt < start || dt > end) return false;

      if (shiftPick !== 'ALL' && this.norm(row.shift) !== shiftPick) return false;
      if (groupPick !== 'ALL' && this.norm(row.groupName) !== groupPick) return false;

      return true;
    };

    // ✅ 1) base filter (มีผลกับ summary + tables)
    const issueBase = this.issueLotsAll.filter(passCommon);
    const recvBase = this.receiveLotsAll.filter(passCommon);

    // ✅ 2) vendor filter เฉพาะ table
    const passVendor = (row: { vendor: string }) => {
      if (vendorPick === 'ALL') return true;
      return this.norm(row.vendor) === vendorPick;
    };

    // ✅ 3) status filter เฉพาะ table
    const passStatus = (row: { status: 'Wait' | 'Complete' }) => {
      if (statusPick === 'ALL') return true;
      return this.norm(row.status) === statusPick;
    };

    this.issueLots = issueBase.filter(passVendor).filter(passStatus);
    this.receiveLots = recvBase.filter(passVendor).filter(passStatus);

    // ✅ 3) vendor summary ใช้ base เท่านั้น (ไม่โดน vendor filter)
    this.recomputeVendorSummary(issueBase, recvBase);
  }

  /** build options แบบ dynamic จากข้อมูลจริง */
  private refreshFilterOptions() {
    const vSet = new Set<string>();
    const sSet = new Set<string>();
    const gSet = new Set<string>();

    for (const r of this.issueLotsAll) {
      if (r.vendor) vSet.add(this.norm(r.vendor));
      if (r.shift) sSet.add(this.norm(r.shift));
      if (r.groupName) gSet.add(this.norm(r.groupName));
    }
    for (const r of this.receiveLotsAll) {
      if (r.vendor) vSet.add(this.norm(r.vendor));
      if (r.shift) sSet.add(this.norm(r.shift));
      if (r.groupName) gSet.add(this.norm(r.groupName));
    }

    this.vendorOptions = ['All', ...Array.from(vSet).sort()];
    this.shiftOptions = ['All', ...Array.from(sSet).sort()];
    this.groupOptions = ['All', ...Array.from(gSet).sort()];

    // ถ้าเลือกค่าเดิมแล้วหายไป ให้ fallback เป็น All
    if (!this.shiftOptions.includes(this.filters.shift)) this.filters.shift = 'All';
    if (!this.groupOptions.includes(this.filters.group)) this.filters.group = 'All';
    if (!this.vendorOptions.includes(this.filters.vendor)) this.filters.vendor = 'All';
    if (!this.statusOptions.includes(this.filters.status)) this.filters.status = 'All'; // ✅
  }

  /* ---------------- Vendor Summary ---------------- */

  trackByVendor = (_: number, x: VendorSummaryRow) => x.vendor;

  private getAccent(vendor: string): string {
    const key = this.norm(vendor) || 'UNKNOWN';
    if (this.vendorAccentMap.has(key)) return this.vendorAccentMap.get(key)!;

    const color = this.vendorPalette[this.vendorAccentMap.size % this.vendorPalette.length];
    this.vendorAccentMap.set(key, color);
    return color;
  }

  private recomputeVendorSummary(issueRows: LotIssueRow[], recvRows: LotReceiveRow[]) {
    const issueMap = new Map<string, number>();
    const recvMap = new Map<string, number>();

    for (const it of issueRows) {
      const v = this.norm(it.vendor) || 'UNKNOWN';
      issueMap.set(v, (issueMap.get(v) || 0) + Number(it.boxCount || 0));
    }
    for (const it of recvRows) {
      const v = this.norm(it.vendor) || 'UNKNOWN';
      recvMap.set(v, (recvMap.get(v) || 0) + Number(it.boxCount || 0));
    }

    // ตาม requirement: vendor summary ยึด vendor ที่มาจาก issue เป็นหลัก
    const vendors = Array.from(issueMap.keys()).sort((a, b) => a.localeCompare(b));

    this.vendorSummary = vendors.map((v) => {
      const totalIssue = issueMap.get(v) || 0;
      const totalReceive = recvMap.get(v) || 0;
      const balance = totalIssue - totalReceive;

      // ✅ rate แบบไม่เกิน 100 (คิดเฉพาะที่ match กัน)
      const matchedReceive = Math.min(totalReceive, totalIssue);
      const receiveRate = totalIssue > 0 ? (matchedReceive / totalIssue) * 100 : 0;
      const overReceive = Math.max(totalReceive - totalIssue, 0);

      return {
        vendor: v,
        totalIssue,
        totalReceive,
        balance,
        receiveRate,
        overReceive,
        accent: this.getAccent(v),
      };
    });
  }

  /* ---------------- Detail (เดิมของคุณ) ---------------- */

  showIssueDetail(lot: LotIssueRow) {
    Swal.fire({
      title: 'Issue Detail',
      html: `
        <div style="text-align:left;font-size:14px">
          <div><b>ShipmentTime:</b> ${lot.ShipmentTime}</div>
          <div><b>Item No:</b> ${lot.itemNo}</div>
          <div><b>Item Name:</b> ${lot.itemName}</div>
          <div style="margin-top:6px"><b>Group:</b> ${lot.groupName}</div>
          <div><b>Shift:</b> ${lot.shift}</div>
          <div><b>User:</b> ${lot.userName}</div>
          <div><b>Emp No:</b> ${lot.userEmpNo}</div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Close',
      confirmButtonColor: '#2563eb',
    });
  }

  showReceiveDetail(lot: LotReceiveRow) {
    Swal.fire({
      title: 'Receive Detail',
      html: `
        <div style="text-align:left;font-size:14px">
          <div><b>ShipmentTime:</b> ${lot.ShipmentTime}</div>
          <div><b>Item No:</b> ${lot.itemNo}</div>
          <div><b>Item Name:</b> ${lot.itemName}</div>
          <div style="margin-top:6px"><b>Group:</b> ${lot.groupName}</div>
          <div><b>Shift:</b> ${lot.shift}</div>
          <div><b>User:</b> ${lot.userName}</div>
          <div><b>Emp No:</b> ${lot.userEmpNo}</div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Close',
      confirmButtonColor: '#2563eb',
    });
  }
}
