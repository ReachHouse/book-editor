/**
 * =============================================================================
 * COMPONENT BARREL EXPORT
 * =============================================================================
 *
 * This file centralizes all component exports for cleaner imports in App.jsx.
 * Instead of importing each component from its individual file, you can import
 * all of them from this single location.
 *
 * USAGE:
 * ------
 * // Instead of:
 * import Header from './components/Header';
 * import FileUpload from './components/FileUpload';
 *
 * // You can use:
 * import { Header, FileUpload } from './components';
 *
 * COMPONENT OVERVIEW:
 * -------------------
 * - Header: Application title, logo, and style guide button
 * - StyleGuideModal: Full-screen modal displaying the complete style guide
 * - FileUpload: Drag-and-drop area for uploading Word documents
 * - DocumentAnalysis: Shows document metadata before editing starts
 * - ProcessingView: Progress bar and logs during editing
 * - CompletionView: Success message and download button after editing
 * - SavedProjects: List of previously edited books (resume/download)
 * - ErrorDisplay: Error messages with optional debug log
 * - DebugLog: Timestamped log entries for debugging
 *
 * APPLICATION FLOW:
 * -----------------
 * 1. User sees Header + FileUpload (+ SavedProjects if any exist)
 * 2. After upload: DocumentAnalysis shown
 * 3. During editing: ProcessingView with progress
 * 4. After completion: CompletionView with download option
 * 5. Errors: ErrorDisplay shown at any point if something fails
 *
 * =============================================================================
 */

export { default as Header } from './Header';
export { default as StyleGuideModal } from './StyleGuideModal';
export { default as FileUpload } from './FileUpload';
export { default as DocumentAnalysis } from './DocumentAnalysis';
export { default as ProcessingView } from './ProcessingView';
export { default as CompletionView } from './CompletionView';
export { default as SavedProjects } from './SavedProjects';
export { default as ErrorDisplay } from './ErrorDisplay';
export { default as DebugLog } from './DebugLog';
export { ToastContainer } from './Toast';
