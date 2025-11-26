import React from 'react';
import { GeneratedImage } from '../types';
import { History, Sparkles, X } from 'lucide-react';

interface HistorySelectorProps {
  originalImage: string;
  generatedImages: GeneratedImage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export const HistorySelector: React.FC<HistorySelectorProps> = ({
  originalImage,
  generatedImages,
  selectedId,
  onSelect,
  onDelete
}) => {
  if (generatedImages.length === 0) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-32 bg-white border-t border-gray-200 p-4 flex flex-col z-10 shadow-up">
      <div className="flex justify-between items-center mb-2">
         <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <History size={14} />
            Version History
         </h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 h-full items-center px-1">
        {/* Original */}
        <button
          onClick={() => onSelect(null)}
          className={`relative group flex-shrink-0 h-20 aspect-[1/1.4] rounded-lg border-2 overflow-hidden transition-all ${
            selectedId === null ? 'border-brand-500 ring-2 ring-brand-200 scale-105 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'
          }`}
        >
          <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <span className="text-white text-xs font-medium">Original</span>
          </div>
          {selectedId === null && (
            <div className="absolute top-1 right-1 bg-brand-500 w-2 h-2 rounded-full ring-1 ring-white" />
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-12 bg-gray-300 flex-shrink-0 mx-2" />

        {/* Generated Versions */}
        {generatedImages.map((gen, idx) => (
          <div key={gen.id} className="relative group flex-shrink-0">
              <button
                onClick={() => onSelect(gen.id)}
                className={`relative h-20 aspect-[1/1.4] rounded-lg border-2 overflow-hidden transition-all ${
                  selectedId === gen.id ? 'border-brand-500 ring-2 ring-brand-200 scale-105 shadow-md' : 'border-purple-200 opacity-80 hover:opacity-100'
                }`}
              >
                <img src={gen.base64} alt={`V${idx + 1}`} className="w-full h-full object-cover" />
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                   <span className="text-white text-[10px] font-medium leading-tight line-clamp-2 px-1">
                       {gen.promptUsed || 'Edited'}
                   </span>
                </div>

                {selectedId === gen.id && (
                    <div className="absolute top-1 left-1 bg-brand-500 w-2 h-2 rounded-full ring-1 ring-white" />
                )}
                <div className="absolute bottom-0 right-0 p-1 bg-gradient-to-t from-black/50 to-transparent w-full flex justify-end">
                    <Sparkles size={10} className="text-purple-300 fill-purple-300" />
                </div>
              </button>

              {/* Delete Button (Visible on hover) */}
              <button
                  onClick={(e) => {
                      e.stopPropagation();
                      onDelete(gen.id);
                  }}
                  className="absolute top-1 right-1 bg-white text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Delete version"
              >
                  <X size={12} />
              </button>
          </div>
        ))}
      </div>
    </div>
  );
};