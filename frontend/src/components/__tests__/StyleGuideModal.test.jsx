/**
 * StyleGuideModal Component Tests
 *
 * Tests for both view mode (read-only) and edit mode (editable textarea).
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StyleGuideModal from '../StyleGuideModal';

// Mock the constants module
jest.mock('../../constants', () => ({
  FULL_STYLE_GUIDE_DOCUMENT: 'Test style guide content here.',
  MAX_CUSTOM_STYLE_GUIDE_LENGTH: 50000
}));

describe('StyleGuideModal', () => {
  const mockOnClose = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnChange.mockClear();
    mockOnSave.mockClear();
    mockOnReset.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // COMMON TESTS
  // =========================================================================

  test('returns null when not open', () => {
    const { container } = render(
      <StyleGuideModal isOpen={false} onClose={mockOnClose} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('closes on Escape key press', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    act(() => { jest.advanceTimersByTime(200); });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when X button is clicked after exit animation', () => {
    render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close style guide');
    fireEvent.click(closeButton);

    // onClose is called after 200ms exit animation
    expect(mockOnClose).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(200); });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // VIEW MODE TESTS (default)
  // =========================================================================

  describe('view mode', () => {
    test('renders with correct title', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Reach House Style Guide')).toBeInTheDocument();
    });

    test('displays important notice', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/All edits follow the Reach House Style Guide/)).toBeInTheDocument();
    });

    test('displays style guide content in pre element', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test style guide content here.')).toBeInTheDocument();
    });

    test('shows Close button in footer', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      expect(closeButton).toBeInTheDocument();
    });

    test('calls onClose when footer Close button is clicked after exit animation', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      // onClose is called after 200ms exit animation
      expect(mockOnClose).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(200); });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('does not show textarea in view mode', () => {
      render(<StyleGuideModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // EDIT MODE TESTS
  // =========================================================================

  describe('edit mode', () => {
    test('renders with Edit Style Guide title', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Custom content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText('Edit Style Guide')).toBeInTheDocument();
    });

    test('displays edit mode notice', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Custom content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/Changes to this guide will affect how the AI edits/)).toBeInTheDocument();
    });

    test('shows textarea with current value', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Custom style guide content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'Style guide content' });
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('Custom style guide content');
    });

    test('shows character count', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Hello"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/5 \/ 50,000 characters/)).toBeInTheDocument();
    });

    test('calls onChange when textarea is edited', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Initial"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'Style guide content' });
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      expect(mockOnChange).toHaveBeenCalledWith('Updated content');
    });

    test('shows Save and Reset buttons', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
    });

    test('calls onSave and closes when Save is clicked', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      // Modal closes after save
      act(() => { jest.advanceTimersByTime(200); });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('calls onReset when Reset to Default is clicked', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value="Custom content"
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
      fireEvent.click(resetButton);

      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });

    test('shows exceeds limit warning when over character limit', () => {
      const longContent = 'x'.repeat(50001);
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value={longContent}
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      expect(screen.getByText(/exceeds limit/i)).toBeInTheDocument();
    });

    test('Save button is disabled when over character limit', () => {
      const longContent = 'x'.repeat(50001);
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value={longContent}
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save/i });
      expect(saveButton).toBeDisabled();
    });

    test('does not call onSave when Save clicked while over limit', () => {
      const longContent = 'x'.repeat(50001);
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value={longContent}
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('uses default style guide content when value is null', () => {
      render(
        <StyleGuideModal
          isOpen={true}
          onClose={mockOnClose}
          mode="edit"
          value={null}
          onChange={mockOnChange}
          onSave={mockOnSave}
          onReset={mockOnReset}
        />
      );

      const textarea = screen.getByRole('textbox', { name: 'Style guide content' });
      expect(textarea.value).toBe('Test style guide content here.');
    });
  });
});
