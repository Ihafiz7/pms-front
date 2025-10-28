import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-delete',
  templateUrl: './confirm-delete.component.html',
  styleUrls: ['./confirm-delete.component.scss']
})
export class ConfirmDeleteComponent {
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  @Input() fileName = '';
  @Input() isDeleting = false;

  confirmDelete(): void {
    this.confirmed.emit();
  }

  cancelDelete(): void {
    this.cancelled.emit();
  }
}
