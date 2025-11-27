export interface Rect {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  w: number; // Percentage 0-100
  h: number; // Percentage 0-100
  prompt: string;
  referenceImage?: string; // Base64 string of uploaded reference image
}

export interface GeneratedImage {
  id: string;
  base64: string;
  timestamp: number;
  promptUsed: string;
}

export interface PDFPage {
  pageIndex: number;
  originalBase64: string; // The original rasterized page
  width: number;
  height: number;

  // State for edits
  rects: Rect[];

  // History
  generatedImages: GeneratedImage[];
  selectedImageId: string | null; // null means original

  // UI State
  isGenerating: boolean;
}

export interface AppState {
  pdfName: string;
  pages: PDFPage[];
  activePageIndex: number;
  imageResolution: '1k' | '2k';
  enhanceText: boolean;
}