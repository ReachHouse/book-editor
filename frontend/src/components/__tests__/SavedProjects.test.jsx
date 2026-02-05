/**
 * SavedProjects Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SavedProjects from '../SavedProjects';

describe('SavedProjects', () => {
  const mockOnDownload = jest.fn();
  const mockOnResume = jest.fn();
  const mockOnDelete = jest.fn();

  const completedProject = {
    id: '1',
    fileName: 'completed-book.docx',
    timestamp: Date.now(),
    chunksCompleted: 10,
    totalChunks: 10,
    chunkSize: 2000,
    isComplete: true
  };

  const inProgressProject = {
    id: '2',
    fileName: 'in-progress-book.docx',
    timestamp: Date.now(),
    chunksCompleted: 5,
    totalChunks: 10,
    chunkSize: 2000,
    isComplete: false
  };

  beforeEach(() => {
    mockOnDownload.mockClear();
    mockOnResume.mockClear();
    mockOnDelete.mockClear();
  });

  test('returns null when no projects exist', () => {
    const { container } = render(
      <SavedProjects
        projects={[]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders header when projects exist', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    expect(screen.getByText('Previously Edited Books')).toBeInTheDocument();
  });

  test('displays completed project filename', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    expect(screen.getByText('completed-book.docx')).toBeInTheDocument();
  });

  test('displays in-progress project with progress', () => {
    render(
      <SavedProjects
        projects={[inProgressProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText(/5\/10 sections/)).toBeInTheDocument();
  });

  test('shows download button for completed projects', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    const downloadButton = screen.getByLabelText('Download Word document with Track Changes');
    expect(downloadButton).toBeInTheDocument();
  });

  test('calls onDownload with project when download button is clicked', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    const downloadButton = screen.getByLabelText('Download Word document with Track Changes');
    fireEvent.click(downloadButton);

    expect(mockOnDownload).toHaveBeenCalledWith(completedProject);
  });

  test('shows resume button for in-progress projects', () => {
    render(
      <SavedProjects
        projects={[inProgressProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    const resumeButton = screen.getByLabelText('Resume editing from where you left off');
    expect(resumeButton).toBeInTheDocument();
  });

  test('shows delete button for all projects', () => {
    render(
      <SavedProjects
        projects={[completedProject, inProgressProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    const deleteButtons = screen.getAllByLabelText('Delete from storage');
    expect(deleteButtons).toHaveLength(2);
  });

  test('calls onDelete after confirmation when delete button is clicked', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    // First click shows confirmation
    const deleteButton = screen.getByLabelText('Delete from storage');
    fireEvent.click(deleteButton);
    expect(mockOnDelete).not.toHaveBeenCalled();

    // Confirm delete
    const confirmButton = screen.getByLabelText('Confirm delete');
    fireEvent.click(confirmButton);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  test('cancels delete when cancel button is clicked', () => {
    render(
      <SavedProjects
        projects={[completedProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    // First click shows confirmation
    const deleteButton = screen.getByLabelText('Delete from storage');
    fireEvent.click(deleteButton);

    // Cancel delete
    const cancelButton = screen.getByLabelText('Cancel delete');
    fireEvent.click(cancelButton);

    // Should not have called onDelete
    expect(mockOnDelete).not.toHaveBeenCalled();

    // Delete button should be visible again
    expect(screen.getByLabelText('Delete from storage')).toBeInTheDocument();
  });

  test('calls onResume when resume button is clicked', () => {
    render(
      <SavedProjects
        projects={[inProgressProject]}
        onDownload={mockOnDownload}
        onResume={mockOnResume}
        onDelete={mockOnDelete}
        isDownloading={false}
      />
    );

    const resumeButton = screen.getByLabelText('Resume editing from where you left off');
    fireEvent.click(resumeButton);

    expect(mockOnResume).toHaveBeenCalledWith(inProgressProject);
  });
});
