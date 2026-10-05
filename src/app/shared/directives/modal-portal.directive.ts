import { Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Teletransporta el modal al <body> para que cubra toda la ventana
 * (sidebar, header y contenido). También bloquea el scroll del body.
 */
@Directive({
  selector: '[appModalPortal]',
  standalone: true,
})
export class ModalPortalDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private doc = inject(DOCUMENT);
  private previousOverflow = '';

  ngOnInit(): void {
    this.doc.body.appendChild(this.el.nativeElement);
    this.previousOverflow = this.doc.body.style.overflow;
    this.doc.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.doc.body.style.overflow = this.previousOverflow;
    const node = this.el.nativeElement;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}
