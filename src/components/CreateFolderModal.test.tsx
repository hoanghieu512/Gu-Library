import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import CreateFolderModal from './CreateFolderModal';

// IonModal does not run in jsdom: show its children while open.
vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  IonModal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));
// IonInput is a web component jsdom cannot type into: a plain input in its place.
vi.mock('./NameField', () => ({
  default: ({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string }) => (
    <>
      <input aria-label="Tên thư mục" value={value} onChange={(e) => onChange(e.target.value)} />
      <p>{error}</p>
    </>
  ),
}));

function createRejectedWith(message: string) {
  render(
    <CreateFolderModal
      isOpen title="Thư mục mới" noun="thư mục" withColor={false} existingNames={[]}
      onCreate={async () => { throw new Error(message); }} onClose={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('Tên thư mục'), { target: { value: 'slide' } });
  fireEvent.click(screen.getByText('Tạo'));
}

describe('CreateFolderModal: the plugin says the name is taken', () => {
  it('says so', async () => {
    createRejectedWith('exists');
    expect(await screen.findByText('Thư mục cùng tên gòi dợ iu')).toBeInTheDocument();
  });

  // Review of 18/10: the provider's empty "slide (1)" stayed in the synced kho and nobody was told.
  it('also names the empty copy the app could not remove', async () => {
    createRejectedWith("exists; could not remove the empty copy 'slide (1)'");
    expect(await screen.findByText('Thư mục cùng tên gòi dợ iu. Còn sót một thư mục trống “slide (1)”, xoá giúp nha.'))
      .toBeInTheDocument();
  });
});
