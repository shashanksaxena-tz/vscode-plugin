import { render, screen } from '@testing-library/react'
import { ScoreCard } from './ScoreCard'

describe('ScoreCard', () => {
  it('renders title and score', () => {
    render(<ScoreCard title="Test Score" score={75} maxScore={100} color="blue" />)

    expect(screen.getByText('Test Score')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })

  it('renders correctly with 0 score', () => {
    render(<ScoreCard title="Zero Score" score={0} maxScore={100} color="red" />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
