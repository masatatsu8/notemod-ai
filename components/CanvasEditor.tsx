import React, { useState, useRef, PointerEvent } from 'react';
import { Rect } from '../types';
import { X, MessageSquarePlus, ImagePlus, Trash2 } from 'lucide-react';

interface CanvasEditorProps {
  imageSrc: string;
  rects: Rect[];
  onAddRect: (rect: Rect) => void;
  onRemoveRect: (id: string) => void;
  onUpdateRectPrompt: (id: string, prompt: string) => void;
  onUpdateRectImage?: (id: string, base64Image: string) => void;
  readOnly: boolean; // True if viewing a generated image
  isWatermarkMode: boolean;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  imageSrc, 
  rects, 
  onAddRect, 
  onRemoveRect, 
  onUpdateRectPrompt,
  onUpdateRectImage,
  readOnly,
  isWatermarkMode
}) => {
  // Use a ref for the wrapper that matches the image dimensions exactly
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);

  const getRelativeCoords = (e: PointerEvent) => {
    if (!imageWrapperRef.current) return { x: 0, y: 0 };
    const rect = imageWrapperRef.current.getBoundingClientRect();
    
    // Calculate relative to the image wrapper
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp values to 0-100%
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    return { x, y };
  };

  const handlePointerDown = (e: PointerEvent) => {
    console.log("Pointer Down: Mode=", isWatermarkMode ? "Watermark" : "Standard", "ReadOnly=", readOnly);
    
    // Allow drawing if in watermark mode, regardless of readOnly status
    if (readOnly && !isWatermarkMode) {
        console.log("Skipping pointer down: ReadOnly mode active");
        return;
    }
    
    // Don't start drawing if clicking on an input or delete button
    if ((e.target as HTMLElement).closest('.rect-control')) return;

    // Capture the pointer to track movement even outside the element
    try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch (err) {
        console.warn("SetPointerCapture failed:", err);
    }

    const coords = getRelativeCoords(e);
    setIsDrawing(true);
    setStartPos(coords);
    setSelectedRectId(null);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing || !startPos) return;
    
    const coords = getRelativeCoords(e);
    const w = Math.abs(coords.x - startPos.x);
    const h = Math.abs(coords.y - startPos.y);
    const x = Math.min(coords.x, startPos.x);
    const y = Math.min(coords.y, startPos.y);

    setCurrentRect({ x, y, w, h });
  };

  const handlePointerUp = (e: PointerEvent) => {
    console.log("Pointer Up. Drawing:", isDrawing);
    if (!isDrawing) return;

    // Release capture
    try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch (err) {
        console.warn("ReleasePointerCapture failed:", err);
    }

    if (!startPos || !currentRect) {
      console.log("No valid selection rect");
      cleanupDrawing();
      return;
    }

    console.log("Rect created:", currentRect);

    // Minimum size check (0.1% to allow small watermark selection)
    if (currentRect.w > 0.1 && currentRect.h > 0.1) {
      const newRect: Rect = {
        id: crypto.randomUUID(),
        ...currentRect,
        prompt: ''
      };
      
      console.log("Dispatching new rect to App");
      onAddRect(newRect);

      // Only select it if we are NOT in watermark mode (watermark mode is immediate action)
      if (!isWatermarkMode) {
          setSelectedRectId(newRect.id);
      }
    } else {
        console.log("Selection too small, ignored");
    }

    cleanupDrawing();
  };

  const cleanupDrawing = () => {
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, rectId: string) => {
      if (e.target.files && e.target.files[0] && onUpdateRectImage) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  onUpdateRectImage(rectId, event.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-gray-100 overflow-auto p-4 ${isWatermarkMode ? 'cursor-crosshair' : ''}`}>
       
       {/* Instruction Banner */}
       {isWatermarkMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse pointer-events-none">
          消去したいエリアを選択してください（マウスを離すと実行されます）
        </div>
      )}

      {/* 
        Image Wrapper:
        inline-block ensures the div shrinks to fit the image width exactly.
        relative allows absolute positioning of rects within the image context.
      */}
      <div 
        ref={imageWrapperRef}
        className="relative inline-block shadow-lg touch-none" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img 
          src={imageSrc} 
          alt="Page Content" 
          className="block max-h-[85vh] max-w-full h-auto w-auto object-contain select-none"
          draggable={false}
        />

        {/* Existing Rects layer */}
        {!readOnly && !isWatermarkMode && rects.map(rect => (
          <div
            key={rect.id}
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`
            }}
            className={`absolute border-2 transition-colors cursor-pointer ${selectedRectId === rect.id ? 'border-brand-500 bg-brand-500/10 z-10' : 'border-blue-400 bg-blue-400/10 hover:bg-blue-400/20'}`}
            onPointerDown={(e) => {
              // CRITICAL: Stop propagation so the parent wrapper doesn't receive the event.
              // This prevents 'handlePointerDown' on the wrapper from clearing the selection.
              e.stopPropagation();
              e.preventDefault();
              setSelectedRectId(rect.id);
            }}
          >
             {/* Prompt Input Box */}
             {selectedRectId === rect.id && (
                <div className="rect-control absolute left-0 -top-14 bg-white rounded shadow-lg p-2 min-w-[280px] flex gap-2 z-20 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                   <div className="bg-brand-100 p-1.5 rounded text-brand-700 h-fit mt-0.5">
                      <MessageSquarePlus size={14} />
                   </div>
                   
                   <div className="flex-1 flex flex-col gap-2">
                       <input 
                          autoFocus
                          type="text" 
                          placeholder="修正内容を入力..."
                          className="text-sm border-none outline-none w-full bg-transparent"
                          value={rect.prompt}
                          onChange={(e) => onUpdateRectPrompt(rect.id, e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                       />
                       
                       {/* Reference Image UI */}
                       {onUpdateRectImage && (
                           <div className="flex items-center gap-2">
                               {rect.referenceImage ? (
                                   <div className="relative group/thumb">
                                        <img 
                                            src={rect.referenceImage} 
                                            alt="Ref" 
                                            className="w-8 h-8 object-cover rounded border border-gray-200"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateRectImage(rect.id, ""); // Clear image
                                            }}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                            title="画像を削除"
                                        >
                                            <X size={8} />
                                        </button>
                                   </div>
                               ) : (
                                   <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          fileInputRef.current?.click();
                                      }}
                                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
                                      title="参照画像を追加"
                                   >
                                       <ImagePlus size={12} />
                                       <span>画像を追加</span>
                                   </button>
                               )}
                               
                               {/* Hidden file input - shared for all rects, activated by click */}
                               <input 
                                   type="file" 
                                   ref={fileInputRef} 
                                   className="hidden" 
                                   accept="image/*"
                                   onChange={(e) => handleImageUpload(e, rect.id)}
                               />
                           </div>
                       )}
                   </div>

                   <div className="h-full border-l border-gray-200 pl-2 ml-1">
                       <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRect(rect.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                          title="領域を削除"
                       >
                         <Trash2 size={16} />
                       </button>
                   </div>
                </div>
             )}
          </div>
        ))}

        {/* Currently Drawing Rect */}
        {currentRect && (
          <div
            style={{
              left: `${currentRect.x}%`,
              top: `${currentRect.y}%`,
              width: `${currentRect.w}%`,
              height: `${currentRect.h}%`
            }}
            className={`absolute border-2 pointer-events-none ${
                isWatermarkMode 
                ? 'border-red-500 bg-red-500/20' 
                : 'border-brand-500 bg-brand-500/20'
            }`}
          />
        )}
      </div>

      {readOnly && !isWatermarkMode && (
          <div className="fixed bottom-36 bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm pointer-events-none animate-flicker">
             プレビューモード（生成済み画像）
          </div>
      )}
    </div>
  );
};