/**
 * FileUpload Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  test('renders upload text', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('Upload Your Manuscript')).toBeInTheDocument();
  });

  test('renders supported formats text', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('Microsoft Word (.doc, .docx) • Max 50MB')).toBeInTheDocument();
  });

  test('renders drag and drop instruction', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('Drag and drop or click to browse')).toBeInTheDocument();
  });

  test('has file input with correct accept attribute', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.doc,.docx');
  });

  test('calls onFileSelect when file is selected', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload');
    const testFile = new File(['test content'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect).toHaveBeenCalledWith(testFile);
  });

  test('does not call onFileSelect when no file is selected', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload');
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});
