import React from 'react';
import { render } from '@testing-library/react';
import { notFound } from 'next/navigation';
import MockDashboardPage from '@/app/mock-dashboard/page';
import MockTeamDashboardPage from '@/app/mock-team-dashboard/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

// Mock child components to avoid rendering deep trees
jest.mock('@/components/ScoreCard', () => ({ ScoreCard: () => <div>ScoreCard</div> }));
jest.mock('@/components/MetricsChart', () => ({ MetricsChart: () => <div>MetricsChart</div> }));
jest.mock('@/components/SuggestionsList', () => ({ SuggestionsList: () => <div>SuggestionsList</div> }));
jest.mock('@/components/CoachingPlanCard', () => ({ CoachingPlanCard: () => <div>CoachingPlanCard</div> }));
jest.mock('@/components/TeamTable', () => ({ TeamTable: () => <div>TeamTable</div> }));

describe('Mock Routes Guard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (notFound as unknown as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('MockDashboardPage calls notFound when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    render(<MockDashboardPage />);
    expect(notFound).toHaveBeenCalled();
  });

  it('MockDashboardPage does NOT call notFound when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    render(<MockDashboardPage />);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('MockTeamDashboardPage calls notFound when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    render(<MockTeamDashboardPage />);
    expect(notFound).toHaveBeenCalled();
  });

  it('MockTeamDashboardPage does NOT call notFound when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    render(<MockTeamDashboardPage />);
    expect(notFound).not.toHaveBeenCalled();
  });
});
