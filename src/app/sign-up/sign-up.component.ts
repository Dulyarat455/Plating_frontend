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
  password?: string;

  groupId?: number | null;
  groupName?: string | null;
  sectionId?: number | null;
  sectionName?: string | null;

  issue: PendingInfo;
  receive: PendingInfo;
};

type OnProcessFilter = 'all' | 'none' | 'issue' | 'receive' | 'both';


type groupRow = {
  id: number;
  name: string;
};

type sectionRow = {
  id: number;
  name: string;
}

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

  groupRows: groupRow[] = [];
  sectionRows: sectionRow[] = [];

  membersAll: MemberRow[] = [];
  membersView: MemberRow[] = [];

  // filters (dynamic)
  filterEmpNo = '';
  filterName = '';
  filterGroup = 'all';
  filterSection = 'all';
  filterRole = 'all';
  filterOnProcess: OnProcessFilter = 'all';

  // dropdown lists (จากข้อมูลจริง)
  groups: string[] = [];
  sections: string[] = [];
  roles: string[] = [];

  ngOnInit() {
    this.fetchMembers();
    this.fetchSection();
    this.fetchGroup();
  }

  fetchGroup(){
    this.http.get(config.apiServer + '/api/group/list').subscribe({
      next: (res: any) => {
      this.groupRows = (res.results || []).map((r: any) => ({
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


  fetchSection(){
    this.http.get(config.apiServer + '/api/section/list').subscribe({
      next: (res: any) => {
      this.sectionRows = (res.results || []).map((r: any) => ({
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




  fetchMembers() {
    this.isLoading = true;

    this.http.get(config.apiServer + '/api/user/list').subscribe({
      next: (res: any) => {
        this.isLoading = false;

        this.membersAll = (res?.results || []) as MemberRow[];

        // build dropdown list: group/section/role
        const groupSet = new Set<string>();
        const sectionSet = new Set<string>();
        const roleSet = new Set<string>();

        for (const m of this.membersAll) {
          if (m.groupName) groupSet.add(m.groupName);
          if (m.sectionName) sectionSet.add(m.sectionName);
          if (m.role) roleSet.add(m.role);
        }

        this.groups = Array.from(groupSet).sort((a, b) => a.localeCompare(b));
        this.sections = Array.from(sectionSet).sort((a, b) => a.localeCompare(b));
        this.roles = Array.from(roleSet).sort((a, b) => a.localeCompare(b));

        this.applyFilters();
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({ title: 'Error', text: err?.message || 'fetch failed', icon: 'error' });
      }
    });
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

  private matchOnProcess(m: MemberRow, f: OnProcessFilter) {
    const i = this.hasIssue(m);
    const r = this.hasReceive(m);

    if (f === 'all') return true;
    if (f === 'none') return !i && !r;
    if (f === 'issue') return i && !r;
    if (f === 'receive') return r && !i;
    if (f === 'both') return i && r;
    return true;
  }

  applyFilters() {
    const empQ = (this.filterEmpNo || '').trim().toLowerCase();
    const nameQ = (this.filterName || '').trim().toLowerCase();

    const gQ = this.filterGroup;
    const sQ = this.filterSection;
    const rQ = this.filterRole;
    const opQ = this.filterOnProcess;

    this.membersView = (this.membersAll || []).filter(m => {
      if (empQ && !String(m.empNo || '').toLowerCase().includes(empQ)) return false;
      if (nameQ && !String(m.name || '').toLowerCase().includes(nameQ)) return false;

      if (gQ !== 'all' && String(m.groupName || '') !== gQ) return false;
      if (sQ !== 'all' && String(m.sectionName || '') !== sQ) return false;
      if (rQ !== 'all' && String(m.role || '') !== rQ) return false;

      if (!this.matchOnProcess(m, opQ)) return false;

      return true;
    });
  }

  resetFilters() {
    this.filterEmpNo = '';
    this.filterName = '';
    this.filterGroup = 'all';
    this.filterSection = 'all';
    this.filterRole = 'all';
    this.filterOnProcess = 'all';
    this.applyFilters();
  }

  // ✅ เก็บเงื่อนไข filter สำหรับส่งให้หลังบ้าน (export excel)
  buildExportFilters() {
    const out: any = {};

    const empNo = (this.filterEmpNo || '').trim();
    const name = (this.filterName || '').trim();

    if (empNo) out.empNo = empNo;
    if (name) out.name = name;

    if (this.filterGroup !== 'all') out.groupName = this.filterGroup;
    if (this.filterSection !== 'all') out.sectionName = this.filterSection;
    if (this.filterRole !== 'all') out.role = this.filterRole;

    // onProcess: all/none/issue/receive/both
    if (this.filterOnProcess !== 'all') out.onProcess = this.filterOnProcess;

    return out;
  }

  // (เตรียมไว้) export excel: ส่งเฉพาะเงื่อนไข
  exportExcel() {
    const payload = { filters: this.buildExportFilters() };

    this.isLoading = true;
    this.http.post(
      config.apiServer + '/api/user/exportExcel',
      payload,
      { responseType: 'blob' }
    ).subscribe({
      next: (blob) => {
        this.isLoading = false;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        a.download = `Member_${y}${m}${day}.xlsx`;
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

  // ✅ Detail -> Password + RFID
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
      width: 680,
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






  openAddMemberSwal() {
    // กันกรณี dropdown ยังไม่มา
    if (!this.groupRows.length || !this.sectionRows.length) {
      this.fetchGroup();
      this.fetchSection();
    }
  
    const groupOpts = (this.groupRows || [])
      .map(g => `<option value="${g.id}">${g.name}</option>`)
      .join('');
  
    const sectionOpts = (this.sectionRows || [])
      .map(s => `<option value="${s.id}">${s.name}</option>`)
      .join('');
  
    const labelStyle = `font-weight:900; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
    const inputStyle = `
      width:100%; height:42px; padding:10px 12px;
      border:1px solid #cbd5e1; border-radius:10px; outline:none;
      font-size:14px; box-sizing:border-box; background:#fff;
    `;
    const cardStyle = `
      background:#f8fafc; border:1px solid rgba(2,6,23,.08);
      border-radius:14px; padding:14px;
    `;
  
    Swal.fire({
      title: 'Add Member',
      width: 720,
      padding: '18px',
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
          <div style="${cardStyle}">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
              <div style="
                width:34px; height:34px; border-radius:10px;
                display:flex; align-items:center; justify-content:center;
                background:rgba(37,99,235,.12); color:#2563eb; font-weight:900;
              ">+</div>
              <div>
                <div style="font-weight:900; font-size:14px; color:#0f172a;">New Member</div>
                <div style="font-size:12px; color:#64748b;">กรอกข้อมูลให้ครบ แล้วกด Save</div>
              </div>
            </div>
  
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div>
                <label style="${labelStyle}">EmpNo <span style="color:#ef4444;">*</span></label>
                <input id="swalEmpNo" style="${inputStyle}" placeholder="เช่น LA512" autocomplete="off" />
              </div>
  
              <div>
                <label style="${labelStyle}">Role <span style="color:#ef4444;">*</span></label>
                <select id="swalRole" style="${inputStyle}">
                  <option value="" disabled selected>-- เลือก Role --</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
  
            <div style="margin-top:12px;">
              <label style="${labelStyle}">Name <span style="color:#ef4444;">*</span></label>
              <input id="swalName" style="${inputStyle}" placeholder="ชื่อ-นามสกุล" autocomplete="off" />
            </div>
  
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
              <div>
                <label style="${labelStyle}">Password <span style="color:#ef4444;">*</span></label>
                <input id="swalPassword" type="text" style="${inputStyle}" placeholder="กำหนดรหัสผ่าน" autocomplete="off" />
              </div>
  
              <div>
                <label style="${labelStyle}">RFID <span style="color:#ef4444;">*</span></label>
                <input id="swalRfid" style="${inputStyle}" placeholder="เช่น 1112321237" autocomplete="off" />
              </div>
            </div>
  
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:12px;">
              <div>
                <label style="${labelStyle}">Group <span style="color:#ef4444;">*</span></label>
                <select id="swalGroupId" style="${inputStyle}">
                  <option value="" disabled selected>-- เลือก Group --</option>
                  ${groupOpts}
                </select>
              </div>
  
              <div>
                <label style="${labelStyle}">Section <span style="color:#ef4444;">*</span></label>
                <select id="swalSectionId" style="${inputStyle}">
                  <option value="" disabled selected>-- เลือก Section --</option>
                  ${sectionOpts}
                </select>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        (document.getElementById('swalEmpNo') as HTMLInputElement | null)?.focus();
      },
      preConfirm: () => {
        const empNo = ((document.getElementById('swalEmpNo') as HTMLInputElement | null)?.value || '').trim();
        const role = ((document.getElementById('swalRole') as HTMLSelectElement | null)?.value || '').trim();
        const name = ((document.getElementById('swalName') as HTMLInputElement | null)?.value || '').trim();
        const password = ((document.getElementById('swalPassword') as HTMLInputElement | null)?.value || '').trim();
        const rfId = ((document.getElementById('swalRfid') as HTMLInputElement | null)?.value || '').trim();
        const groupId = ((document.getElementById('swalGroupId') as HTMLSelectElement | null)?.value || '').trim();
        const sectionId = ((document.getElementById('swalSectionId') as HTMLSelectElement | null)?.value || '').trim();
  
        if (!empNo) { Swal.showValidationMessage('โปรดกรอก EmpNo'); return; }
        if (!role) { Swal.showValidationMessage('โปรดเลือก Role'); return; }
        if (!name) { Swal.showValidationMessage('โปรดกรอก Name'); return; }
        if (!password) { Swal.showValidationMessage('โปรดกรอก Password'); return; }
        if (!rfId) { Swal.showValidationMessage('โปรดกรอก RFID'); return; }
        if (!groupId) { Swal.showValidationMessage('โปรดเลือก Group'); return; }
        if (!sectionId) { Swal.showValidationMessage('โปรดเลือก Section'); return; }
  
        return {
          empNo, role, name, password, rfId,
          groupId: Number(groupId),
          sectionId: Number(sectionId),
        };
      }
    }).then((r) => {
      if (!r.isConfirmed) return;
  
      const payload = r.value as {
        empNo: string; role: string; name: string; password: string; rfId: string; groupId: number; sectionId: number;
      };
  
      this.isLoading = true;
  
      this.http.post(config.apiServer + '/api/user/create', payload).subscribe({
        next: () => {
          this.isLoading = false;
          Swal.fire({ icon: 'success', title: 'Saved', text: 'เพิ่ม Member เรียบร้อย', timer: 1200, showConfirmButton: false });
          this.fetchMembers();
        },
        error: (err) => {
          this.isLoading = false;
  
          const msg = err?.error?.message || err?.message || 'เกิดข้อผิดพลาด';
          if (msg === 'user_already_exists') {
            const d = err?.error?.detail || {};
            const reasons = [
              d.empNo ? 'EmpNo ซ้ำ' : '',
              d.name ? 'Name ซ้ำ' : '',
              d.rfId ? 'RFID ซ้ำ' : '',
            ].filter(Boolean).join(', ');
            Swal.fire({ icon: 'warning', title: 'เพิ่มไม่ได้', text: reasons || 'user_already_exists' });
            return;
          }
  
          Swal.fire({ icon: 'error', title: 'เพิ่มไม่สำเร็จ', text: msg });
        }
      });
    });
  }
  



  // =========================
  // ✅ Import Excel (User)
  // =========================
  openImportUserExcelSwal() {
    Swal.fire({
      title: 'Import Member (Excel)',
      width: 720,
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
          <div style="margin-bottom:10px; color:#334155;">
            เลือกไฟล์ Excel (.xlsx) แล้วกด Import
          </div>

          <input id="swalUserExcelFile" type="file" accept=".xlsx,.xls"
            class="swal2-file" style="width:100%;" />

          <div style="margin-top:10px; font-size:12px; color:#64748b; line-height:1.6;">
            Header ต้องมี: <b>EmpNo</b>, <b>RFID</b>, <b>Name</b>, <b>Role</b>, <b>Group</b>, <b>Section</b>, <b>Password</b>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Import',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#16a34a',
      preConfirm: () => {
        const fileEl = document.getElementById('swalUserExcelFile') as HTMLInputElement | null;
        const file = fileEl?.files?.[0];
        if (!file) {
          Swal.showValidationMessage('โปรดเลือกไฟล์ Excel');
          return;
        }
        return { file };
      }
    }).then((r) => {
      if (!r.isConfirmed) return;

      const { file } = r.value as { file: File };

      const fd = new FormData();
      fd.append('file', file); // ✅ backend upload.single('file')

      this.isLoading = true;
      this.http.post(config.apiServer + '/api/user/importExcel', fd).subscribe({
        next: (res: any) => {
          this.isLoading = false;

          const sum = res?.summary || {};
          const dup = res?.duplicates || [];
          const invalid = res?.invalidRows || [];
          const failed = res?.insertErrors || [];

          const showDup = dup
            .map((x: any) => `<li>Row ${x.row}: <b>${x.empNo}</b> | ${x.name} <i>(${x.reason})</i></li>`)
            .join('');

          const showInvalid = invalid
            .map((x: any) =>
              `<li>Row ${x.row}: <b>${x.empNo || '-'}</b> | ${x.name || '-'} | ${x.rfId || '-'}
                <div style="color:#b91c1c; font-size:12px;">${x.reason}</div>
              </li>`
            )
            .join('');

          const showFailed = failed
            .map((x: any) =>
              `<li>Row ${x.row}: <b>${x.empNo || '-'}</b> | ${x.name || '-'}
                <div style="color:#b45309; font-size:12px;">${x.reason}</div>
              </li>`
            )
            .join('');

          Swal.fire({
            title: 'Import Result',
            icon: 'success',
            width: 900,
            html: `
              <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">

                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:12px;">
                  <div style="border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#f8fafc;">
                    <div style="font-size:12px; color:#64748b;">Inserted</div>
                    <div style="font-size:18px; font-weight:900; color:#166534;">${sum.inserted ?? 0}</div>
                  </div>
                  <div style="border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#f8fafc;">
                    <div style="font-size:12px; color:#64748b;">Skipped Duplicate</div>
                    <div style="font-size:18px; font-weight:900; color:#1d4ed8;">${sum.skippedDuplicate ?? 0}</div>
                  </div>
                  <div style="border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#f8fafc;">
                    <div style="font-size:12px; color:#64748b;">Invalid Rows</div>
                    <div style="font-size:18px; font-weight:900; color:#b91c1c;">${sum.invalid ?? 0}</div>
                  </div>
                  <div style="border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#f8fafc;">
                    <div style="font-size:12px; color:#64748b;">Insert Failed</div>
                    <div style="font-size:18px; font-weight:900; color:#b45309;">${sum.insertFailed ?? 0}</div>
                  </div>
                </div>

                ${dup.length ? `
                  <hr/>
                  <div style="font-weight:900; margin-bottom:6px;">Duplicate (ทั้งหมด)</div>
                  <div style="max-height:220px; overflow:auto; border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#fff;">
                    <ul style="padding-left:18px; margin:0; line-height:1.7;">${showDup}</ul>
                  </div>
                ` : ''}
                
                ${invalid.length ? `
                  <hr/>
                  <div style="font-weight:900; margin-bottom:6px;">Invalid Rows (ทั้งหมด)</div>
                  <div style="max-height:220px; overflow:auto; border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#fff;">
                    <ul style="padding-left:18px; margin:0; line-height:1.7;">${showInvalid}</ul>
                  </div>
                ` : ''}
                
                ${failed.length ? `
                  <hr/>
                  <div style="font-weight:900; margin-bottom:6px;">Insert Failed (ทั้งหมด)</div>
                  <div style="max-height:220px; overflow:auto; border:1px solid #e2e8f0; border-radius:12px; padding:10px; background:#fff;">
                    <ul style="padding-left:18px; margin:0; line-height:1.7;">${showFailed}</ul>
                  </div>
                ` : ''}
                

              </div>
            `,
            confirmButtonText: 'Close'
          });

          // ✅ refresh table
          this.fetchMembers();
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


  // placeholder edit/delete
  openEdit(m: MemberRow) {
    // ✅ กันแก้ตอนมีงานค้าง (ถ้าคุณใช้ backend check ด้วย ยิ่งดี)
    if (this.hasAnyPending(m)) {
      Swal.fire({
        icon: 'warning',
        title: 'แก้ไขไม่ได้',
        html: `
          <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
            <div>ผู้ใช้งานนี้มีงานค้างอยู่ (Issue/Receive)</div>
            <div style="margin-top:8px; color:#64748b; font-size:12px;">
              กรุณาเคลียร์งานค้างก่อน แล้วค่อยแก้ไขข้อมูล
            </div>
          </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
  
    const esc = (v: any) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
  
    const waitUntil = async (cond: () => boolean, timeoutMs = 3000, stepMs = 80) => {
      const t0 = Date.now();
      while (!cond()) {
        if (Date.now() - t0 > timeoutMs) break;
        await new Promise(r => setTimeout(r, stepMs));
      }
    };
  
    const ensureOptionsLoaded = async () => {
      // ถ้ายังไม่มีให้ fetch
      if (!this.groupRows?.length) this.fetchGroup();
      if (!this.sectionRows?.length) this.fetchSection();
  
      // รอให้มันมา (สูงสุด 3 วิ)
      await waitUntil(() => !!this.groupRows?.length && !!this.sectionRows?.length, 3000);
      if (!this.groupRows?.length || !this.sectionRows?.length) {
        throw new Error('ไม่สามารถโหลด Group/Section ได้');
      }
    };
  
    (async () => {
      try {
        await ensureOptionsLoaded();
      } catch (e: any) {
        Swal.fire({
          icon: 'error',
          title: 'Load options failed',
          text: e?.message || 'error',
        });
        return;
      }
  
      const roleOptions = ['admin', 'user']
        .map(r => `<option value="${r}" ${String(m.role) === r ? 'selected' : ''}>${r}</option>`)
        .join('');
  
      const groupOptions = (this.groupRows || [])
        .map(g => `<option value="${g.id}" ${Number(m.groupId) === Number(g.id) ? 'selected' : ''}>${esc(g.name)}</option>`)
        .join('');
  
      const sectionOptions = (this.sectionRows || [])
        .map(s => `<option value="${s.id}" ${Number(m.sectionId) === Number(s.id) ? 'selected' : ''}>${esc(s.name)}</option>`)
        .join('');
  
      const labelStyle = `font-weight:900; font-size:13px; color:#334155; margin-bottom:6px; display:block;`;
      const inputStyle = `
        width:100%; height:46px; padding:10px 12px;
        border:1px solid #cbd5e1; border-radius:12px;
        outline:none; font-size:14px; background:#fff; box-sizing:border-box;
      `;
      const cardStyle = `
        background:#f8fafc; border:1px solid rgba(2,6,23,.08);
        border-radius:16px; padding:16px;
      `;
      const hint = `font-size:12px; color:#64748b; margin-top:6px;`;
  
      Swal.fire({
        title: `Edit Member : ${m.empNo}`,
        width: 980,
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
                  width:40px; height:40px; border-radius:14px;
                  display:flex; align-items:center; justify-content:center;
                  background:rgba(37,99,235,.12); color:#2563eb; font-weight:900; font-size:16px;
                ">✎</div>
                <div>
                  <div style="font-weight:900; font-size:15px; color:#0f172a;">Update Member</div>
                  <div style="font-size:12px; color:#64748b;">แก้ไขข้อมูลแล้วกด Save</div>
                </div>
              </div>
  
              <!-- Row 1 -->
              <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px;">
                <div>
                  <label style="${labelStyle}">EmpNo *</label>
                  <input id="swalEmpNo" style="${inputStyle}" value="${esc(m.empNo)}" />
                  <div style="${hint}">ห้ามซ้ำกับคนอื่น</div>
                </div>
  
                <div>
                  <label style="${labelStyle}">RFID *</label>
                  <input id="swalRfId" style="${inputStyle}" value="${esc(m.rfId)}" />
                  <div style="${hint}">ห้ามซ้ำกับคนอื่น</div>
                </div>
  
                <div>
                  <label style="${labelStyle}">Role *</label>
                  <select id="swalRole" style="${inputStyle}">
                    ${roleOptions}
                  </select>
                  <div style="${hint}">สิทธิ์ผู้ใช้งาน</div>
                </div>
              </div>
  
              <!-- Row 2 -->
              <div style="display:grid; grid-template-columns: 1.4fr 1fr 1fr; gap:12px; margin-top:12px;">
                <div>
                  <label style="${labelStyle}">Name *</label>
                  <input id="swalName" style="${inputStyle}" value="${esc(m.name)}" />
                </div>
  
                <div>
                  <label style="${labelStyle}">Group *</label>
                  <select id="swalGroupId" style="${inputStyle}">
                    <option value="" disabled>-- Select Group --</option>
                    ${groupOptions}
                  </select>
                </div>
  
                <div>
                  <label style="${labelStyle}">Section *</label>
                  <select id="swalSectionId" style="${inputStyle}">
                    <option value="" disabled>-- Select Section --</option>
                    ${sectionOptions}
                  </select>
                </div>
              </div>
  
              <!-- Row 3 -->
              <div style="margin-top:12px;">
                <label style="${labelStyle}">Password *</label>
                <input id="swalPassword" type="text" style="${inputStyle}" value="${esc(m.password)}" />
                <div style="${hint}">ระบบจะเก็บตามที่กรอก</div>
              </div>
  
            </div>
  
            <div style="margin-top:10px; font-size:12px; color:#94a3b8;">
              <span style="color:#ef4444;">*</span> required
            </div>
          </div>
        `,
        didOpen: () => {
          (document.getElementById('swalEmpNo') as HTMLInputElement | null)?.focus();
        },
        preConfirm: () => {
          const empNo = ((document.getElementById('swalEmpNo') as HTMLInputElement | null)?.value || '').trim();
          const rfId = ((document.getElementById('swalRfId') as HTMLInputElement | null)?.value || '').trim();
          const role = ((document.getElementById('swalRole') as HTMLSelectElement | null)?.value || '').trim();
          const name = ((document.getElementById('swalName') as HTMLInputElement | null)?.value || '').trim();
          const password = ((document.getElementById('swalPassword') as HTMLInputElement | null)?.value || '').trim();
          const groupId = ((document.getElementById('swalGroupId') as HTMLSelectElement | null)?.value || '').trim();
          const sectionId = ((document.getElementById('swalSectionId') as HTMLSelectElement | null)?.value || '').trim();
  
          if (!empNo) { Swal.showValidationMessage('โปรดกรอก EmpNo'); return; }
          if (!rfId) { Swal.showValidationMessage('โปรดกรอก RFID'); return; }
          if (!name) { Swal.showValidationMessage('โปรดกรอก Name'); return; }
          if (!role) { Swal.showValidationMessage('โปรดเลือก Role'); return; }
          if (!password) { Swal.showValidationMessage('โปรดกรอก Password'); return; }
          if (!groupId) { Swal.showValidationMessage('โปรดเลือก Group'); return; }
          if (!sectionId) { Swal.showValidationMessage('โปรดเลือก Section'); return; }
  
          return {
            id: m.id,
            empNo,
            name,
            role,
            rfId,
            password,
            groupId: Number(groupId),
            sectionId: Number(sectionId),
          };
        }
      }).then((r) => {
        if (!r.isConfirmed) return;
  
        const payload = r.value as {
          id: number;
          empNo: string;
          name: string;
          role: string;
          rfId: string;
          password: string;
          groupId: number;
          sectionId: number;
        };
  
        this.isLoading = true;
  
        this.http.put(config.apiServer + '/api/user/edit', payload).subscribe({
          next: () => {
            this.isLoading = false;
            Swal.fire({ icon: 'success', title: 'Saved', timer: 1000, showConfirmButton: false });
            this.fetchMembers();
          },
          error: (err) => {
            this.isLoading = false;
            const msg = err?.error?.message || err?.message || 'เกิดข้อผิดพลาด';
  
            let extra = '';
            if (err?.error?.detail) {
              const d = err.error.detail;
              if (msg === 'user_already_exists') {
                extra = ` ซ้ำ: ${d.empNo ? 'EmpNo ' : ''}${d.name ? 'Name ' : ''}${d.rfId ? 'RFID ' : ''}`.trim();
              }
              if (msg === 'user_has_pending_transaction') {
                extra = ` Issue:${d.issue || 0} Receive:${d.receive || 0}`;
              }
            }
  
            Swal.fire({
              icon: 'error',
              title: 'แก้ไขไม่สำเร็จ',
              text: (msg + (extra ? ` | ${extra}` : '')).trim(),
            });
          }
        });
      });
  
    })();
  }
  
 
  

  confirmDelete(m: MemberRow) {
    // ✅ กันพลาด
    if (!m?.id) return;
  
    // ✅ เช็ค on-process ก่อน (ถ้ามีงานค้าง ห้ามลบ และให้ user ไปกดดูที่ On-Process)
    if (this.hasAnyPending(m)) {
      const issues = this.hasIssue(m) ? 'Issue' : '';
      const recv = this.hasReceive(m) ? 'Receive' : '';
      const pendingText = [recv, issues].filter(Boolean).join(' + ');
  
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบได้',
        width: 640,
        html: `
          <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
            <div style="margin-bottom:8px;">
              User นี้มีงานค้างอยู่: <b style="color:#0f766e;">${pendingText || 'Pending'}</b>
            </div>
            <div style="border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#f8fafc;">
              <div><b>EmpNo:</b> ${m.empNo}</div>
              <div><b>Name:</b> ${m.name}</div>
              <div><b>Group:</b> ${m.groupName || '-'}</div>
              <div><b>Section:</b> ${m.sectionName || '-'}</div>
            </div>
            <div style="margin-top:10px; color:#64748b; font-size:12px;">
              * ตรวจสอบรายละเอียดได้โดยคลิกที่ช่อง <b>On-Process</b>
            </div>
          </div>
        `,
        confirmButtonText: 'Close',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
  
    // ✅ ยืนยันลบ
    Swal.fire({
      title: 'Delete Member?',
      icon: 'warning',
      width: 680,
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      html: `
        <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
          
  
          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#f8fafc;">
            <div><b>EmpNo:</b> ${m.empNo}</div>
            <div><b>Name:</b> ${m.name}</div>
            <div><b>Role:</b> ${m.role}</div>
            <div><b>Group:</b> ${m.groupName || '-'}</div>
            <div><b>Section:</b> ${m.sectionName || '-'}</div>
          </div>
        </div>
      `
    }).then((r) => {
      if (!r.isConfirmed) return;
  
      this.isLoading = true;
  
      // ✅ ตาม API ของคุณ: app.post('/api/user/delete', ...)
      this.http.post(config.apiServer + '/api/user/delete', { id: m.id }).subscribe({
        next: () => {
          this.isLoading = false;
  
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'ลบสมาชิกเรียบร้อย',
            timer: 900,
            showConfirmButton: false
          });
  
          // refresh table
          this.fetchMembers();
        },
        error: (err) => {
          this.isLoading = false;
  
          // ✅ ถ้าหลังบ้านตอบว่า user มีงานค้าง (กัน race condition)
          const msg = err?.error?.message;
          if (msg === 'cannot_delete_user_has_pending') {
            const d = err?.error?.detail || {};
            Swal.fire({
              icon: 'warning',
              title: 'ลบไม่ได้ (มีงานค้าง)',
              width: 720,
              html: `
                <div style="text-align:left; font-family:'Kanit','Segoe UI',sans-serif;">
                  <div style="margin-bottom:8px;">
                    User นี้มีงานค้างอยู่ในระบบ จึงไม่สามารถลบได้
                  </div>
                  <div style="border:1px solid #e2e8f0; border-radius:12px; padding:12px; background:#f8fafc;">
                    <div><b>EmpNo:</b> ${d.empNo || m.empNo}</div>
                    <div><b>Name:</b> ${d.name || m.name}</div>
                    <div><b>Issue pending:</b> ${d.issuePendingCount ?? '-'}</div>
                    <div><b>Receive pending:</b> ${d.receivePendingCount ?? '-'}</div>
                  </div>
                  <div style="margin-top:10px; color:#64748b; font-size:12px;">
                    * คลิกที่ช่อง <b>On-Process</b> เพื่อดูรายละเอียดงานค้าง
                  </div>
                </div>
              `,
              confirmButtonText: 'Close',
              confirmButtonColor: '#2563eb'
            });
            return;
          }
  
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
