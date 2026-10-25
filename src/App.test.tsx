import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the app title', () => {
    render(<App />);
    // The opening doors' plaque carries the same name once they are up: read the toolbar title.
    expect(document.querySelector('ion-title')).toHaveTextContent("Gú's Library");
  });
});
