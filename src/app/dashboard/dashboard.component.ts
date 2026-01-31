import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

type BoxRow = {
  itemNo: string;
  itemName: string;
  wos: string;
  dwg: string;
  die: string;
  lotNo: string;
  qty: number;
};

type LotIssueRow = {
  dateTime: string;
  vendor: string;
  lotIssueNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;
};

type LotReceiveRow = {
  dateTime: string;
  vendor: string;
  lotReceiveNo: string;
  boxCount: number;
  totalQty: number;
  status: 'Wait' | 'Complete';
  boxes: BoxRow[] | null;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], // ✅ สำคัญมาก: *ngIf / *ngFor / ngClass
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

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
  issueLots: LotIssueRow[] = [
    {
      dateTime: '01/26/2026 14:30',
      vendor: 'ZIP',
      lotIssueNo: 'ISS-LOT-0001',
      boxCount: 2,
      totalQty: 6000,
      status: 'Wait',
      boxes: [
        { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB4', qty:4000 },
        { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB5', qty:2000 },
      ],
    },
  ];

  receiveLots: LotReceiveRow[] = [
    {
      dateTime: '01/26/2026 14:15',
      vendor: 'ZIP',
      lotReceiveNo: 'RCV-LOT-0099',
      boxCount: 1,
      totalQty: 2000,
      status: 'Complete',
      boxes: [
        { itemNo:'10000206936', itemName:'YOKE#1', wos:'JB615021K002', dwg:'A19-321027-3E', die:'D8', lotNo:'L26119AB4', qty:2000 },
      ],
    },
  ];
}
