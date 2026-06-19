import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText("Gú's Library")).toBeInTheDocument();
  });
});
