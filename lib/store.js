import { get, list, put, del } from '@vercel/blob';

const ACCESS = 'private';

export async function readJson(pathname) {
  try {
    const result = await get(pathname, { access: ACCESS, useCache: false });
    if (!result) return null;
    return JSON.parse(await new Response(result.stream).text());
  } catch (error) {
    if (error?.statusCode === 404 || error?.status === 404) return null;
    throw error;
  }
}

export async function writeJson(pathname, value) {
  await put(pathname, JSON.stringify(value), {
    access: ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8'
  });
  return value;
}

export async function deleteObject(pathname) {
  try { await del(pathname); } catch (error) {
    if (error?.statusCode !== 404 && error?.status !== 404) throw error;
  }
}

export async function listJson(prefix) {
  const output = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor, mode: 'expanded' });
    for (const blob of page.blobs || []) {
      try {
        const value = await readJson(blob.pathname);
        if (value) output.push(value);
      } catch (error) {
        console.error('Blob read failed', blob.pathname, error);
      }
    }
    cursor = page.cursor || undefined;
  } while (cursor);
  return output;
}
