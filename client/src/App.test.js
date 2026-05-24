import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app navbar', () => {
  render(<App />);
  const brandElement = screen.getByText(/school portal/i);
  expect(brandElement).toBeInTheDocument();
});
