import { render, screen } from '@testing-library/react';
import { CoachingPlanCard } from '@/components/CoachingPlanCard';

describe('CoachingPlanCard', () => {
  it('renders nothing when cohorts is empty or null', () => {
    const { container } = render(<CoachingPlanCard cohorts={[]} />);
    expect(container).toBeEmptyDOMElement();

    // @ts-ignore
    const { container: container2 } = render(<CoachingPlanCard cohorts={null} />);
    expect(container2).toBeEmptyDOMElement();
  });

  it('renders cohort details', () => {
    const mockCohorts = [
      {
        name: 'Over-prompters',
        description: 'Users who prompt too frequently',
        coaching_plan: 'Try to batch your requests.'
      },
      {
        name: 'Advanced Users',
        description: null,
        coaching_plan: 'Keep up the good work.'
      }
    ];

    render(<CoachingPlanCard cohorts={mockCohorts} />);

    expect(screen.getByText('Your Coaching Plan')).toBeInTheDocument();
    expect(screen.getByText('Over-prompters')).toBeInTheDocument();
    expect(screen.getByText('Users who prompt too frequently')).toBeInTheDocument();
    expect(screen.getByText('Try to batch your requests.')).toBeInTheDocument();

    expect(screen.getByText('Advanced Users')).toBeInTheDocument();
    expect(screen.getByText('Keep up the good work.')).toBeInTheDocument();
  });
});
