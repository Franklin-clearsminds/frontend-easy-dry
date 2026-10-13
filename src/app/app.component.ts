import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SessionIdleDialogComponent } from './shared/components/session-idle-dialog/session-idle-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SessionIdleDialogComponent],
  template: `
    <router-outlet></router-outlet>
    <app-session-idle-dialog></app-session-idle-dialog>
  `
})
export class AppComponent {
  title = 'frontend-easy-dry';
}
