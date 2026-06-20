import { Saf } from '../plugins/saf';
import { base64ToBytes } from './bytes';

// Đọc một file (PDF) trong kho qua SAF content-URI -> bytes cho pdf.js.
export async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const { data } = await Saf.readFileBase64({ uri });
  return base64ToBytes(data);
}
