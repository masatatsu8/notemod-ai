import React, { useRef, useState } from 'react';
import { Upload, Download, Wand2, Loader2, FileUp, Eraser, Archive, Pencil, FilePlus, LogOut, ChevronDown } from 'lucide-react';
import { isAuthenticationRequired, clearAuth } from '../services/authService';
import { version } from '../package.json';

interface TopBarProps {
  fileName: string;
  onFileUpload: (file: File) => void;
  onExport: () => void;
  onModifyPage: () => void;
  onSaveWorkspace: () => void;
  isProcessing: boolean;
  isWatermarkMode: boolean;
  onToggleWatermarkMode: () => void;
  onReset: () => void;
  onOpenTitlePageModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  fileName,
  onFileUpload,
  onExport,
  onModifyPage,
  onSaveWorkspace,
  isProcessing,
  isWatermarkMode,
  onToggleWatermarkMode,
  onReset,
  onOpenTitlePageModal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20">
      <div className="relative flex items-center gap-3">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-3 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
        >
          <div className="bg-brand-500 p-2 rounded-lg text-white">
            <FileTextIcon />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg leading-tight">NoteMod AI <span className="text-xs font-normal text-gray-400">v{version}</span></h1>
            <p className="text-xs text-gray-500">{fileName || 'No file selected'}</p>
          </div>
          {isAuthenticationRequired() && (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && isAuthenticationRequired() && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut size={16} />
                <span>ログアウト</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,.nmw"
          className="hidden"
          onChange={handleFileChange}
        />

        {!fileName && (
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Load PDF / Workspace
            </button>
            <button
              onClick={onOpenTitlePageModal}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
              title="Create Title Page"
            >
              <FilePlus size={16} />
              Title Page
            </button>
          </div>
        )}

        {fileName && (
          <>
            {/* Mode Toggle Moved Here */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 mr-2">
              <button
                onClick={() => isWatermarkMode && onToggleWatermarkMode()}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${!isWatermarkMode ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                title="アノテーションモード（編集）"
              >
                <Pencil size={14} />
                <span>編集</span>
              </button>
              <button
                onClick={() => !isWatermarkMode && onToggleWatermarkMode()}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${isWatermarkMode ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                title="削除モード（透かし消去）"
              >
                <Eraser size={14} />
                <span>削除</span>
              </button>
            </div>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={onReset}
              disabled={isProcessing}
              className="px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium border border-transparent hover:border-red-100"
              title="Reset Project"
            >
              New
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium border border-transparent hover:border-gray-200"
              title="Load different file"
            >
              Load
            </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={onSaveWorkspace}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
              title="Save Project as .nmw"
            >
              <Archive size={16} />
              Save
            </button>

            <button
              onClick={onExport}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
              title="Export as PDF"
            >
              <Download size={16} />
              PDF
            </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={onModifyPage}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-white shadow-sm transition-all ${isProcessing
                ? 'bg-brand-400 cursor-not-allowed'
                : 'bg-brand-600 hover:bg-brand-700 hover:shadow-md'
                }`}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              <span className="font-medium">Modify with AI</span>
            </button>

            <div className="h-6 w-px bg-gray-300 mx-1"></div>

            <button
              onClick={onOpenTitlePageModal}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors text-sm font-medium"
              title="Create Title Page"
            >
              <FilePlus size={16} />
              Title Page
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
)