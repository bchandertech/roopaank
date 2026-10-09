import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('calls onClick when the user clicks it', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Add to Cart</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} disabled>
        Add to Cart
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
