import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import Swal from 'sweetalert2';
import config from '../../config';


type PanelType = 'issue' | 'receive';


type MasterPalletRow = {
  id: number;

  // =========================================================
  // ISSUE
  // =========================================================

  issueLotNo?: string | null;
  sentDate?: string | null;
  sentDateByUser?: string | null;


  // =========================================================
  // RECEIVE
  // =========================================================

  receiveLotNo?: string | null;
  receiveDate?: string | null;
  receiveDateByUser?: string | null;


  // =========================================================
  // USER
  // =========================================================

  userId: number;
  empNo?: string | null;
  userName?: string | null;


  // =========================================================
  // GROUP
  // =========================================================

  groupId: number;
  groupName?: string | null;


  // =========================================================
  // DATA
  // =========================================================

  shift: string | null;

  vender: string | null;
  controlLot: string | null;

  itemNo: string | null;
  itemName: string | null;

  qtyBox: number | null;
  qtySum: number | null;

  lotState: string | null;
  status: string | null;
};


// =========================================================
// MASTER OPTION
//
// API:
// /api/vendor/list
// /api/controlLot/list
//
// response:
// {
//   results: [
//     {
//       id: 1,
//       name: "...",
//       status: "use"
//     }
//   ]
// }
// =========================================================

type MasterOption = {
  id: number;
  name: string;
  status?: string;
};


// =========================================================
// EDIT
// =========================================================

type EditableField =
  | 'userDate'
  | 'controlLot'
  | 'vender';


type EditState = {
  panel: PanelType;

  rowId: number;

  field: EditableField;

  originalValue: string;
  value: string;

  dirty: boolean;
  saving: boolean;
};


@Component({
  selector: 'app-master-pallet',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './master-pallet.component.html',
  styleUrl: './master-pallet.component.css'
})
export class MasterPalletComponent implements OnInit {


  // =========================================================
  // PANEL
  // =========================================================

  activePanel: PanelType = 'issue';


  // =========================================================
  // DATA
  // =========================================================

  issueRows: MasterPalletRow[] = [];
  receiveRows: MasterPalletRow[] = [];

  issueView: MasterPalletRow[] = [];
  receiveView: MasterPalletRow[] = [];


  // =========================================================
  // LOADING
  // =========================================================

  isLoading = false;


  // =========================================================
  // FILTER
  // =========================================================

  filterLotNo = '';

  filterItemNo = '';

  filterItemName = '';

  filterVendor = 'all';

  filterControlLot = 'all';

  filterGroup = 'all';

  filterShift = 'all';

  filterLotState = 'all';

  filterStatus = 'all';


  // =========================================================
  // DATE FILTER
  // =========================================================

  startDate = '';

  endDate = '';


  // =========================================================
  // FILTER OPTIONS
  // =========================================================

  vendorOptions: string[] = [];

  controlLotOptions: string[] = [];

  groupOptions: string[] = [];

  shiftOptions: string[] = [];

  lotStateOptions: string[] = [];

  statusOptions: string[] = [];


  // =========================================================
  // MASTER DATA FOR INLINE EDIT
  // =========================================================

  vendorMasterOptions: MasterOption[] = [];

  controlLotMasterOptions: MasterOption[] = [];


  // =========================================================
  // EDIT STATE
  // =========================================================

  editState: EditState | null = null;


  constructor(
    private http: HttpClient
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {

    // Default:
    // Start Date = Yesterday
    // End Date   = Today

    this.setDefaultDate();


    // โหลด Vendor / Control Lot
    // สำหรับ dropdown edit

    this.fetchEditMasterOptions();


    // โหลด Issue + Receive พร้อมกัน

    this.fetchAll();
  }


  // =========================================================
  // FETCH MASTER OPTIONS
  //
  // Vendor API:
  // GET /api/vendor/list
  //
  // Control Lot API:
  // GET /api/controlLot/list
  //
  // ทั้งสอง API ใช้ field:
  //
  // id
  // name
  // status
  //
  // =========================================================

  fetchEditMasterOptions(): void {

    forkJoin({

      vendors: this.http.get<any>(
        config.apiServer + '/api/vendor/list'
      ),

      controlLots: this.http.get<any>(
        config.apiServer + '/api/controlLot/list'
      )

    }).subscribe({

      next: ({ vendors, controlLots }) => {


        // =====================================================
        // VENDOR
        // =====================================================

        this.vendorMasterOptions =
          (vendors?.results ?? [])

            .map((x: any): MasterOption => ({

              id: Number(x?.id),

              name: String(
                x?.name ?? ''
              ).trim(),

              status: String(
                x?.status ?? ''
              ).trim()

            }))

            .filter(
              (x: MasterOption) =>
                Number.isFinite(x.id) &&
                !!x.name
            )

            .sort(
              (a: MasterOption, b: MasterOption) =>

                a.name.localeCompare(
                  b.name,
                  undefined,
                  {
                    numeric: true,
                    sensitivity: 'base'
                  }
                )
            );


        // =====================================================
        // CONTROL LOT
        // =====================================================

        this.controlLotMasterOptions =
          (controlLots?.results ?? [])

            .map((x: any): MasterOption => ({

              id: Number(x?.id),

              name: String(
                x?.name ?? ''
              ).trim(),

              status: String(
                x?.status ?? ''
              ).trim()

            }))

            .filter(
              (x: MasterOption) =>
                Number.isFinite(x.id) &&
                !!x.name
            )

            .sort(
              (a: MasterOption, b: MasterOption) =>

                a.name.localeCompare(
                  b.name,
                  undefined,
                  {
                    numeric: true,
                    sensitivity: 'base'
                  }
                )
            );

      },


      error: (err) => {

        console.error(
          'Load Vendor / Control Lot master failed:',
          err
        );


        Swal.fire({

          icon: 'error',

          title: 'Load master data failed',

          text:
            err?.error?.message ||
            err?.error?.error ||
            'ไม่สามารถโหลด Vendor / Control Lot ได้'

        });

      }

    });
  }


  // =========================================================
  // FETCH ISSUE + RECEIVE
  // =========================================================

  fetchAll(): void {

    if (this.isLoading) {
      return;
    }


    // =====================================================
    // VALIDATE DATE
    // =====================================================

    if (
      !this.startDate ||
      !this.endDate
    ) {

      Swal.fire({

        icon: 'warning',

        title: 'Please select date',

        text:
          'กรุณาเลือก Start Date และ End Date'

      });

      return;
    }


    if (
      this.startDate >
      this.endDate
    ) {

      Swal.fire({

        icon: 'warning',

        title: 'Invalid date range',

        text:
          'Start Date ต้องไม่มากกว่า End Date'

      });

      return;
    }


    // =====================================================
    // LOADING
    // =====================================================

    this.isLoading = true;


    const params = {

      startDate:
        this.startDate,

      endDate:
        this.endDate

    };


    // =====================================================
    // ISSUE + RECEIVE พร้อมกัน
    // =====================================================

    forkJoin({

      issue: this.http.get<any>(

        config.apiServer +
        '/api/masterPallet/fetchIssue',

        {
          params
        }

      ),


      receive: this.http.get<any>(

        config.apiServer +
        '/api/masterPallet/fetchReceive',

        {
          params
        }

      )

    }).subscribe({

      next: ({
        issue,
        receive
      }) => {


        this.issueRows =
          this.extractRows(issue);


        this.receiveRows =
          this.extractRows(receive);


        // สร้าง filter options
        // ตาม panel ปัจจุบัน

        this.buildFilterOptions();


        // apply filter ทันที

        this.applyFilters();


        this.isLoading = false;
      },


      error: (err) => {

        this.isLoading = false;


        Swal.fire({

          icon: 'error',

          title: 'Load failed',

          text:
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            'ไม่สามารถโหลดข้อมูล Master Pallet ได้'

        });

      }

    });
  }


  // =========================================================
  // DATE CHANGE
  //
  // เปลี่ยน Start / End Date
  // แล้ว fetch ใหม่ทันที
  // =========================================================

  onDateChange(): void {

    if (
      !this.startDate ||
      !this.endDate
    ) {

      return;
    }


    if (
      this.startDate >
      this.endDate
    ) {

      return;
    }


    this.fetchAll();
  }


  // =========================================================
  // DEFAULT DATE
  //
  // Start = Yesterday
  // End   = Today
  // =========================================================

  private setDefaultDate(): void {

    const today =
      new Date();


    const yesterday =
      new Date(today);


    yesterday.setDate(
      today.getDate() - 1
    );


    this.startDate =
      this.toLocalYmd(yesterday);


    this.endDate =
      this.toLocalYmd(today);
  }


  private toLocalYmd(
    date: Date
  ): string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    return (
      `${year}-${month}-${day}`
    );
  }


  // =========================================================
  // EXTRACT RESPONSE
  //
  // รองรับ:
  //
  // []
  //
  // { results: [] }
  //
  // { data: [] }
  //
  // =========================================================

  private extractRows(
    res: any
  ): MasterPalletRow[] {


    if (
      Array.isArray(res)
    ) {

      return res;
    }


    if (
      Array.isArray(
        res?.results
      )
    ) {

      return res.results;
    }


    if (
      Array.isArray(
        res?.data
      )
    ) {

      return res.data;
    }


    return [];
  }


  // =========================================================
  // SWITCH PANEL
  // =========================================================

  setPanel(
    panel: PanelType
  ): void {


    if (
      this.activePanel === panel
    ) {

      return;
    }


    // =====================================================
    // มีค่าที่แก้แต่ยังไม่ได้ Save
    // =====================================================

    if (
      this.editState?.dirty
    ) {

      Swal.fire({

        icon: 'warning',

        title: 'Unsaved changes',

        text:
          'กรุณากด ✓ เพื่อบันทึก หรือ ✕ เพื่อยกเลิกก่อนเปลี่ยน Panel'

      });


      return;
    }


    // ปิด edit เดิม

    this.editState = null;


    // เปลี่ยน panel

    this.activePanel =
      panel;


    // reset filter
    // แต่ไม่ reset วันที่

    this.resetFilters(
      false
    );


    // build filter ใหม่
    // จากข้อมูล panel ใหม่

    this.buildFilterOptions();


    // apply

    this.applyFilters();
  }


  // =========================================================
  // CURRENT DATA
  // =========================================================

  get currentRows(): MasterPalletRow[] {

    return (
      this.activePanel === 'issue'
        ? this.issueRows
        : this.receiveRows
    );
  }


  get currentView(): MasterPalletRow[] {

    return (
      this.activePanel === 'issue'
        ? this.issueView
        : this.receiveView
    );
  }


  // =========================================================
  // BUILD FILTER OPTIONS
  // =========================================================

  buildFilterOptions(): void {

    const rows =
      this.currentRows;


    const unique = (
      values:
        (
          string |
          null |
          undefined
        )[]
    ): string[] => {


      return [

        ...new Set(

          values

            .map(
              (x) =>
                String(
                  x ?? ''
                ).trim()
            )

            .filter(Boolean)

        )

      ].sort(
        (a, b) =>

          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity: 'base'
            }
          )
      );
    };


    this.vendorOptions =
      unique(
        rows.map(
          (x) => x.vender
        )
      );


    this.controlLotOptions =
      unique(
        rows.map(
          (x) => x.controlLot
        )
      );


    this.groupOptions =
      unique(
        rows.map(
          (x) => x.groupName
        )
      );


    this.shiftOptions =
      unique(
        rows.map(
          (x) => x.shift
        )
      );


    this.lotStateOptions =
      unique(
        rows.map(
          (x) => x.lotState
        )
      );


    this.statusOptions =
      unique(
        rows.map(
          (x) => x.status
        )
      );
  }


  // =========================================================
  // APPLY FILTER
  // =========================================================

  applyFilters(): void {


    const lotNo =
      this.filterLotNo
        .trim()
        .toLowerCase();


    const itemNo =
      this.filterItemNo
        .trim()
        .toLowerCase();


    const itemName =
      this.filterItemName
        .trim()
        .toLowerCase();


    let rows = [
      ...this.currentRows
    ];


    // =====================================================
    // DATE FILTER
    //
    // Issue   -> sentDate
    // Receive -> receiveDate
    // =====================================================

    if (
      this.startDate &&
      this.endDate
    ) {

      const startMs =
        this.ymdStart(
          this.startDate
        );


      const endMs =
        this.ymdEnd(
          this.endDate
        );


      rows =
        rows.filter(
          (row) => {


            const dateValue =

              this.activePanel ===
              'issue'

                ? row.sentDate

                : row.receiveDate;


            if (
              !dateValue
            ) {

              return false;
            }


            const rowMs =
              new Date(
                dateValue
              ).getTime();


            if (
              isNaN(rowMs)
            ) {

              return false;
            }


            return (
              rowMs >= startMs &&
              rowMs <= endMs
            );
          }
        );
    }


    // =====================================================
    // OTHER FILTERS
    // =====================================================

    rows =
      rows.filter(
        (row) => {


          // =================================================
          // LOT NO
          // =================================================

          const rowLotNo =

            this.activePanel ===
            'issue'

              ? row.issueLotNo

              : row.receiveLotNo;


          if (

            lotNo &&

            !String(
              rowLotNo ?? ''
            )

              .toLowerCase()

              .includes(
                lotNo
              )

          ) {

            return false;
          }


          // =================================================
          // ITEM NO
          // =================================================

          if (

            itemNo &&

            !String(
              row.itemNo ?? ''
            )

              .toLowerCase()

              .includes(
                itemNo
              )

          ) {

            return false;
          }


          // =================================================
          // ITEM NAME
          // =================================================

          if (

            itemName &&

            !String(
              row.itemName ?? ''
            )

              .toLowerCase()

              .includes(
                itemName
              )

          ) {

            return false;
          }


          // =================================================
          // VENDOR
          // =================================================

          if (

            this.filterVendor !==
              'all' &&

            String(
              row.vender ?? ''
            ) !==
              this.filterVendor

          ) {

            return false;
          }


          // =================================================
          // CONTROL LOT
          // =================================================

          if (

            this.filterControlLot !==
              'all' &&

            String(
              row.controlLot ?? ''
            ) !==
              this.filterControlLot

          ) {

            return false;
          }


          // =================================================
          // GROUP
          // =================================================

          if (

            this.filterGroup !==
              'all' &&

            String(
              row.groupName ?? ''
            ) !==
              this.filterGroup

          ) {

            return false;
          }


          // =================================================
          // SHIFT
          // =================================================

          if (

            this.filterShift !==
              'all' &&

            String(
              row.shift ?? ''
            ) !==
              this.filterShift

          ) {

            return false;
          }


          // =================================================
          // LOT STATE
          // =================================================

          if (

            this.filterLotState !==
              'all' &&

            String(
              row.lotState ?? ''
            ) !==
              this.filterLotState

          ) {

            return false;
          }


          // =================================================
          // STATUS
          // =================================================

          if (

            this.filterStatus !==
              'all' &&

            String(
              row.status ?? ''
            ) !==
              this.filterStatus

          ) {

            return false;
          }


          return true;
        }
      );


    // =====================================================
    // SAVE VIEW
    // =====================================================

    if (
      this.activePanel ===
      'issue'
    ) {

      this.issueView =
        rows;

    } else {

      this.receiveView =
        rows;

    }
  }


  // =========================================================
  // RESET FILTER
  // =========================================================

  resetFilters(
    apply = true
  ): void {


    this.filterLotNo = '';

    this.filterItemNo = '';

    this.filterItemName = '';


    this.filterVendor =
      'all';

    this.filterControlLot =
      'all';

    this.filterGroup =
      'all';

    this.filterShift =
      'all';

    this.filterLotState =
      'all';

    this.filterStatus =
      'all';


    // =====================================================
    // ไม่ Reset:
    //
    // startDate
    // endDate
    //
    // =====================================================


    if (
      apply
    ) {

      this.applyFilters();
    }
  }


  // =========================================================
  // DATE FILTER HELPERS
  // =========================================================

  private ymdStart(
    ymd: string
  ): number {


    const [
      y,
      m,
      d
    ] =
      ymd
        .split('-')
        .map(Number);


    return new Date(
      y,
      m - 1,
      d,
      0,
      0,
      0,
      0
    ).getTime();
  }


  private ymdEnd(
    ymd: string
  ): number {


    const [
      y,
      m,
      d
    ] =
      ymd
        .split('-')
        .map(Number);


    return new Date(
      y,
      m - 1,
      d,
      23,
      59,
      59,
      999
    ).getTime();
  }


  // =========================================================
  // FORMAT DATE TIME
  // =========================================================

  formatDateTime(
    value?: string | null
  ): string {


    if (
      !value
    ) {

      return '-';
    }


    const d =
      new Date(
        value
      );


    if (
      isNaN(
        d.getTime()
      )
    ) {

      return '-';
    }


    return new Intl.DateTimeFormat(
      'en-GB',
      {

        timeZone:
          'Asia/Bangkok',

        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',

        hour12:
          false

      }
    ).format(d);
  }


  // =========================================================
  // FORMAT NUMBER
  // =========================================================

  formatNumber(
    value?: number | null
  ): string {


    if (
      value === null ||
      value === undefined
    ) {

      return '0';
    }


    return Number(
      value
    ).toLocaleString(
      'en-US'
    );
  }


  // =========================================================
  // SUMMARY
  // =========================================================

  get currentTotal(): number {

    return (
      this.currentRows.length
    );
  }


  get currentViewTotal(): number {

    return (
      this.currentView.length
    );
  }


  get currentQtyBox(): number {

    return this.currentView.reduce(

      (
        sum,
        row
      ) =>

        sum +
        Number(
          row.qtyBox || 0
        ),

      0

    );
  }


  get currentQtySum(): number {

    return this.currentView.reduce(

      (
        sum,
        row
      ) =>

        sum +
        Number(
          row.qtySum || 0
        ),

      0

    );
  }


  // =========================================================
  // INLINE EDIT
  // =========================================================

  isEditing(
    row: MasterPalletRow,
    field: EditableField
  ): boolean {


    return (

      !!this.editState &&

      this.editState.panel ===
        this.activePanel &&

      this.editState.rowId ===
        row.id &&

      this.editState.field ===
        field

    );
  }


  // =========================================================
  // START EDIT
  // =========================================================

  startEdit(
    event: MouseEvent,
    row: MasterPalletRow,
    field: EditableField
  ): void {


    event.stopPropagation();


    // =====================================================
    // ถ้ามีค่าที่แก้แล้วแต่ยังไม่ Save
    // ห้ามเปิดช่องอื่น
    // =====================================================

    if (
      this.editState?.dirty
    ) {

      return;
    }


    let value = '';


    // =====================================================
    // DATE
    // =====================================================

    if (
      field ===
      'userDate'
    ) {

      value =
        this.getEditableDateValue(
          row
        );
    }


    // =====================================================
    // CONTROL LOT
    // =====================================================

    else if (
      field ===
      'controlLot'
    ) {

      value =
        row.controlLot ??
        '';
    }


    // =====================================================
    // VENDOR
    // =====================================================

    else if (
      field ===
      'vender'
    ) {

      value =
        row.vender ??
        '';
    }


    // =====================================================
    // CREATE EDIT STATE
    // =====================================================

    this.editState = {

      panel:
        this.activePanel,

      rowId:
        row.id,

      field,

      originalValue:
        value,

      value,

      dirty:
        false,

      saving:
        false

    };
  }


  // =========================================================
  // VALUE CHANGE
  // =========================================================

  onEditValueChange(
    value: string
  ): void {


    if (
      !this.editState
    ) {

      return;
    }


    this.editState.value =
      value;


    this.editState.dirty =

      this.normalizeEditValue(
        value
      ) !==

      this.normalizeEditValue(
        this.editState.originalValue
      );
  }


  private normalizeEditValue(
    value:
      string |
      null |
      undefined
  ): string {


    return String(
      value ?? ''
    ).trim();
  }


  // =========================================================
  // BLUR / CLICK OUTSIDE
  //
  // ไม่เปลี่ยนค่า:
  // ปิด Editor
  //
  // เปลี่ยนค่า:
  // Editor ค้างไว้จนกด ✓ / ✕
  // =========================================================

  onEditBlur(): void {


    setTimeout(
      () => {


        if (
          !this.editState
        ) {

          return;
        }


        if (
          !this.editState.dirty
        ) {

          this.editState =
            null;
        }


        // dirty = true
        // ไม่ทำอะไร
        //
        // Editor + ✓ + ✕
        // จะยังค้างอยู่

      },
      150
    );
  }


  // =========================================================
  // CANCEL EDIT
  // =========================================================

  cancelEdit(
    event?: MouseEvent
  ): void {


    if (
      event
    ) {

      event.stopPropagation();
    }


    if (
      this.editState?.saving
    ) {

      return;
    }


    // ค่า row จริงยังไม่ได้ถูกแก้
    // จึงแค่ clear edit state

    this.editState =
      null;
  }


  // =========================================================
  // SAVE EDIT
  // =========================================================

  saveEdit(
    event: MouseEvent,
    row: MasterPalletRow
  ): void {


    event.stopPropagation();


    if (
      !this.editState
    ) {

      return;
    }


    if (
      !this.editState.dirty
    ) {

      this.editState =
        null;

      return;
    }


    if (
      this.editState.saving
    ) {

      return;
    }


    // =====================================================
    // BUILD CURRENT VALUES
    //
    // Backend ต้องการครบ 3 ค่าเสมอ
    // =====================================================

    let userDate =
      this.getEditableDateValue(
        row
      );


    let controlLot =
      String(
        row.controlLot ?? ''
      ).trim();


    let vender =
      String(
        row.vender ?? ''
      ).trim();


    // =====================================================
    // APPLY EDITED VALUE
    // =====================================================

    if (
      this.editState.field ===
      'userDate'
    ) {

      userDate =
        this.editState.value;
    }


    else if (
      this.editState.field ===
      'controlLot'
    ) {

      controlLot =
        this.editState.value.trim();
    }


    else if (
      this.editState.field ===
      'vender'
    ) {

      vender =
        this.editState.value.trim();
    }


    // =====================================================
    // VALIDATE DATE
    // =====================================================

    if (
      !userDate
    ) {

      Swal.fire({

        icon:
          'warning',

        title:
          'Date is required',

        text:
          'กรุณาเลือกวันที่และเวลา'

      });

      return;
    }


    const isoUserDate =
      this.dateInputToIso(
        userDate
      );


    if (
      !isoUserDate
    ) {

      Swal.fire({

        icon:
          'warning',

        title:
          'Invalid Date',

        text:
          'วันที่หรือเวลาไม่ถูกต้อง'

      });

      return;
    }


    // =====================================================
    // VALIDATE CONTROL LOT
    // =====================================================

    if (
      !controlLot
    ) {

      Swal.fire({

        icon:
          'warning',

        title:
          'Control Lot is required',

        text:
          'กรุณาเลือก Control Lot'

      });

      return;
    }


    // =====================================================
    // VALIDATE VENDOR
    // =====================================================

    if (
      !vender
    ) {

      Swal.fire({

        icon:
          'warning',

        title:
          'Vendor is required',

        text:
          'กรุณาเลือก Vendor'

      });

      return;
    }


    this.editState.saving =
      true;


    // =====================================================
    // ISSUE
    // =====================================================

    if (
      this.activePanel ===
      'issue'
    ) {


      const body = {

        id:
          row.id,

        sentDateByUser:
          isoUserDate,

        controlLot,

        vender

      };


      this.http.post<any>(

        config.apiServer +
        '/api/masterPallet/editFieldMasterIssue',

        body

      ).subscribe({

        next: (
          res
        ) => {


          const updated =
            res?.data;


          // =================================================
          // UPDATE LOCAL ROW
          // =================================================

          row.sentDateByUser =

            updated?.sentDateByUser ??

            body.sentDateByUser;


          row.controlLot =

            updated?.controlLot ??

            controlLot;


          row.vender =

            updated?.vender ??

            vender;


          this.finishEditSuccess();
        },


        error: (
          err
        ) => {


          if (
            this.editState
          ) {

            this.editState.saving =
              false;
          }


          Swal.fire({

            icon:
              'error',

            title:
              'Update failed',

            text:
              err?.error?.message ||
              err?.error?.error ||
              err?.message ||
              'ไม่สามารถแก้ไขข้อมูล Issue ได้'

          });

        }

      });


      return;
    }


    // =====================================================
    // RECEIVE
    // =====================================================

    const body = {

      id:
        row.id,

      receiveDateByUser:
        isoUserDate,

      controlLot,

      vender

    };


    this.http.post<any>(

      config.apiServer +
      '/api/masterPallet/editFieldMasterReceive',

      body

    ).subscribe({

      next: (
        res
      ) => {


        const updated =
          res?.data;


        // =================================================
        // UPDATE LOCAL ROW
        // =================================================

        row.receiveDateByUser =

          updated?.receiveDateByUser ??

          body.receiveDateByUser;


        row.controlLot =

          updated?.controlLot ??

          controlLot;


        row.vender =

          updated?.vender ??

          vender;


        this.finishEditSuccess();
      },


      error: (
        err
      ) => {


        if (
          this.editState
        ) {

          this.editState.saving =
            false;
        }


        Swal.fire({

          icon:
            'error',

          title:
            'Update failed',

          text:
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            'ไม่สามารถแก้ไขข้อมูล Receive ได้'

        });

      }

    });
  }


  // =========================================================
  // AFTER SAVE SUCCESS
  // =========================================================

  private finishEditSuccess(): void {


    // ปิด editor

    this.editState =
      null;


    // Vendor / Control Lot
    // ใน Report อาจเปลี่ยนแล้ว
    // จึงสร้าง Filter Option ใหม่

    this.buildFilterOptions();


    // refresh view
    // ตาม filter ปัจจุบัน

    this.applyFilters();


    Swal.fire({

      icon:
        'success',

      title:
        'Updated',

      text:
        'แก้ไขข้อมูลเรียบร้อยแล้ว',

      timer:
        1000,

      showConfirmButton:
        false

    });
  }


  // =========================================================
  // GET VALUE FOR datetime-local
  //
  // Database/API:
  // ISO Date
  //
  // Input:
  // YYYY-MM-DDTHH:mm
  // =========================================================

  private getEditableDateValue(
    row: MasterPalletRow
  ): string {


    const value =

      this.activePanel ===
      'issue'

        ? row.sentDateByUser

        : row.receiveDateByUser;


    if (
      !value
    ) {

      return '';
    }


    const date =
      new Date(
        value
      );


    if (
      isNaN(
        date.getTime()
      )
    ) {

      return '';
    }


    // =====================================================
    // datetime-local ต้องการ:
    //
    // YYYY-MM-DDTHH:mm
    //
    // ใช้เวลาตาม Local timezone
    // =====================================================

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        '0'
      );


    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        '0'
      );


    const hour =
      String(
        date.getHours()
      ).padStart(
        2,
        '0'
      );


    const minute =
      String(
        date.getMinutes()
      ).padStart(
        2,
        '0'
      );


    return (
      `${year}-${month}-${day}T${hour}:${minute}`
    );
  }


  // =========================================================
  // DATETIME-LOCAL -> ISO
  //
  // Example:
  //
  // input:
  // 2026-10-02T14:35
  //
  // output:
  // ISO string
  // =========================================================

  private dateInputToIso(
    dateTimeLocal: string
  ): string {


    if (
      !dateTimeLocal
    ) {

      return '';
    }


    const date =
      new Date(
        dateTimeLocal
      );


    if (
      isNaN(
        date.getTime()
      )
    ) {

      return '';
    }


    return (
      date.toISOString()
    );
  }


  // =========================================================
  // HTML EDIT HELPERS
  // =========================================================

  getEditValue(): string {

    return (
      this.editState?.value ??
      ''
    );
  }


  getEditDirty(): boolean {

    return (
      !!this.editState?.dirty
    );
  }


  getEditSaving(): boolean {

    return (
      !!this.editState?.saving
    );
  }

}