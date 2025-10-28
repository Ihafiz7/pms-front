export interface FileAttachment {
  fileId: number;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploaderName: string;
  uploaderId: number;
  projectName?: string;
  projectId?: number;
  taskTitle?: string;
  taskId?: number;
  uploadedAt: string;
}

export interface FileAttachmentRequest {
  uploaderId: number;
  projectId?: number;
  taskId?: number;
}