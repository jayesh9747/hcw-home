import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { NgxEditorComponent as NgxEditorView, NgxEditorMenuComponent, Editor } from 'ngx-editor';
import { FormsModule } from '@angular/forms';
@Component({
    selector: 'app-md-editor',
    standalone: true,
    imports: [NgxEditorView, NgxEditorMenuComponent, FormsModule],
    template: `
      <div class="NgxEditor__Wrapper">
        <ngx-editor-menu [editor]="editor"></ngx-editor-menu>
        <ngx-editor
          class="custom-editor"
          [editor]="editor"
          [(ngModel)]="html"
          (ngModelChange)="onContentChange($event)"
          [placeholder]="'Type here...'"
        ></ngx-editor>
      </div>
    `,
    styles: [`
      .custom-editor {
        min-height: 300px;
        display: block;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        background-color: #fff;
      }
    `]
  })
  export class MdEditorComponent implements OnInit, OnDestroy {
    @Input() initialContent = '';
    @Output() contentChange = new EventEmitter<string>();
  
    html = '';
    editor!: Editor;
  
    ngOnInit(): void {
      this.editor = new Editor();
      this.html = this.initialContent;
    }
  
    onContentChange(value: string) {
      this.contentChange.emit(value);
    }
  
    ngOnDestroy(): void {
      this.editor.destroy();
    }
  }
  