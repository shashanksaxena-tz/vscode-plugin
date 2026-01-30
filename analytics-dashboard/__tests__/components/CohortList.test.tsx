import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CohortList } from '@/components/CohortList';
import { Cohort } from '@/components/CohortModal';

// Mock the server action
jest.mock('@/app/actions/cohorts', () => ({
  updateCohort: jest.fn().mockResolvedValue({ success: true }),
  createCohort: jest.fn().mockResolvedValue({ success: true }),
  deleteCohort: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

const mockCohorts: Cohort[] = [
  {
    id: 'c1',
    name: 'Cohort 1',
    description: 'Desc 1',
    coaching_plan: 'Plan 1',
    criteria: {},
    member_count: 5
  },
  {
    id: 'c2',
    name: 'Cohort 2',
    description: 'Desc 2',
    coaching_plan: 'Plan 2',
    criteria: {},
    member_count: 0
  }
];

describe('CohortList', () => {
  it('renders a list of cohorts', () => {
    render(<CohortList cohorts={mockCohorts} />);
    expect(screen.getByText('Cohort 1')).toBeInTheDocument();
    expect(screen.getByText('Desc 1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Member count
    expect(screen.getByText('Cohort 2')).toBeInTheDocument();
  });

  it('renders "No cohorts found" when list is empty', () => {
    render(<CohortList cohorts={[]} />);
    expect(screen.getByText(/No cohorts found/i)).toBeInTheDocument();
  });

  it('opens modal to create cohort', () => {
    render(<CohortList cohorts={[]} />);
    fireEvent.click(screen.getByText('Create Cohort'));
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('opens modal to edit cohort', () => {
    render(<CohortList cohorts={mockCohorts} />);
    // Click edit on first row
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByLabelText('Name')).toHaveValue('Cohort 1');
  });

  it('opens modal to view cohort when name is clicked', () => {
    render(<CohortList cohorts={mockCohorts} />);
    fireEvent.click(screen.getByText('Cohort 1'));
    // Should be in view mode (text not input)
    // In view mode, CohortModal renders h3 with name (id=modal-title)
    // We can check for the heading or just the text
    expect(screen.getByRole('heading', { name: 'Cohort 1' })).toBeInTheDocument();

    // Check for modal-specific buttons to confirm modal is open
    // In View mode, we have "Close" and "Edit" buttons
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    // Use getAllByText for 'Edit' because it appears in the table rows too
    const editButtons = screen.getAllByText('Edit');
    // One for each row (2) + one in modal (1) = 3
    expect(editButtons).toHaveLength(3);
  });
});
