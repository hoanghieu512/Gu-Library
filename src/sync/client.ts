import { Syncthing } from '../plugins/syncthing';

const BASE = 'https://127.0.0.1:8384';

export async function stGet<T>(path: string, apiKey: string): Promise<T> {
  const { status, data } = await Syncthing.request({ url: BASE + path, apiKey });
  if (status !== 200) throw new Error(`Syncthing HTTP ${status}`);
  return JSON.parse(data) as T;
}

export { BASE as SYNCTHING_BASE };
