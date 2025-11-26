import React, { useState } from 'react';
import { PDFPage } from '../types';
import { FileText, CheckCircle2, GripVertical, Plus, Copy, Trash2 } from 'lucide-react';

interface SidebarProps {
  pages: PDFPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  onAddPage: (index: number) => void;
  onCopyPage: (index: number) => void;
  onDeletePage: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  pages, 
  activePageIndex, 
  onSelectPage, 
  onReorderPages,
  onAddPage,
  onCopyPage,
  onDeletePage
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      onReorderPages(sourceIndex, targetIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const AddPageButton = ({ index }: { index: number }) => (
    <div className="w-full flex justify-center py-2 opacity-0 hover:opacity-100 transition-opacity group/add relative z-10">
      <div className="absolute inset-x-4 top-1/2 h-px bg-brand-200 opacity-0 group-hover/add:opacity-100 transition-opacity" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddPage(index);
        }}
        className="relative bg-white text-brand-500 border border-brand-200 hover:bg-brand-500 hover:text-white rounded-full p-1 shadow-sm transition-all transform hover:scale-110"
        title="Insert Blank Page"
      >
        <Plus size={16} />
      </button>
    </div>
  );

  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pages</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* Insert at the very beginning */}
        {pages.length > 0 && <AddPageButton index={0} />}

        {pages.map((page, index) => {
           const hasEdits = page.rects.length > 0;
           const hasGenerated = page.generatedImages.length > 0;
           const isDragging = draggedIndex === index;
           const isDragOver = dragOverIndex === index;

           return (
            <React.Fragment key={index}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectPage(index)}
                className={`group relative w-full flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing ${
                  activePageIndex === index
                    ? 'border-brand-500 bg-brand-50 shadow-md'
                    : 'border-transparent hover:bg-gray-100 hover:border-gray-200'
                } ${isDragging ? 'opacity-50 ring-2 ring-brand-300 border-dashed' : ''} ${isDragOver && !isDragging ? 'border-brand-300 bg-brand-50 translate-y-1' : ''}`}
              >
                {/* Drag Handle Indicator */}
                <div className="absolute top-2 left-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <GripVertical size={16} />
                </div>

                {/* Delete Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(index);
                  }}
                  className="absolute bottom-2 left-2 p-1.5 bg-white/90 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Delete Page"
                >
                  <Trash2 size={14} />
                </button>

                {/* Duplicate Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyPage(index);
                  }}
                  className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-md text-gray-500 hover:text-brand-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Duplicate Page"
                >
                  <Copy size={14} />
                </button>

                <div 
                  className="relative w-full bg-gray-200 rounded overflow-hidden shadow-sm pointer-events-none"
                  style={{ aspectRatio: `${page.width} / ${page.height}` }}
                >
                   <img 
                      src={page.selectedImageId 
                        ? page.generatedImages.find(g => g.id === page.selectedImageId)?.base64 || page.originalBase64
                        : page.originalBase64
                      } 
                      alt={`Page ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Indicators */}
                    <div className="absolute top-1 right-1 flex gap-1">
                      {hasEdits && !hasGenerated && (
                        <div className="bg-yellow-400 text-white p-1 rounded-full shadow-sm" title="Has pending edits">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                      {hasGenerated && (
                        <div className="bg-brand-500 text-white p-0.5 rounded-full shadow-sm" title="Has generated versions">
                          <CheckCircle2 size={12} />
                        </div>
                      )}
                    </div>
                </div>
                <span className={`text-sm font-medium ${activePageIndex === index ? 'text-brand-700' : 'text-gray-600'}`}>
                  Page {index + 1}
                </span>
              </div>
              
              {/* Insert after this page */}
              <AddPageButton index={index + 1} />
            </React.Fragment>
           );
        })}
        
        {pages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <FileText className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-sm">No PDF Loaded</p>
          </div>
        )}
      </div>
    </div>
  );
};