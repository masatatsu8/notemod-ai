import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { PDFPage, Rect } from '../types';

// Configure worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@5.4.394/build/pdf.worker.min.js`;

export const loadPDF = async (file: File): Promise<PDFPage[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages: PDFPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High res for editing
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    
    pages.push({
      pageIndex: i - 1,
      originalBase64: base64,
      width: viewport.width,
      height: viewport.height,
      rects: [],
      generatedImages: [],
      selectedImageId: null,
      isGenerating: false,
    });
  }

  return pages;
};

export const createBlankPageBase64 = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.8);
  }
  return '';
};

export const exportPDF = (pages: PDFPage[], fileName: string) => {
  if (pages.length === 0) return;

  // Initialize jsPDF. Orientation depends on first page, but we'll adapt per page.
  const pdf = new jsPDF({
    orientation: pages[0].width > pages[0].height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pages[0].width, pages[0].height]
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    }

    // Determine which image to use (Original vs Generated)
    let imageToUse = page.originalBase64;
    if (page.selectedImageId) {
      const gen = page.generatedImages.find(g => g.id === page.selectedImageId);
      if (gen) {
        imageToUse = gen.base64;
      }
    }

    pdf.addImage(imageToUse, 'JPEG', 0, 0, page.width, page.height);
  });

  pdf.save(fileName.replace('.pdf', '_modified.pdf'));
};

/**
 * Removes a watermark by filling the specified rect with the average color
 * of its immediate surroundings.
 */
export const removeWatermarkFromBase64 = (base64Image: string, rect: Rect): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Convert percentages to pixels
      const x = Math.floor((rect.x / 100) * canvas.width);
      const y = Math.floor((rect.y / 100) * canvas.height);
      const w = Math.ceil((rect.w / 100) * canvas.width);
      const h = Math.ceil((rect.h / 100) * canvas.height);

      // Boundary checks
      const safeX = Math.max(0, x);
      const safeY = Math.max(0, y);
      const safeW = Math.min(canvas.width - safeX, w);
      const safeH = Math.min(canvas.height - safeY, h);

      // Sample pixels from the immediate border (top, bottom, left, right)
      // We will sample a 2px border around the rect
      let r = 0, g = 0, b = 0, count = 0;

      const samplePixel = (px: number, py: number) => {
        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          const pixelData = ctx.getImageData(px, py, 1, 1).data;
          r += pixelData[0];
          g += pixelData[1];
          b += pixelData[2];
          count++;
        }
      };

      // Top and Bottom borders
      for (let i = safeX; i < safeX + safeW; i++) {
        samplePixel(i, safeY - 1); // Top
        samplePixel(i, safeY + safeH); // Bottom
      }

      // Left and Right borders
      for (let j = safeY; j < safeY + safeH; j++) {
        samplePixel(safeX - 1, j); // Left
        samplePixel(safeX + safeW, j); // Right
      }

      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
      } else {
        // Fallback if no border pixels found (e.g. full screen rect), default to white
        r = 255; g = 255; b = 255;
      }

      // Fill the rect
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(safeX, safeY, safeW, safeH);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = base64Image;
  });
};