import { describe, it, expect } from 'vitest';
import { withLeftoverNote } from './createDirError';

describe('withLeftoverNote', () => {
  it('keeps the text when the name was only taken', () => {
    expect(withLeftoverNote('Đã tồn tại', 'exists')).toBe('Đã tồn tại');
  });

  // SafNames.takenMessage (SafNamesTest pins the same string): the provider's "Slide (1)" could not
  // be removed, so it sits empty in the synced kho until someone deletes it.
  it('names the empty folder the app could not remove', () => {
    expect(withLeftoverNote('Đã tồn tại', "exists; could not remove the empty copy 'Slide (1)'"))
      .toBe('Đã tồn tại. Còn sót một thư mục trống “Slide (1)”, xoá giúp nha.');
  });

  it('keeps the text for any other message', () => {
    expect(withLeftoverNote('Đã tồn tại', 'createDir failed: boom')).toBe('Đã tồn tại');
  });
});
