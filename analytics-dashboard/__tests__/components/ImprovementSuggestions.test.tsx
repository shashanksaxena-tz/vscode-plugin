import { render, screen } from '@testing-library/react';
import { SuggestionsList } from '@/components/SuggestionsList';

describe('SuggestionsList', () => {
  it('renders "No suggestions" message when list is empty', () => {
    render(<SuggestionsList suggestions={[]} />);
    const message = screen.getByText(/No suggestions yet/i);
    expect(message).toBeInTheDocument();
  });

  it('renders a list of suggestions', () => {
    const suggestions = ['Use more context', 'Decompose complex tasks'];
    render(<SuggestionsList suggestions={suggestions} />);

    expect(screen.getByText('Use more context')).toBeInTheDocument();
    expect(screen.getByText('Decompose complex tasks')).toBeInTheDocument();

    // Check for numbering
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
