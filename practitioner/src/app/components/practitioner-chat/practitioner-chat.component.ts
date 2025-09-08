import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ChatMessage {
 id: number;
 userId: number;
 content: string;
 createdAt: string;
 messageType: 'text' | 'image' | 'file' | 'system';
 userName?: string;
 isFromPractitioner?: boolean;
 mediaUrl?: string;
 fileName?: string;
 fileSize?: number;
 readReceipts?: Array<{
  id: number;
  userId: number;
  readAt: string;
  user: {
   id: number;
   firstName: string;
   lastName: string;
  };
 }>;
}

export interface TypingIndicator {
 userId: number;
 userName: string;
 typing: boolean;
}

@Component({
 selector: 'app-practitioner-chat',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './practitioner-chat.component.html',
 styleUrls: ['./practitioner-chat.component.scss']
})
export class PractitionerChatComponent implements OnInit, OnDestroy, AfterViewChecked {
 @Input() messages: ChatMessage[] = [];
 @Input() consultationId!: number;
 @Input() practitionerId!: number;
 @Input() practitionerName!: string;
 @Input() isVisible: boolean = true;
 @Input() unreadCount: number = 0;
 @Input() typingUsers: TypingIndicator[] = [];
 @Input() participants: Array<{ id: number; firstName: string; lastName: string; role: string }> = [];

 @Output() sendMessage = new EventEmitter<string>();
 @Output() sendFile = new EventEmitter<File>();
 @Output() markAllRead = new EventEmitter<void>();
 @Output() startTyping = new EventEmitter<void>();
 @Output() stopTyping = new EventEmitter<void>();

 @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
 @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

 newMessage: string = '';
 isTyping: boolean = false;
 typingTimeout?: number;
 selectedFile?: File;
 isUploading: boolean = false;
 uploadProgress: number = 0;
 showScrollToBottom: boolean = false;

 private shouldScrollToBottom = true;

 ngOnInit() {
  // Mark messages as read when chat is initialized
  if (this.unreadCount > 0) {
   this.markAllAsRead();
  }
 }

 ngAfterViewChecked() {
  if (this.shouldScrollToBottom) {
   this.scrollToBottom();
   this.shouldScrollToBottom = false;
  }
 }

 ngOnDestroy() {
  if (this.typingTimeout) {
   clearTimeout(this.typingTimeout);
  }
 }

 onSendMessage() {
  if (this.newMessage.trim() || this.selectedFile) {
   if (this.selectedFile) {
    this.sendFile.emit(this.selectedFile);
    this.selectedFile = undefined;
   } else {
    this.sendMessage.emit(this.newMessage.trim());
   }

   this.newMessage = '';
   this.stopTypingIndicator();
   this.shouldScrollToBottom = true;
  }
 }

 onInputChange() {
  if (this.newMessage.trim() && !this.isTyping) {
   this.startTypingIndicator();
  }

  // Reset typing timeout
  if (this.typingTimeout) {
   clearTimeout(this.typingTimeout);
  }

  // Stop typing after 3 seconds of inactivity
  this.typingTimeout = window.setTimeout(() => {
   this.stopTypingIndicator();
  }, 3000);
 }

 startTypingIndicator() {
  this.isTyping = true;
  this.startTyping.emit();
 }

 stopTypingIndicator() {
  if (this.isTyping) {
   this.isTyping = false;
   this.stopTyping.emit();
   if (this.typingTimeout) {
    clearTimeout(this.typingTimeout);
    this.typingTimeout = undefined;
   }
  }
 }

 onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
   // Validate file size (10MB limit)
   if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Maximum size is 10MB.');
    return;
   }

   this.selectedFile = file;
  }
 }

 openFileDialog() {
  this.fileInput.nativeElement.click();
 }

 removeSelectedFile() {
  this.selectedFile = undefined;
 }

 markAllAsRead() {
  this.markAllRead.emit();
 }

 scrollToBottom() {
  if (this.messagesContainer?.nativeElement) {
   const element = this.messagesContainer.nativeElement;
   element.scrollTop = element.scrollHeight;
  }
 }

 onScroll() {
  if (this.messagesContainer?.nativeElement) {
   const element = this.messagesContainer.nativeElement;
   const threshold = 100;
   const position = element.scrollTop + element.offsetHeight;
   const height = element.scrollHeight;

   this.showScrollToBottom = height - position > threshold;
  }
 }

 formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
   return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
   });
  }
 }

 formatFileSize(bytes?: number): string {
  if (!bytes) return '';

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
 }

 isImage(mediaType?: string): boolean {
  return mediaType?.startsWith('image/') || false;
 }

 downloadFile(message: ChatMessage) {
  if (message.mediaUrl) {
   const link = document.createElement('a');
   link.href = message.mediaUrl;
   link.download = message.fileName || 'download';
   link.click();
  }
 }

 getMessageInitials(message: ChatMessage): string {
  if (message.messageType === 'system') return 'SYS';
  if (message.isFromPractitioner) return 'Dr';
  return 'P';
 }

 getTypingText(): string {
  if (this.typingUsers.length === 0) return '';

  if (this.typingUsers.length === 1) {
   return `${this.typingUsers[0].userName} is typing...`;
  } else if (this.typingUsers.length === 2) {
   return `${this.typingUsers[0].userName} and ${this.typingUsers[1].userName} are typing...`;
  } else {
   return `${this.typingUsers[0].userName} and ${this.typingUsers.length - 1} others are typing...`;
  }
 }

 getReadReceiptSummary(message: ChatMessage): string {
  if (!message.readReceipts || message.readReceipts.length === 0) {
   return 'Not read';
  }

  const readCount = message.readReceipts.length;
  const totalParticipants = this.participants.length;

  if (readCount === totalParticipants) {
   return 'Read by all';
  } else if (readCount === 1) {
   return `Read by ${message.readReceipts[0].user.firstName}`;
  } else {
   return `Read by ${readCount} participants`;
  }
 }
}
