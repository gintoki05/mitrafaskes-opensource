const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export function apiUrl(path: string): string {
  if (!configuredApiUrl) {
    throw new Error(
      'NEXT_PUBLIC_API_URL belum dikonfigurasi. Atur URL API pada environment aplikasi web.',
    );
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${configuredApiUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export function resolveApiInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string' && input.startsWith('/')) {
    return apiUrl(input);
  }
  return input;
}
