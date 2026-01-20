import { render, screen } from '@testing-library/react';
import { MetricsChart } from '@/components/MetricsChart';

// Recharts is tricky to test because it renders SVG and relies on container dimensions.
// We mostly want to ensure it renders without crashing and displays the data points if possible,
// or at least the chart container.

describe('MetricsChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 20 },
    { date: '2024-01-03', value: 15 },
  ];

  it('renders the chart container', () => {
    const { container } = render(
      <MetricsChart data={mockData} dataKey="value" xAxisKey="date" />
    );

    // Check if the recharts wrapper exists
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders without crashing with empty data', () => {
    const { container } = render(
      <MetricsChart data={[]} dataKey="value" xAxisKey="date" />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
