/**
 * DocumentAnalysis Component Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentAnalysis from '../DocumentAnalysis';

// Mock the AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isGuest: false,
    logout: jest.fn()
  })
}));

describe('DocumentAnalysis', () => {
  const mockAnalysis = {
    fileName: 'test-document.docx',
    fileSize: '1.25 MB',
    wordCount: '45,230',
    paragraphs: '342',
    language: 'English',
    estimatedTime: '15 - 20 minutes',
    estimatedChunks: 23
  };

  const mockOnStartEditing = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnStartEditing.mockClear();
    mockOnCancel.mockClear();
  });

  test('renders header text', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Document Analysis')).toBeInTheDocument();
  });

  test('displays file name', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('test-document.docx')).toBeInTheDocument();
  });

  test('displays file size', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('1.25 MB')).toBeInTheDocument();
  });

  test('displays word count', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('45,230')).toBeInTheDocument();
  });

  test('displays estimated chunks', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/23 sections/)).toBeInTheDocument();
  });

  test('calls onStartEditing when Start Editing button is clicked', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    const startButton = screen.getByText('Start Editing');
    fireEvent.click(startButton);

    expect(mockOnStartEditing).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when Cancel button is clicked', () => {
    render(
      <DocumentAnalysis
        analysis={mockAnalysis}
        onStartEditing={mockOnStartEditing}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
