import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient} from '@angular/common/http';
import { OnInit } from '@angular/core';

import config from '../../config';
import Swal from 'sweetalert2';


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
  dateTime: string;
  ShipmentTime: string;
  vendor: string;
  lotIssueNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;

  controlLot: string;
  itemNo: string;
  itemName: string;
  groupName: string;
  userName: string;
  userEmpNo: string;
};



type LotReceiveRow = {
  dateTime: string;
  ShipmentTime: string;
  vendor: string;
  lotReceiveNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;

  controlLot: string;
  itemNo: string;
  itemName: string;
  groupName: string;
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



@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], // ✅ สำคัญมาก: *ngIf / *ngFor / ngClass
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

  constructor(private http: HttpClient) {}


  isLoadingIssue = false;
  issueLots: LotIssueRow[] = [];  // ✅ ไม่ใช้ mock แล้ว


  isLoadingReceive = false;
  receiveLots: LotReceiveRow[] = [];
  



  ngOnInit(): void {
    this.fetchIssueLots();
    this.fetchReceiveLots();
  }

  // ✅ expand state
  expandedLot: { issue?: string | null; receive?: string | null } = {
    issue: null,
    receive: null,
  };

  toggleLot(type: 'issue' | 'receive', key: string) {
    this.expandedLot[type] = this.expandedLot[type] === key ? null : key;
  }

  isExpanded(type: 'issue' | 'receive', key: string) {
    return this.expandedLot[type] === key;
  }

  // ✅ ข้อมูลที่หน้า dashboard.html เรียกใช้
  // ตอนนี้ใส่ mock ไปก่อน (พอคุณมี API ค่อย replace)
  // issueLots: LotIssueRow[] = [
  //   {
  //     dateTime: '01/26/2026 14:30',
  //     vendor: 'ZIP',
  //     lotIssueNo: 'ISS-LOT-0001',
  //     boxCount: 2,
  //     totalQty: 6000,
  //     status: 'Wait',
  //     boxes: [
  //       { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB4', qty:4000 },
  //       { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB5', qty:2000 },
  //     ],
  //   },
  // ];

  // receiveLots: LotReceiveRow[] = [
  //   {
  //     dateTime: '01/26/2026 14:15',
  //     vendor: 'ZIP',
  //     lotReceiveNo: 'RCV-LOT-0099',
  //     boxCount: 1,
  //     totalQty: 2000,
  //     status: 'Complete',
  //     boxes: [
  //       { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB4', qty:2000, boxStatus: "wait" },
  //     ],
  //   },
  // ];




  private toDateTimeStr(iso: string): string {
    // ISO Z = UTC, แสดงผลให้ user แบบ local (ไทย) ได้ด้วย Date()
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  
  private mapStatus(lotState: string): 'Wait' | 'Complete' {
    // ปรับ mapping ตาม lotState จริงในระบบคุณ
    const s = String(lotState || '').toLowerCase();
    return (s === 'complete' || s === 'done' || s === 'received') ? 'Complete' : 'Wait';
  }
  
  fetchIssueLots() {
    this.isLoadingIssue = true;
  
    this.http.get<ApiIssueListResp>(config.apiServer + '/api/issue/list')
      .subscribe({
        next: (res) => {
          const rows = res?.results || [];
  
          this.issueLots = rows.map((x) => ({
            dateTime: this.toDateTimeStr(x.sentDate || x.sentDateByUser),
            ShipmentTime:  this.toDateTimeStr(x.sentDateByUser),
            vendor: x.vender,
            lotIssueNo: x.issueLotNo,
            boxCount: x.boxCount ?? (x.boxes?.length ?? 0),
            totalQty: x.qtySum ?? 0,
            status: this.mapStatus(x.lotState),
            controlLot: x.controlLot,
          
            // ✅ detail fields
            itemNo: x.itemNo,
            itemName: x.itemName,
            groupName: x.groupName,
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
          }));
          
  
          this.isLoadingIssue = false;
        },
        error: (err) => {
          console.error(err);
          this.issueLots = [];
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
  
          this.receiveLots = rows.map((x) => ({
            dateTime: this.toDateTimeStr(x.receiveDate),
            ShipmentTime: this.toDateTimeStr(x.receiveDateByUser),
            vendor: x.vender,
            lotReceiveNo: x.receiveLotNo,
            boxCount: x.boxCount ?? (x.boxes?.length ?? 0),
            totalQty: x.qtySum ?? 0,
            status: this.mapStatus(x.lotState),
            controlLot: x.controlLot,


             // ✅ detail fields
             itemNo: x.itemNo,
             itemName: x.itemName,
             groupName: x.groupName,
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
          }));
  
          this.isLoadingReceive = false;
        },
        error: (err) => {
          console.error(err);
          this.receiveLots = [];
          this.isLoadingReceive = false;
        }
      });
  }
  




  showIssueDetail(lot: LotIssueRow) {
    Swal.fire({
      title: 'Issue Detail',
      html: `
        <div style="text-align:left;font-size:14px">
           <div><b>ShipmentTime:</b> ${lot.ShipmentTime}</div>
          <div><b>Item No:</b> ${lot.itemNo}</div>
          <div><b>Item Name:</b> ${lot.itemName}</div>
          <div style="margin-top:6px"><b>Group:</b> ${lot.groupName}</div>
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
