import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CohortModal, Cohort } from '@/components/CohortModal';
import { createCohort, updateCohort, deleteCohort } from '@/app/actions/cohorts';

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

const mockCohort: Cohort = {
  id: 'c1',
  name: 'Test Cohort',
  description: 'Test Description',
  coaching_plan: 'Test Plan',
  criteria: {}
};

describe('CohortModal', () => {
  it('does not render when closed', () => {
    render(
      <CohortModal
        isOpen={false}
        onClose={jest.fn()}
        cohort={null}
        initialMode="create"
      />
    );
    expect(screen.queryByText('Test Cohort')).not.toBeInTheDocument();
  });

  it('renders create form correctly', () => {
    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={null}
        initialMode="create"
      />
    );
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls createCohort on save in create mode', async () => {
    const onClose = jest.fn();
    render(
      <CohortModal
        isOpen={true}
        onClose={onClose}
        cohort={null}
        initialMode="create"
      />
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New C' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(createCohort).toHaveBeenCalledWith(expect.objectContaining({ name: 'New C' }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders edit form correctly', () => {
    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={mockCohort}
        initialMode="edit"
      />
    );
    expect(screen.getByLabelText('Name')).toHaveValue('Test Cohort');
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls updateCohort on save in edit mode', async () => {
    const onClose = jest.fn();
    render(
      <CohortModal
        isOpen={true}
        onClose={onClose}
        cohort={mockCohort}
        initialMode="edit"
      />
    );

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated C' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(updateCohort).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Updated C' }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls deleteCohort on delete', async () => {
    window.confirm = jest.fn(() => true);
    const onClose = jest.fn();
    render(
      <CohortModal
        isOpen={true}
        onClose={onClose}
        cohort={mockCohort}
        initialMode="edit"
      />
    );

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(deleteCohort).toHaveBeenCalledWith('c1');
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('switches from view to edit mode', () => {
    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={mockCohort}
        initialMode="view"
      />
    );

    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByLabelText('Name')).toHaveValue('Test Cohort');
  });
});
