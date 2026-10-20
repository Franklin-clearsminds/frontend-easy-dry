import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SessionIdleDialogComponent } from './shared/components/session-idle-dialog/session-idle-dialog.component';
import { VisorMediaHostComponent } from './shared/components/visor-media-host/visor-media-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SessionIdleDialogComponent, VisorMediaHostComponent],
  template: `
    <router-outlet></router-outlet>
    <app-session-idle-dialog></app-session-idle-dialog>
    <app-visor-media-host></app-visor-media-host>
  `
})
export class AppComponent {
  title = 'frontend-easy-dry';
}
