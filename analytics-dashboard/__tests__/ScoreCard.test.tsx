import { render, screen } from '@testing-library/react'
import { ScoreCard } from '../src/components/ScoreCard'

describe('ScoreCard', () => {
  it('renders the score card with title and score', () => {
    render(
      <ScoreCard
        title="Test Score"
        score={85}
        maxScore={100}
        color="blue"
      />
    )

    expect(screen.getByText('Test Score')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })
})
