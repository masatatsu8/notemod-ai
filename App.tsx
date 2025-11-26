import React, { useState, useEffect } from 'react';
import { AppState, PDFPage, Rect, GeneratedImage } from './types';

import { loadPDF, exportPDF, removeWatermarkFromBase64, createBlankPageBase64 } from './services/pdfService';
import { generateModifiedPage, generateTitlePage } from './services/geminiService';
import { saveWorkspace, loadWorkspace } from './services/workspaceService';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CanvasEditor } from './components/CanvasEditor';
import { HistorySelector } from './components/HistorySelector';
import { TitlePageModal, TitlePageData } from './components/TitlePageModal';
import { LoginPanel } from './components/LoginPanel';
import { Key, UploadCloud, AlertTriangle, Trash2 } from 'lucide-react';
import { isAuthenticationRequired, validateCredentials, setAuthToken, isAuthenticated } from './services/authService';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [state, setState] = useState<AppState>({
    pdfName: '',
    pages: [],
    activePageIndex: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isWatermarkMode, setIsWatermarkMode] = useState(false);

  // Modal state for watermark confirmation
  const [pendingWatermarkRect, setPendingWatermarkRect] = useState<Rect | null>(null);

  // Modal state for deletion confirmation (images)
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(null);

  // Modal state for page deletion confirmation
  const [pendingPageDeletionIndex, setPendingPageDeletionIndex] = useState<number | null>(null);

  // Modal state for Title Page Creation
  const [isTitlePageModalOpen, setIsTitlePageModalOpen] = useState(false);



  // --- Authentication Check ---
  useEffect(() => {
    if (isAuthenticationRequired()) {
      setIsLoggedIn(isAuthenticated());
    } else {
      setIsLoggedIn(true); // No auth required, auto-login
    }
  }, []);

  const handleLogin = (username: string, password: string) => {
    if (validateCredentials(username, password)) {
      setAuthToken();
      setIsLoggedIn(true);
      setLoginError(undefined);
    } else {
      setLoginError('ユーザー名またはパスワードが正しくありません');
    }
  };

  // --- API Key Check ---
  useEffect(() => {
    const checkApiKey = async () => {
      // Check environment variable first
      if (process.env.GEMINI_API_KEY) {
        setHasApiKey(true);
        return;
      }

      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success if user completes the flow
      setHasApiKey(true);
    }
  };

  // --- Actions ---

  const handleReset = () => {
    if (state.pages.length > 0) {
      if (window.confirm("Are you sure you want to create a new project? Unsaved changes will be lost.")) {
        setState({
          pdfName: '',
          pages: [],
          activePageIndex: 0
        });
        setIsWatermarkMode(false);
      }
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      if (file.name.toLowerCase().endsWith('.nmw')) {
        // Load Workspace
        const newState = await loadWorkspace(file);
        setState(newState);
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
        // Load PDF
        const pages = await loadPDF(file);
        setState({
          pdfName: file.name,
          pages,
          activePageIndex: 0
        });
      } else {
        alert("Unsupported file type. Please upload a PDF or .nmw file.");
      }
    } catch (err) {
      console.error("Failed to load file", err);
      alert("Error loading file. " + (err instanceof Error ? err.message : ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveWorkspace = async () => {
    setIsProcessing(true);
    try {
      await saveWorkspace(state);
    } catch (err) {
      console.error("Failed to save workspace", err);
      alert("Failed to save workspace.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    exportPDF(state.pages, state.pdfName);
  };

  // --- Drag and Drop Handlers ---

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Prevent flickering when dragging over child elements
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // --- Page Edit Logic ---

  const updateCurrentPage = (updater: (page: PDFPage) => PDFPage) => {
    setState(prev => {
      const newPages = [...prev.pages];
      newPages[prev.activePageIndex] = updater(newPages[prev.activePageIndex]);
      return { ...prev, pages: newPages };
    });
  };

  const handleReorderPages = (fromIndex: number, toIndex: number) => {
    setState(prev => {
      const newPages = [...prev.pages];
      const [movedPage] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, movedPage);

      // We need to figure out where the active page went
      const activePage = prev.pages[prev.activePageIndex];
      const newActiveIndex = newPages.indexOf(activePage);

      return {
        ...prev,
        pages: newPages,
        activePageIndex: newActiveIndex
      };
    });
  };

  const handleAddPage = (index: number) => {
    setState(prev => {
      // Determine dimensions from adjacent page, or default to A4 (approx 595x842 at 2x -> ~1200x1700)
      // We'll use a standard A4 pixel ratio if no pages exist, or the previous/next page size.
      let width = 1190;
      let height = 1684;

      if (prev.pages.length > 0) {
        // Try to take size from the page before, or the page at the index (if inserting before)
        const refPage = prev.pages[index - 1] || prev.pages[index] || prev.pages[0];
        width = refPage.width;
        height = refPage.height;
      }

      const blankBase64 = createBlankPageBase64(width, height);

      const newPage: PDFPage = {
        pageIndex: -1, // Will be re-indexed if needed, but we rely on array order
        originalBase64: blankBase64,
        width,
        height,
        rects: [],
        generatedImages: [],
        selectedImageId: null,
        isGenerating: false
      };

      const newPages = [...prev.pages];
      newPages.splice(index, 0, newPage);

      // Adjust active page index if we inserted before the current one
      let newActiveIndex = prev.activePageIndex;
      if (index <= prev.activePageIndex) {
        newActiveIndex += 1;
      }
      // Or jump to the new page? Usually user wants to see what they added.
      newActiveIndex = index;

      return {
        ...prev,
        pages: newPages,
        activePageIndex: newActiveIndex
      };
    });
  };

  const handleCopyPage = (index: number) => {
    setState(prev => {
      const sourcePage = prev.pages[index];

      // Deep copy rects and generated images to avoid reference issues
      const newPage: PDFPage = {
        ...sourcePage,
        rects: sourcePage.rects.map(r => ({ ...r, id: crypto.randomUUID() })),
        generatedImages: sourcePage.generatedImages.map(g => ({ ...g, id: crypto.randomUUID() })),
        selectedImageId: sourcePage.selectedImageId
          ? sourcePage.generatedImages.find(g => g.id === sourcePage.selectedImageId)
            ? sourcePage.generatedImages.find(g => g.id === sourcePage.selectedImageId)!.id
            : null
          : null
      };

      // Fix ID matching for selected image
      if (sourcePage.selectedImageId) {
        const oldIndex = sourcePage.generatedImages.findIndex(g => g.id === sourcePage.selectedImageId);
        if (oldIndex !== -1) {
          newPage.selectedImageId = newPage.generatedImages[oldIndex].id;
        }
      }

      const newPages = [...prev.pages];
      newPages.splice(index + 1, 0, newPage); // Insert after

      return {
        ...prev,
        pages: newPages,
        activePageIndex: index + 1 // Switch to the copy
      };
    });
  };

  const handleDeletePage = (index: number) => {
    setPendingPageDeletionIndex(index);
  };

  const executePageDeletion = () => {
    if (pendingPageDeletionIndex === null) return;

    setState(prev => {
      const newPages = prev.pages.filter((_, i) => i !== pendingPageDeletionIndex);

      let newActiveIndex = prev.activePageIndex;

      // If we deleted the last page or the only page
      if (newPages.length === 0) {
        newActiveIndex = 0;
      } else {
        // If we deleted a page before the active one, shift active index left
        if (pendingPageDeletionIndex < prev.activePageIndex) {
          newActiveIndex -= 1;
        }
        // If we deleted the active page itself
        else if (pendingPageDeletionIndex === prev.activePageIndex) {
          // Try to stay at same index (next page moves in), but clamp to end
          newActiveIndex = Math.min(newActiveIndex, newPages.length - 1);
        }
      }

      return {
        ...prev,
        pages: newPages,
        activePageIndex: newActiveIndex
      };
    });
    setPendingPageDeletionIndex(null);
  };

  // Triggered when user finishes selecting a rect in Watermark Mode
  const handleBatchWatermarkRemoval = (rect: Rect) => {
    console.log("handleBatchWatermarkRemoval triggered. Opening modal.");
    setPendingWatermarkRect(rect);
  };

  // Execute the actual removal after user confirms in the modal
  const executeWatermarkRemoval = async () => {
    if (!pendingWatermarkRect) return;

    const rect = pendingWatermarkRect;
    setPendingWatermarkRect(null); // Close modal

    console.log("User confirmed. Starting batch process.");

    setIsProcessing(true);

    try {
      const newPages = await Promise.all(state.pages.map(async (page) => {
        // Use current active image as source (allows chaining removals)
        const sourceImage = page.selectedImageId
          ? page.generatedImages.find(g => g.id === page.selectedImageId)?.base64 || page.originalBase64
          : page.originalBase64;

        const processedBase64 = await removeWatermarkFromBase64(sourceImage, rect);

        const newGenImage: GeneratedImage = {
          id: crypto.randomUUID(),
          base64: processedBase64,
          timestamp: Date.now(),
          promptUsed: "透かし削除"
        };

        return {
          ...page,
          generatedImages: [newGenImage, ...page.generatedImages],
          selectedImageId: newGenImage.id
        };
      }));

      setState(prev => ({ ...prev, pages: newPages }));

    } catch (err) {
      console.error("Error removing watermark", err);
      alert("Failed to process watermark removal.");
    } finally {
      setIsProcessing(false);
    }
  };

  const addRect = (rect: Rect) => {
    if (isWatermarkMode) {
      handleBatchWatermarkRemoval(rect);
    } else {
      updateCurrentPage(page => ({
        ...page,
        rects: [...page.rects, rect],
        selectedImageId: null // Revert to original when editing starts
      }));
    }
  };

  const removeRect = (id: string) => {
    updateCurrentPage(page => ({
      ...page,
      rects: page.rects.filter(r => r.id !== id)
    }));
  };

  const updateRectPrompt = (id: string, prompt: string) => {
    updateCurrentPage(page => ({
      ...page,
      rects: page.rects.map(r => r.id === id ? { ...r, prompt } : r)
    }));
  };

  const updateRectImage = (id: string, base64Image: string) => {
    updateCurrentPage(page => ({
      ...page,
      rects: page.rects.map(r => r.id === id ? { ...r, referenceImage: base64Image } : r)
    }));
  };

  const selectImageVersion = (id: string | null) => {
    updateCurrentPage(page => ({
      ...page,
      selectedImageId: id
    }));
  };

  const executeDeletion = () => {
    if (!pendingDeletionId) return;
    const id = pendingDeletionId;

    updateCurrentPage(page => {
      const newImages = page.generatedImages.filter(img => img.id !== id);

      // If the deleted image was selected, switch to:
      // 1. The first available generated image, OR
      // 2. The original image (null)
      let newSelectedId = page.selectedImageId;
      if (page.selectedImageId === id) {
        newSelectedId = newImages.length > 0 ? newImages[0].id : null;
      }

      return {
        ...page,
        generatedImages: newImages,
        selectedImageId: newSelectedId
      };
    });

    setPendingDeletionId(null);
  };

  // --- Generation Logic ---

  const handleModifyPage = async () => {
    const idx = state.activePageIndex;
    const page = state.pages[idx];

    // Check if the current page has valid prompts
    // We filter rects to make sure we're not just sending empty ones
    const hasValidPrompts = page.rects.length > 0 && page.rects.some(r => r.prompt.trim() !== '');

    if (!hasValidPrompts) {
      alert("現在のページで修正する領域を選択し、指示を入力してください。");
      return;
    }

    setIsProcessing(true);

    // Process only the active page
    const pagesToProcess = [{ page, idx }];

    try {
      for (const { page, idx } of pagesToProcess) {
        // Mark generating
        setState(prev => {
          const ps = [...prev.pages];
          ps[idx].isGenerating = true;
          return { ...prev, pages: ps };
        });

        try {
          const newImageBase64 = await generateModifiedPage(page);

          const newGenImage: GeneratedImage = {
            id: crypto.randomUUID(),
            base64: newImageBase64,
            timestamp: Date.now(),
            promptUsed: page.rects.map(r => r.prompt).join('; ')
          };

          setState(prev => {
            const ps = [...prev.pages];
            ps[idx].isGenerating = false;
            ps[idx].generatedImages.unshift(newGenImage); // Add to start
            ps[idx].selectedImageId = newGenImage.id; // Auto select new one
            return { ...prev, pages: ps };
          });

        } catch (e) {
          console.error(`Error generating page ${idx}`, e);
          // Check for API key error to prompt user again if needed, 
          // though the top-level check should catch init issues.
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes("403") || errorMsg.includes("PERMISSION_DENIED")) {
            alert("API Permission Denied. Please ensure you have selected a valid API key with billing enabled.");
            setHasApiKey(false); // Force re-selection
          }

          setState(prev => {
            const ps = [...prev.pages];
            ps[idx].isGenerating = false;
            return { ...prev, pages: ps };
          });
        }
      }
    } catch (e) {
      console.error("Processing error", e);
    } finally {
      setIsProcessing(false);
    }
  };




  const handleCreateTitlePage = async (data: TitlePageData) => {
    setIsProcessing(true);
    try {
      // Get reference image from selected page if specified
      const referenceImages: string[] = [];

      if (data.referencePageNumber && data.referencePageNumber > 0 && data.referencePageNumber <= state.pages.length) {
        const refPage = state.pages[data.referencePageNumber - 1]; // Convert to 0-indexed
        const currentImage = refPage.selectedImageId
          ? refPage.generatedImages.find(g => g.id === refPage.selectedImageId)?.base64 || refPage.originalBase64
          : refPage.originalBase64;
        referenceImages.push(currentImage);
      }

      const base64Image = await generateTitlePage(data, referenceImages, data.additionalInstructions);

      // Create new page
      // Use dimensions from the first page if available, otherwise default to A4 (2x scale)
      let width = 1190;
      let height = 1684;

      if (state.pages.length > 0) {
        width = state.pages[0].width;
        height = state.pages[0].height;
      }

      const newPage: PDFPage = {
        pageIndex: -1,
        originalBase64: base64Image,
        width,
        height,
        rects: [],
        generatedImages: [],
        selectedImageId: null,
        isGenerating: false
      };

      setState(prev => {
        const newPages = [newPage, ...prev.pages];
        // Adjust active index to 0 (the new title page)
        return {
          ...prev,
          pages: newPages,
          activePageIndex: 0
        };
      });

      setIsTitlePageModalOpen(false);

    } catch (err) {
      console.error("Failed to create title page", err);
      alert("Failed to create title page. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };


  // --- Render ---

  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="text-brand-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">API Key Required</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            To use the advanced <strong>Nano Banana Pro</strong> model for image editing, you must select a Google Cloud Project with billing enabled.
          </p>

          <button
            onClick={handleSelectApiKey}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span>Select API Key</span>
          </button>

          <div className="mt-6 text-xs text-gray-500">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand-600">
              Learn more about billing
            </a>
          </div>
        </div>
      </div>
    );
  }
  // ========== RENDER ==========

  // Show login panel if authentication is required and user is not logged in
  if (!isLoggedIn) {
    return <LoginPanel onLogin={handleLogin} error={loginError} />;
  }

  const activePage = state.pages[state.activePageIndex];

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      <TopBar
        fileName={state.pdfName}
        onFileUpload={handleFileUpload}
        onExport={handleExport}
        onModifyPage={handleModifyPage}
        onSaveWorkspace={handleSaveWorkspace}
        onReset={handleReset}
        isProcessing={isProcessing}
        isWatermarkMode={isWatermarkMode}
        onToggleWatermarkMode={() => setIsWatermarkMode(!isWatermarkMode)}
        onOpenTitlePageModal={() => setIsTitlePageModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {state.pages.length > 0 ? (
          <>
            <Sidebar
              pages={state.pages}
              activePageIndex={state.activePageIndex}
              onSelectPage={(idx) => setState(prev => ({ ...prev, activePageIndex: idx }))}
              onReorderPages={handleReorderPages}
              onAddPage={handleAddPage}
              onCopyPage={handleCopyPage}
              onDeletePage={handleDeletePage}
            />

            <main className="flex-1 relative flex flex-col">
              {activePage && activePage.isGenerating && (
                <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-brand-900 font-medium">Generating new version with Nano Banana Pro...</p>
                </div>
              )}

              <div className="flex-1 relative overflow-hidden">
                <CanvasEditor
                  key={state.activePageIndex} // Force reset on page change
                  page={activePage}
                  currentImage={activePage.selectedImageId ? activePage.generatedImages.find(g => g.id === activePage.selectedImageId)?.base64 || activePage.originalBase64 : activePage.originalBase64}
                  rects={activePage.rects}
                  onAddRect={addRect}
                  onRemoveRect={removeRect}
                  onUpdateRectPrompt={updateRectPrompt}
                  onUpdateRectImage={updateRectImage}
                  readOnly={!!activePage.selectedImageId}
                  isWatermarkMode={isWatermarkMode}
                />
              </div>

              <HistorySelector
                originalImage={activePage.originalBase64}
                generatedImages={activePage.generatedImages}
                selectedId={activePage.selectedImageId}
                onSelect={selectImageVersion}
                onDelete={setPendingDeletionId}
              />
            </main>
          </>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div
              className={`bg-white p-12 rounded-2xl shadow-sm border-2 transition-all flex flex-col items-center text-center max-w-md mx-auto w-full ${isDragging
                ? 'border-brand-500 bg-brand-50 scale-105'
                : 'border-gray-100 hover:border-brand-200'
                }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? 'bg-brand-100 text-brand-600' : 'bg-brand-50 text-brand-500'
                }`}>
                <UploadCloud size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isDragging ? 'Drop PDF or .nmw here' : 'Start with PDF or Workspace'}
              </h2>
              <p className="text-gray-500 mb-6">
                {isDragging ? 'Release to upload' : 'Upload a PDF to edit, or a .nmw workspace file to resume your project.'}
              </p>
              <button
                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                className={`bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isDragging ? 'pointer-events-none opacity-50' : ''
                  }`}
              >
                Select PDF / Workspace
              </button>
              {!isDragging && <p className="mt-4 text-xs text-gray-400">or drag and drop here</p>}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Watermark */}
      {pendingWatermarkRect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">一括削除の確認</h3>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              選択した領域を、<strong>全ページから削除</strong>して周囲の色で塗りつぶしますか？
              <br />
              <span className="text-xs text-gray-400 mt-1 block">※この操作は新しいバージョンとして保存されます。</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingWatermarkRect(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeWatermarkRemoval}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-all hover:shadow-lg"
              >
                削除して実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Deletion (History) */}
      {pendingDeletionId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">画像の削除</h3>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              この生成バージョンを削除してもよろしいですか？
              <br />
              <span className="text-xs text-gray-400 mt-1 block">※この操作は元に戻せません。</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingDeletionId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeDeletion}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-all hover:shadow-lg"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Page Deletion */}
      {pendingPageDeletionIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 transform scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full text-red-600">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">ページの削除</h3>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              <strong>Page {pendingPageDeletionIndex + 1}</strong> を削除してもよろしいですか？
              <br />
              <span className="text-xs text-gray-400 mt-1 block">※この操作は元に戻せません。アノテーションや生成履歴も全て失われます。</span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingPageDeletionIndex(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executePageDeletion}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-all hover:shadow-lg"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Page Modal */}
      <TitlePageModal
        isOpen={isTitlePageModalOpen}
        onClose={() => setIsTitlePageModalOpen(false)}
        onSubmit={handleCreateTitlePage}
        isGenerating={isProcessing}
        totalPages={state.pages.length}
      />

    </div>
  );
};

export default App;