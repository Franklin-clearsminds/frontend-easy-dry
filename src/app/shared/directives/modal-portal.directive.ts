import { Directive, ElementRef, inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Teletransporta el modal al <body> para que cubra toda la ventana
 * (evita quedar atrapado por overflow/transform de contenedores padres).
 */
@Directive({
  selector: '[appModalPortal]',
  standalone: true,
})
export class ModalPortalDirective implements OnInit {
  private el = inject(ElementRef<HTMLElement>);
  private doc = inject(DOCUMENT);

  ngOnInit(): void {
    this.doc.body.appendChild(this.el.nativeElement);
  }
}
