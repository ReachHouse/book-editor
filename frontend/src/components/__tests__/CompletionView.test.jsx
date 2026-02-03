/**
 * CompletionView Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CompletionView from '../CompletionView';

describe('CompletionView', () => {
  const mockOnDownload = jest.fn();
  const mockOnEditAnother = jest.fn();

  beforeEach(() => {
    mockOnDownload.mockClear();
    mockOnEditAnother.mockClear();
  });

  test('renders completion message', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    expect(screen.getByText('Editing Complete!')).toBeInTheDocument();
  });

  test('renders auto-save information', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    expect(screen.getByText(/Auto-Saved/)).toBeInTheDocument();
  });

  test('renders track changes information', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    expect(screen.getByText(/Track Changes/)).toBeInTheDocument();
  });

  test('renders download button with correct text when not downloading', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    expect(screen.getByText('Download Word Document')).toBeInTheDocument();
  });

  test('renders loading state when downloading', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={true}
      />
    );

    expect(screen.getByText('Generating Word Document...')).toBeInTheDocument();
  });

  test('calls onDownload when download button is clicked', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    const downloadButton = screen.getByText('Download Word Document');
    fireEvent.click(downloadButton);

    expect(mockOnDownload).toHaveBeenCalledTimes(1);
  });

  test('download button is disabled when downloading', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={true}
      />
    );

    const downloadButton = screen.getByText('Generating Word Document...').closest('button');
    expect(downloadButton).toBeDisabled();
  });

  test('calls onEditAnother when Edit Another Book button is clicked', () => {
    render(
      <CompletionView
        onDownload={mockOnDownload}
        onEditAnother={mockOnEditAnother}
        isDownloading={false}
      />
    );

    const editAnotherButton = screen.getByText('Edit Another Book');
    fireEvent.click(editAnotherButton);

    expect(mockOnEditAnother).toHaveBeenCalledTimes(1);
  });
});
