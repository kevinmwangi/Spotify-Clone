import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the SpotifyService
jest.mock('./services/SpotifyService', () => ({
  spotifyService: {
    user$: { subscribe: jest.fn() },
    discoverWeekly$: { subscribe: jest.fn() },
    playlists$: { subscribe: jest.fn() },
    errors$: { subscribe: jest.fn() },
  },
}));

test('renders Player component', () => {
  render(<App />);
  const playerElement = screen.getByTestId('player-component');
  expect(playerElement).toBeInTheDocument();
});
