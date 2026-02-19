/**
 * Enhanced Focus Indicator Directive
 * WCAG 2.4.7: Focus Visible - Enhanced focus styling
 */
import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appFocusIndicator]',
  standalone: true,
})
export class FocusIndicatorDirective {
  private isKeyboardUser = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    // Detect keyboard vs mouse usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') this.isKeyboardUser = true;
    });
    document.addEventListener('mousedown', () => {
      this.isKeyboardUser = false;
    });
  }

  @HostListener('focus')
  onFocus(): void {
    if (this.isKeyboardUser) {
      this.renderer.addClass(this.el.nativeElement, 'keyboard-focus');
    }
  }

  @HostListener('blur')
  onBlur(): void {
    this.renderer.removeClass(this.el.nativeElement, 'keyboard-focus');
  }
}
