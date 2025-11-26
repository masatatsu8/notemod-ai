import JSZip from 'jszip';
import { AppState } from '../types';

/**
 * Saves the current application state as a compressed .nmw (NoteMod Workspace) file.
 */
export const saveWorkspace = async (state: AppState): Promise<void> => {
  const zip = new JSZip();
  
  // Serialize the entire state to a JSON string
  // Note: AppState includes base64 strings for images. 
  // For a production app with huge PDFs, we might want to separate assets,
  // but for a single-file archive solution, embedding everything in JSON inside ZIP is robust.
  const stateJson = JSON.stringify(state);
  
  zip.file("workspace.json", stateJson);

  // Generate the ZIP blob
  const content = await zip.generateAsync({ type: "blob" });

  // Trigger download
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  
  // Use original filename base + .nmw, or default
  const baseName = state.pdfName ? state.pdfName.replace(/\.pdf$/i, '') : 'project';
  a.download = `${baseName}.nmw`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Loads an application state from a .nmw file.
 */
export const loadWorkspace = async (file: File): Promise<AppState> => {
  const zip = new JSZip();
  
  try {
    const loadedZip = await zip.loadAsync(file);
    const stateFile = loadedZip.file("workspace.json");
    
    if (!stateFile) {
      throw new Error("Invalid NoteMod Workspace file: Missing workspace.json");
    }

    const stateJson = await stateFile.async("text");
    const state = JSON.parse(stateJson) as AppState;

    // Basic validation
    if (!state.pages || !Array.isArray(state.pages)) {
        throw new Error("Invalid workspace data format");
    }

    return state;
  } catch (err) {
    console.error("Failed to load workspace:", err);
    throw new Error("Failed to load workspace file. Please ensure it is a valid .nmw file.");
  }
};