import { render, screen } from '@testing-library/react';
import { SystemConfigurationForm } from '@/components/SystemConfigurationForm';
import { updateSystemSetting } from '@/app/actions/settings';

// Mock the server action
jest.mock('@/app/actions/settings', () => ({
  updateSystemSetting: jest.fn(),
}));

describe('SystemConfigurationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial provider', () => {
    render(<SystemConfigurationForm initialProvider="openai" />);

    expect(screen.getByText('System Configuration')).toBeInTheDocument();

    const select = screen.getByLabelText('Active LLM Provider');
    expect(select).toHaveValue('openai');
  });
});
