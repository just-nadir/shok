import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating from '../components/StarRating';
import CategoryRating from '../components/CategoryRating';
import RatingForm from './RatingForm';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ qrCode: 'test-qr' }),
    useSearchParams: () => [new URLSearchParams('phone=%2B998901234567'), vi.fn()],
    useNavigate: () => mockNavigate,
  };
});

// Mock api module
vi.mock('../services/api', () => ({
  getDriverByQrCode: vi.fn(),
  submitRating: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

import * as api from '../services/api';

const mockDriver = {
  id: '1',
  fullName: 'Ali Valiyev',
  carNumber: '01A123BC',
  qrCode: 'test-qr',
  isBlocked: false,
};

// ─── StarRating tests ────────────────────────────────────────────────────────

describe('StarRating', () => {
  it('renders 5 stars', () => {
    render(<StarRating value={0} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('calls onChange with correct value when a star is clicked', async () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[2]); // 3rd star
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('highlights stars up to selected value (text-yellow-400) and rest are gray (text-gray-300)', () => {
    render(<StarRating value={3} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // Stars 1-3 should have yellow span, stars 4-5 should have gray span
    for (let i = 0; i < 5; i++) {
      const span = buttons[i].querySelector('span');
      if (i < 3) {
        expect(span).toHaveClass('text-yellow-400');
      } else {
        expect(span).toHaveClass('text-gray-300');
      }
    }
  });

  it('hover highlights stars up to hovered position', async () => {
    render(<StarRating value={0} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.mouseEnter(buttons[1]); // hover over 2nd star
    // Stars 1-2 should be yellow, 3-5 gray
    for (let i = 0; i < 5; i++) {
      const span = buttons[i].querySelector('span');
      if (i < 2) {
        expect(span).toHaveClass('text-yellow-400');
      } else {
        expect(span).toHaveClass('text-gray-300');
      }
    }
  });
});

// ─── CategoryRating tests ────────────────────────────────────────────────────

describe('CategoryRating', () => {
  it('renders label and 3 buttons (Yaxshi, O\'rtacha, Yomon)', () => {
    render(<CategoryRating label="Tozalik" value={undefined} onChange={vi.fn()} />);
    expect(screen.getByText('Tozalik')).toBeInTheDocument();
    expect(screen.getByText('Yaxshi')).toBeInTheDocument();
    expect(screen.getByText("O'rtacha")).toBeInTheDocument();
    expect(screen.getByText('Yomon')).toBeInTheDocument();
  });

  it('calls onChange with correct value when a button is clicked', async () => {
    const onChange = vi.fn();
    render(<CategoryRating label="Tozalik" value={undefined} onChange={onChange} />);
    await userEvent.click(screen.getByText('Yaxshi'));
    expect(onChange).toHaveBeenCalledWith('good');
    await userEvent.click(screen.getByText("O'rtacha"));
    expect(onChange).toHaveBeenCalledWith('average');
    await userEvent.click(screen.getByText('Yomon'));
    expect(onChange).toHaveBeenCalledWith('bad');
  });

  it('selected button has active class applied', () => {
    render(<CategoryRating label="Tozalik" value="good" onChange={vi.fn()} />);
    const yaxshiBtn = screen.getByText('Yaxshi');
    expect(yaxshiBtn).toHaveClass('bg-yellow-400');
  });
});

// ─── RatingForm page tests ───────────────────────────────────────────────────

describe('RatingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDriverByQrCode).mockResolvedValue(mockDriver);
    vi.mocked(api.submitRating).mockResolvedValue({ message: 'ok' });
  });

  it('shows "Umumiy bahoni tanlang" validation error when submitting without overall rating', async () => {
    render(<RatingForm />);
    await waitFor(() => expect(screen.getByText('Ali Valiyev')).toBeInTheDocument());

    const submitBtn = screen.getByRole('button', { name: /baholash/i });
    await userEvent.click(submitBtn);

    expect(screen.getByText('Umumiy bahoni tanlang')).toBeInTheDocument();
  });

  it('comment textarea enforces 500 char limit', async () => {
    render(<RatingForm />);
    await waitFor(() => expect(screen.getByText('Ali Valiyev')).toBeInTheDocument());

    const textarea = screen.getByPlaceholderText('Fikr-mulohazangizni yozing...');
    const longText = 'a'.repeat(600);
    await userEvent.type(textarea, longText);

    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(500);
  });

  it('shows remaining character count (0/500 initially, 5/500 after typing 5 chars)', async () => {
    render(<RatingForm />);
    await waitFor(() => expect(screen.getByText('Ali Valiyev')).toBeInTheDocument());

    expect(screen.getByText('0/500')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Fikr-mulohazangizni yozing...');
    await userEvent.type(textarea, 'hello');

    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('shows driver info after loading', async () => {
    render(<RatingForm />);
    await waitFor(() => {
      expect(screen.getByText('Ali Valiyev')).toBeInTheDocument();
      expect(screen.getByText('01A123BC')).toBeInTheDocument();
    });
  });

  it('shows success message after successful submit', async () => {
    render(<RatingForm />);
    await waitFor(() => expect(screen.getByText('Ali Valiyev')).toBeInTheDocument());

    // Select overall rating (click 4th star)
    const starButtons = screen.getAllByRole('button', { name: /yulduz/i });
    await userEvent.click(starButtons[3]); // 4 stars

    const submitBtn = screen.getByRole('button', { name: /baholash/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Baholingiz qabul qilindi. Rahmat!')).toBeInTheDocument();
    });
  });
});
