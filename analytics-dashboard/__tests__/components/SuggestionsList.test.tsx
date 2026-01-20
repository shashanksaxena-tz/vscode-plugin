import { render, screen } from '@testing-library/react';
import { SuggestionsList } from '@/components/SuggestionsList';

describe('SuggestionsList', () => {
  it('renders "No suggestions yet" when the list is empty', () => {
    render(<SuggestionsList suggestions={[]} />);
    expect(screen.getByText(/No suggestions yet/i)).toBeInTheDocument();
  });

  it('renders a list of suggestions', () => {
    const suggestions = [
      'Use more descriptive variable names',
      'Add comments to complex logic',
    ];

    render(<SuggestionsList suggestions={suggestions} />);

    expect(screen.getByText('Use more descriptive variable names')).toBeInTheDocument();
    expect(screen.getByText('Add comments to complex logic')).toBeInTheDocument();

    // Check for numbering
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
