declare module 'pdfkit' {
  import { Readable } from 'stream';

  namespace PDFDocument {
    interface PDFDocumentOptions {
      bufferPages?: boolean;
      margin?: number;
      [key: string]: any;
    }
  }

  class PDFDocument extends Readable {
    constructor(options?: PDFDocument.PDFDocumentOptions);
    page: { width: number; height: number };
    y: number;
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: any): this;
    text(text: string, x: number, y: number, options?: any): this;
    moveDown(count?: number): this;
    addPage(options?: any): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    lineTo(x: number, y: number): this;
    moveTo(x: number, y: number): this;
    end(): void;
  }

  export = PDFDocument;
}
