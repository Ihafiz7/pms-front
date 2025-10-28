import { Injectable } from '@angular/core';
import Swal, { SweetAlertResult } from 'sweetalert2';

export interface DialogOptions {
  title?: string;
  text?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  customClass?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  // Success dialog
  success(message: string, title: string = 'Success!'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      icon: 'success',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
      }
    });
  }

  // Error dialog
  error(message: string, title: string = 'Error!'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
      }
    });
  }

  // Warning dialog
  warning(message: string, title: string = 'Warning!'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      icon: 'warning',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
      }
    });
  }

  // Info dialog
  info(message: string, title: string = 'Information'): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      icon: 'info',
      confirmButtonText: 'OK',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
      }
    });
  }

  // Confirm dialog (replacement for confirm())
  confirm(
    message: string,
    title: string = 'Are you sure?',
    confirmText: string = 'Yes',
    cancelText: string = 'Cancel'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mr-2',
        cancelButton: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors'
      },
      buttonsStyling: false,
      reverseButtons: true
    });
  }

  // Prompt dialog (replacement for prompt())
  prompt(
    message: string,
    title: string = 'Please enter',
    inputType: 'text' | 'textarea' | 'number' | 'password' = 'text',
    defaultValue: string = ''
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      title,
      text: message,
      input: inputType,
      inputValue: defaultValue,
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        input: 'rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mr-2',
        cancelButton: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors'
      },
      buttonsStyling: false,
      reverseButtons: true
    });
  }

  // Custom dialog
  custom(options: DialogOptions): Promise<SweetAlertResult> {
    const defaultOptions = {
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors',
        cancelButton: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors'
      },
      buttonsStyling: false
    };

    return Swal.fire({ ...defaultOptions, ...options });
  }
}
