import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import config from '../../config';

type PendingInfo = {
  hasPending: boolean;
  itemNo?: string;
  itemName?: string;
  shift?: string;
  sentDate?: string;          // ISO string
  vendorName?: string;
  controlLotName?: string;
  boxCount?: number;
  wosNos?: string[];
};

type MemberRow = {
  id: number;
  empNo: string;
  name: string;
  role: string;

  rfId?: string;
  password?: string;          // ✅ รอ backend ส่งมา

  groupId?: number | null;
  groupName?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;

  issue: PendingInfo;
  receive: PendingInfo;
};

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  constructor(private http: HttpClient) {}

  isLoading = false;

  membersAll: MemberRow[] = [];
  membersView: MemberRow[] = [];

  // filters
  filterEmpNo = '';
  filterName = '';
  filterGroup = 'all';

  groups: string[] = []; // dropdown จาก groupName ใน data

  ngOnInit() {
    this.fetchMembers();
  }

  fetchMembers() {
    this.isLoading = true;

    this.http.get(config.apiServer + '/api/user/list').subscribe({
      next: (res: any) => {
        this.isLoading = false;

        this.membersAll = (res?.results || []) as MemberRow[];

        // build group list
        const set = new Set<string>();
        for (const m of this.membersAll) {
          if (m.groupName) set.add(m.groupName);
        }
        this.groups = Array.from(set).sort((a, b) => a.localeCompare(b));

        this.applyFilters();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({ title: 'Error', text: err?.message || 'fetch failed', icon: 'error' });
      }
    });
  }

  applyFilters() {
    const empQ = (this.filterEmpNo || '').trim().toLowerCase();
    const nameQ = (this.filterName || '').trim().toLowerCase();
    const gQ = this.filterGroup;

    this.membersView = (this.membersAll || []).filter(m => {
      if (empQ && !String(m.empNo || '').toLowerCase().includes(empQ)) return false;
      if (nameQ && !String(m.name || '').toLowerCase().includes(nameQ)) return false;
      if (gQ !== 'all' && String(m.groupName || '') !== gQ) return false;
      return true;
    });
  }

  resetFilters() {
    this.filterEmpNo = '';
    this.filterName = '';
    this.filterGroup = 'all';
    this.applyFilters();
  }

  // -------- On-Process helper --------
  hasIssue(m: MemberRow) {
    return !!(m && m.issue && m.issue.hasPending);
  }
  hasReceive(m: MemberRow) {
    return !!(m && m.receive && m.receive.hasPending);
  }
  hasAnyPending(m: MemberRow) {
    return this.hasIssue(m) || this.hasReceive(m);
  }

  // ✅ แปลง ISO -> วัน/เดือน/ปี เวลาไทย (ค.ศ.)
  formatThaiDateTime(v?: string | null) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);

    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  // ✅ กด On-Process เพื่อเปิด modal Issue/Receive
  openOnProcess(m: MemberRow) {
    const issue = m.issue || { hasPending: false };
    const recv = m.receive || { hasPending: false };

    const issueDate = this.formatThaiDateTime(issue.sentDate || '');
    const recvDate = this.formatThaiDateTime(recv.sentDate || '');

    const issueWos = (issue.wosNos || []).filter(Boolean);
    const recvWos = (recv.wosNos || []).filter(Boolean);

    const renderWos = (arr: string[]) => {
      if (!arr.length) return `<div style="color:#94a3b8;">-</div>`;

      const chips = arr.slice(0, 30)
        .map(x => `
          <span style="
            display:inline-block;
            padding:4px 10px;
            border-radius:999px;
            border:1px solid #e2e8f0;
            margin:6px 6px 0 0;
            font-size:12px;
            background:#fff;
          ">${x}</span>
        `).join('');

      return `
        <div style="margin-top:6px;">
          ${chips}
          ${arr.length > 30 ? `<div style="margin-top:8px; color:#64748b;">...และอีก ${arr.length - 30} รายการ</div>` : ''}
        </div>
      `;
    };

    Swal.fire({
      title: `On-Process : ${m.empNo}`,
      width: 920,
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif; font-size:13px;">
          <div style="margin-bottom:10px;">
            <b>Name:</b> ${m.name}
            &nbsp; | &nbsp; <b>Group:</b> ${m.groupName || '-'}
            &nbsp; | &nbsp; <b>Section:</b> ${m.sectionName || '-'}
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">

            <!-- ISSUE -->
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:14px; background:#f8fafc;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="font-weight:900;">ISSUE</div>
                <span style="
                  padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px;
                  background:${issue.hasPending ? 'rgba(34,197,94,.15)' : 'rgba(148,163,184,.15)'};
                  color:${issue.hasPending ? '#166534' : '#64748b'};
                ">
                  ${issue.hasPending ? 'Pending' : 'None'}
                </span>
              </div>

              <div style="margin-top:10px; line-height:1.9;">
                <div><b>Item:</b> ${issue.itemNo || '-'}${issue.itemName ? ` | ${issue.itemName}` : ''}</div>
                <div><b>Shift:</b> ${issue.shift || '-'}</div>
                <div><b>Date:</b> ${issueDate || '-'}</div>
                <div><b>Vendor:</b> ${issue.vendorName || '-'}</div>
                <div><b>ControlLot:</b> ${issue.controlLotName || '-'}</div>
                <div><b>BoxCount:</b> ${issue.boxCount ?? issueWos.length ?? 0}</div>
              </div>

              <div style="margin-top:10px;">
                <div style="font-weight:800;">WOS No</div>
                ${renderWos(issueWos)}
              </div>
            </div>

            <!-- RECEIVE -->
            <div style="border:1px solid #e2e8f0; border-radius:14px; padding:14px; background:#f8fafc;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="font-weight:900;">RECEIVE</div>
                <span style="
                  padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px;
                  background:${recv.hasPending ? 'rgba(59,130,246,.15)' : 'rgba(148,163,184,.15)'};
                  color:${recv.hasPending ? '#1d4ed8' : '#64748b'};
                ">
                  ${recv.hasPending ? 'Pending' : 'None'}
                </span>
              </div>

              <div style="margin-top:10px; line-height:1.9;">
                <div><b>Item:</b> ${recv.itemNo || '-'}${recv.itemName ? ` | ${recv.itemName}` : ''}</div>
                <div><b>Shift:</b> ${recv.shift || '-'}</div>
                <div><b>Date:</b> ${recvDate || '-'}</div>
                <div><b>Vendor:</b> ${recv.vendorName || '-'}</div>
                <div><b>ControlLot:</b> ${recv.controlLotName || '-'}</div>
                <div><b>BoxCount:</b> ${recv.boxCount ?? recvWos.length ?? 0}</div>
              </div>

              <div style="margin-top:10px;">
                <div style="font-weight:800;">WOS No</div>
                ${renderWos(recvWos)}
              </div>
            </div>

          </div>
        </div>
      `,
      confirmButtonText: 'Close'
    });
  }

  // ✅ ปุ่ม Detail (รูปตา) -> แสดง Password + RFID
  openCredentialDetail(m: MemberRow) {
    const labelStyle = `font-weight:900; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
    const boxStyle = `
      border:1px solid #e2e8f0;
      border-radius:14px;
      padding:14px;
      background:#f8fafc;
    `;
    const valueStyle = `
      font-weight:900;
      font-size:16px;
      color:#0f172a;
      letter-spacing:.2px;
      word-break:break-word;
    `;
    const subStyle = `font-size:12px; color:#64748b; margin-top:6px;`;
  
    Swal.fire({
      title: `Detail : ${m.empNo}`,
      width: 680,                 // ✅ ใหญ่ขึ้น
      padding: '18px',
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif; font-size:14px;">
          <div style="margin-bottom:12px;">
            <div style="font-weight:900; font-size:16px; color:#0f172a;">${m.name}</div>
            <div style="color:#64748b; font-size:12px;">EmpNo: ${m.empNo} | Role: ${m.role}</div>
          </div>
  
          <div style="${boxStyle}">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label style="${labelStyle}">Password</label>
                <div style="${valueStyle}">${(m.password ?? '-')}</div>
                <div style="${subStyle}">ใช้สำหรับเข้าสู่ระบบ</div>
              </div>
  
              <div>
                <label style="${labelStyle}">RFID</label>
                <div style="${valueStyle}">${(m.rfId ?? '-')}</div>
                <div style="${subStyle}">ใช้สำหรับสแกนบัตร</div>
              </div>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#2563eb',
    });
  }
  

  // placeholder edit/delete
  openEdit(m: MemberRow) {
    Swal.fire({ icon: 'info', title: 'Edit', text: `TODO: edit ${m.empNo}` });
  }

  confirmDelete(m: MemberRow) {
    Swal.fire({ icon: 'warning', title: 'Delete', text: `TODO: delete ${m.empNo}` });
  }
}
