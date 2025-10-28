import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileAttachment } from 'src/app/models/FileAttachment.model';
import { FileAttachmentService } from 'src/app/services/file-attachment.service';

@Component({
  selector: 'app-file-details',
  templateUrl: './file-details.component.html',
  styleUrls: ['./file-details.component.scss']
})
export class FileDetailsComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<FileAttachment>();
  @Output() deleteRequested = new EventEmitter<FileAttachment>();
  @Input() file!: FileAttachment;

  constructor(private fileService: FileAttachmentService) { }

  closeModal(): void {
    this.closed.emit();
  }

  downloadFile(): void {
    this.downloadRequested.emit(this.file);
  }

  deleteFile(): void {
    this.deleteRequested.emit(this.file);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return '🖼️';
      case 'zip':
      case 'rar':
      case '7z':
        return '📦';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      case 'mp3':
      case 'wav':
        return '🎵';
      default:
        return '📎';
    }
  }
}
