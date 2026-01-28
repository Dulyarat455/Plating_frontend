
import { RouterModule } from '@angular/router';

// navbar.component.ts
import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  formattedDate: string = '';
  formattedTime: string = '';
  private timeInterval: any;

  token: string | undefined = '111111';
  constructor(private renderer: Renderer2) {}

  ngOnInit(): void {
    this.updateDateTime();
    // Update time every second

    this.applyAuthLayoutClass();

    this.timeInterval = setInterval(() => {
      this.updateDateTime();
    }, 1000);

    // Add scroll listener for navbar shadow effect
    window.addEventListener('scroll', this.onScroll);
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    window.removeEventListener('scroll', this.onScroll);
  }



  private applyAuthLayoutClass() {
    const hasToken = !!this.token && this.token.trim().length > 0;

    if (!hasToken) {
      // ไม่ login -> บังคับ layout แบบ sidebar ปิด
      this.renderer.addClass(document.body, 'no-auth');
      this.renderer.addClass(document.body, 'sidebar-collapse');
      this.renderer.addClass(document.body, 'sidebar-closed');
    } else {
      this.renderer.removeClass(document.body, 'no-auth');
      this.renderer.removeClass(document.body, 'sidebar-closed');
      // sidebar-collapse จะให้ user กดเปิด/ปิดเองได้ ไม่ต้องลบก็ได้
    }
  }



  updateDateTime(): void {
    const now = new Date();
    
    // Format date: DD/MM/YYYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    this.formattedDate = `${day}/${month}/${year}`;
    
    // Format time: HH:mm:ss
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    this.formattedTime = `${hours}:${minutes}:${seconds}`;
  }

  onScroll = (): void => {
    const navbar = document.querySelector('.plating-navbar');
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    }
  }
}