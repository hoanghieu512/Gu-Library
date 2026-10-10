import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route } from 'react-router-dom';
import ContinueReadingCard from './ContinueReadingCard';
import { encodeUriParam } from '../storage/uriParam';

describe('ContinueReadingCard — a labelled button (v1.41.1)', () => {
  it('names the document and the page, and opens it in the Viewer', () => {
    const item = {
      uri: 'content://kho/Hop_dong_Chuong_1_2_4.pdf', path: 'Kimh doanh/Hop_dong_Chuong_1_2_4.pdf',
      name: 'Hop_dong_Chuong_1_2_4', monName: 'Kimh doanh', page: 24, total: 38, lastReadAt: 1,
    };
    let path = '';
    render(
      <MemoryRouter initialEntries={['/home']}>
        <ContinueReadingCard item={item} />
        <Route path="*" render={({ location }) => { path = location.pathname; return null; }} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đọc tiếp Hop_dong_Chuong_1_2_4, trang 24 / 38' }));
    expect(path).toBe(`/viewer/${encodeUriParam(item.uri)}`);
  });
});
