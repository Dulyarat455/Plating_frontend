
import { RouterModule } from '@angular/router';

// navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';

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

  ngOnInit(): void {
    this.updateDateTime();
    // Update time every second
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