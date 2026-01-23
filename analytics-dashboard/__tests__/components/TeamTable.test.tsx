import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamTable, TeamMember } from '@/components/TeamTable';
import { updateCohort } from '@/app/actions/cohorts';

// Mock the server action
jest.mock('@/app/actions/cohorts', () => ({
  updateCohort: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

describe('TeamTable', () => {
  it('renders "No team members found" when members list is empty', () => {
    render(<TeamTable members={[]} />);
    expect(screen.getByText('No team members found.')).toBeInTheDocument();
  });

  it('renders a list of team members with scores', () => {
    const mockMembers: TeamMember[] = [
      {
        id: '1',
        email: 'alice@example.com',
        name: 'Alice',
        department: 'Engineering',
        role: 'developer',
        created_at: '2024-01-01',
        last_active: '2024-01-20',
        latest_score: {
          id: 's1',
          user_id: 'alice@example.com',
          week_start_date: '2024-01-15',
          overall_score: 85,
          effectiveness_score: 80,
          efficiency_score: 90,
          best_practices_score: 85,
          insights: {},
          suggestions: {},
          created_at: '2024-01-21'
        }
      },
      {
        id: '2',
        email: 'bob@example.com',
        name: 'Bob',
        department: 'Engineering',
        role: 'developer',
        created_at: '2024-01-01',
        last_active: '2024-01-19',
        latest_score: null // No score
      }
    ];

    render(<TeamTable members={mockMembers} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // Score
    expect(screen.getByText('90')).toBeInTheDocument(); // Efficiency

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument(); // No score
  });

  it('renders cohorts for team members', () => {
    const mockMembers: TeamMember[] = [
      {
        id: '3',
        email: 'charlie@example.com',
        name: 'Charlie',
        department: 'Product',
        role: 'developer',
        created_at: '2024-01-01',
        last_active: '2024-01-20',
        cohorts: [
          {
            id: 'c1',
            name: 'Over-prompters',
            coaching_plan: 'Focus on quality.',
            description: 'Users who prompt too much.',
            criteria: { prompts: '> 50' }
          },
          {
            id: 'c2',
            name: 'Night Owls',
            coaching_plan: 'Sleep more.',
            description: 'Users active at night.',
            criteria: { time: 'night' }
          }
        ]
      }
    ];

    render(<TeamTable members={mockMembers} />);

    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Over-prompters')).toBeInTheDocument();
    expect(screen.getByText('Night Owls')).toBeInTheDocument();
  });

  it('opens modal with detailed info when cohort is clicked', () => {
    const mockMembers: TeamMember[] = [
      {
        id: '4',
        email: 'dave@example.com',
        name: 'Dave',
        department: 'Engineering',
        role: 'developer',
        created_at: '2024-01-01',
        last_active: '2024-01-20',
        cohorts: [
          {
            id: 'c3',
            name: 'Test Cohort',
            coaching_plan: 'Test Plan',
            description: 'Test Description',
            criteria: { foo: 'bar' }
          }
        ]
      }
    ];

    render(<TeamTable members={mockMembers} />);

    // Click the cohort badge
    fireEvent.click(screen.getByText('Test Cohort'));

    // Check if modal content is visible
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Plan')).toBeInTheDocument();
    // Use a regex or loose match for JSON content
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'pre' && content.includes('"foo": "bar"');
    })).toBeInTheDocument();
  });

  it('allows editing a cohort', async () => {
    const mockMembers: TeamMember[] = [
      {
        id: '5',
        email: 'eve@example.com',
        name: 'Eve',
        department: 'Engineering',
        role: 'developer',
        created_at: '2024-01-01',
        last_active: '2024-01-20',
        cohorts: [
          {
            id: 'c4',
            name: 'Editable Cohort',
            coaching_plan: 'Old Plan',
            description: 'Old Description',
            criteria: {}
          }
        ]
      }
    ];

    render(<TeamTable members={mockMembers} />);

    // Open modal
    fireEvent.click(screen.getByText('Editable Cohort'));

    // Click Edit
    fireEvent.click(screen.getByText('Edit'));

    // Change inputs
    const nameInput = screen.getByLabelText('Name');
    const descInput = screen.getByLabelText('Description');
    const planInput = screen.getByLabelText('Coaching Plan');

    fireEvent.change(nameInput, { target: { value: 'Updated Cohort' } });
    fireEvent.change(descInput, { target: { value: 'Updated Description' } });
    fireEvent.change(planInput, { target: { value: 'Updated Plan' } });

    // Click Save
    fireEvent.click(screen.getByText('Save'));

    // Verify mock call
    await waitFor(() => {
        expect(updateCohort).toHaveBeenCalledWith('c4', {
            name: 'Updated Cohort',
            description: 'Updated Description',
            coaching_plan: 'Updated Plan'
        });
    });

    // Verify UI updated
    expect(screen.getByText('Updated Cohort')).toBeInTheDocument();
    expect(screen.getByText('Updated Description')).toBeInTheDocument();
    expect(screen.getByText('Updated Plan')).toBeInTheDocument();
  });
});
