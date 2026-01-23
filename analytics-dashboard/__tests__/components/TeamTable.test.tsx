import { render, screen } from '@testing-library/react';
import { TeamTable, TeamMember } from '@/components/TeamTable';

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
          { name: 'Over-prompters', coaching_plan: 'Focus on quality.' },
          { name: 'Night Owls', coaching_plan: 'Sleep more.' }
        ]
      }
    ];

    render(<TeamTable members={mockMembers} />);

    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Over-prompters')).toBeInTheDocument();
    expect(screen.getByText('Night Owls')).toBeInTheDocument();
  });
});
