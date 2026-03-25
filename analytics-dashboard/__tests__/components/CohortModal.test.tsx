import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CohortModal, Cohort } from '@/components/CohortModal';
import { createCohort, updateCohort, deleteCohort, addCohortMember, removeCohortMember, getCohortMembers, getAvailableUsers } from '@/app/actions/cohorts';
import { Database } from '@/types/database';

type User = Database["public"]["Tables"]["users"]["Row"];

// Mock the server action
jest.mock('@/app/actions/cohorts', () => ({
  updateCohort: jest.fn().mockResolvedValue({ success: true }),
  createCohort: jest.fn().mockResolvedValue({ success: true }),
  deleteCohort: jest.fn().mockResolvedValue({ success: true }),
  addCohortMember: jest.fn().mockResolvedValue({ success: true }),
  removeCohortMember: jest.fn().mockResolvedValue({ success: true }),
  getCohortMembers: jest.fn(),
  getAvailableUsers: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockCohort: Cohort = {
  id: 'c1',
  name: 'Test Cohort',
  description: 'Test Description',
  coaching_plan: 'Test Plan',
  criteria: {}
};

const mockUser1: User = {
  id: 'u1',
  email: 'u1@example.com',
  name: 'User One',
  role: 'developer',
  department: 'Eng',
  created_at: '',
  last_active: ''
};

const mockUser2: User = {
  id: 'u2',
  email: 'u2@example.com',
  name: 'User Two',
  role: 'developer',
  department: 'Eng',
  created_at: '',
  last_active: ''
};

describe('CohortModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCohortMembers as jest.Mock).mockResolvedValue([]);
    (getAvailableUsers as jest.Mock).mockResolvedValue([]);
  });

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

  it('renders edit form correctly', async () => {
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
    expect(screen.getByText('Cohort Members')).toBeInTheDocument();

    // Should fetch members
    await waitFor(() => {
        expect(getCohortMembers).toHaveBeenCalledWith('c1');
        expect(getAvailableUsers).toHaveBeenCalledWith('c1');
        expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });

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

    await waitFor(() => {
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });

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

  it('displays members and available users', async () => {
    (getCohortMembers as jest.Mock).mockResolvedValue([mockUser1]);
    (getAvailableUsers as jest.Mock).mockResolvedValue([mockUser2]);

    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={mockCohort}
        initialMode="edit"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('Select user to add...')).toBeInTheDocument();
    });

    // Check if dropdown has User Two
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('adds a member', async () => {
    (getCohortMembers as jest.Mock).mockResolvedValue([]);
    (getAvailableUsers as jest.Mock).mockResolvedValue([mockUser2]);

    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={mockCohort}
        initialMode="edit"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
        expect(getAvailableUsers).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u2' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(addCohortMember).toHaveBeenCalledWith('c1', 'u2');
    });
  });

  it('removes a member', async () => {
    window.confirm = jest.fn(() => true);
    (getCohortMembers as jest.Mock).mockResolvedValue([mockUser1]);
    (getAvailableUsers as jest.Mock).mockResolvedValue([]);

    render(
      <CohortModal
        isOpen={true}
        onClose={jest.fn()}
        cohort={mockCohort}
        initialMode="edit"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading members...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
        expect(screen.getByText('User One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(removeCohortMember).toHaveBeenCalledWith('c1', 'u1');
    });
  });
});
