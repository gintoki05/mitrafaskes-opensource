import { SatusehatAuthService } from './satusehat-auth.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';

describe('SatusehatFhirClient', () => {
  let fetchMock: jest.Mock;
  let originalBaseUrl: string | undefined;
  let originalMaxPaginationPages: string | undefined;

  beforeEach(() => {
    originalBaseUrl = process.env.SATUSEHAT_FHIR_BASE_URL;
    originalMaxPaginationPages = process.env.SATUSEHAT_MAX_PAGINATION_PAGES;
    process.env.SATUSEHAT_FHIR_BASE_URL =
      'https://satusehat.example.test/fhir-r4/v1';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.SATUSEHAT_FHIR_BASE_URL;
    } else {
      process.env.SATUSEHAT_FHIR_BASE_URL = originalBaseUrl;
    }
    if (originalMaxPaginationPages === undefined) {
      delete process.env.SATUSEHAT_MAX_PAGINATION_PAGES;
    } else {
      process.env.SATUSEHAT_MAX_PAGINATION_PAGES = originalMaxPaginationPages;
    }
  });

  it('sends an Organization request with the cached OAuth token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          resourceType: 'Organization',
          id: 'org-external-1',
        }),
      ),
    });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);
    const payload = {
      resourceType: 'Organization',
      name: 'Klinik Mitra Sehat',
    };

    await expect(client.createOrganization(payload)).resolves.toEqual(
      expect.objectContaining({ id: 'org-external-1' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://satusehat.example.test/fhir-r4/v1/Organization'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
    );
  });

  it('sends Location create and update requests to the FHIR endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Location', id: 'location-1' }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Location', id: 'location-1' }),
        ),
      });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);
    const payload = { resourceType: 'Location', name: 'Ruang 1' };

    await client.createLocation(payload);
    await client.updateLocation('location-1', payload);

    const requestCalls = fetchMock.mock.calls as unknown[][];
    expect(requestCalls[0]?.[0]).toEqual(
      new URL('https://satusehat.example.test/fhir-r4/v1/Location'),
    );
    expect(requestCalls[0]?.[1]).toEqual(
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
    expect(requestCalls[1]?.[0]).toEqual(
      new URL('https://satusehat.example.test/fhir-r4/v1/Location/location-1'),
    );
    expect(requestCalls[1]?.[1]).toEqual(
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
    );
  });

  it('gets and searches Location resources with official query parameters', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Location', id: 'location-1' }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 1,
            entry: [{ resource: { resourceType: 'Location', id: 'location-1' } }],
          }),
        ),
      });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await client.getLocation('location-1');
    await client.searchLocations({
      identifier: 'http://sys-ids.kemkes.go.id/location/100000004|POLI-UMUM',
      organization: '100000004',
      name: 'Poli Umum',
    });

    const requestCalls = fetchMock.mock.calls as unknown[][];
    expect(requestCalls[0]?.[0]).toEqual(
      new URL('https://satusehat.example.test/fhir-r4/v1/Location/location-1'),
    );
    const searchUrl = requestCalls[1]?.[0] as URL;
    expect(searchUrl.pathname).toBe('/fhir-r4/v1/Location');
    expect(searchUrl.searchParams.get('identifier')).toBe(
      'http://sys-ids.kemkes.go.id/location/100000004|POLI-UMUM',
    );
    expect(searchUrl.searchParams.get('organization')).toBe('100000004');
    expect(searchUrl.searchParams.get('name')).toBe('Poli Umum');
  });

  it('gets and searches Practitioner resources by NIK identifier', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Practitioner', id: '10009880728' }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 1,
            entry: [
              { resource: { resourceType: 'Practitioner', id: '10009880728' } },
            ],
          }),
        ),
      });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await client.getPractitioner('10009880728');
    await client.searchPractitioners({
      identifier: 'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    });

    const requestCalls = fetchMock.mock.calls as unknown[][];
    expect(requestCalls[0]?.[0]).toEqual(
      new URL(
        'https://satusehat.example.test/fhir-r4/v1/Practitioner/10009880728',
      ),
    );
    const searchUrl = requestCalls[1]?.[0] as URL;
    expect(searchUrl.pathname).toBe('/fhir-r4/v1/Practitioner');
    expect(searchUrl.searchParams.get('identifier')).toBe(
      'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    );
  });

  it('creates, searches, and patches Patient resources using the FHIR API', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Patient', id: 'P10000001' }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 1,
            entry: [{ resource: { resourceType: 'Patient', id: 'P10000001' } }],
          }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({ resourceType: 'Patient', id: 'P10000001' }),
        ),
      });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);
    const payload = { resourceType: 'Patient', active: true };
    const patch = [{ op: 'replace', path: '/active', value: false }];

    await client.createPatient(payload);
    await client.searchPatients({
      identifier: 'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    });
    await client.patchPatient('P10000001', patch);

    const requestCalls = fetchMock.mock.calls as unknown[][];
    expect(requestCalls[0]?.[0]).toEqual(
      new URL('https://satusehat.example.test/fhir-r4/v1/Patient'),
    );
    expect(requestCalls[0]?.[1]).toEqual(
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }),
    );
    const searchUrl = requestCalls[1]?.[0] as URL;
    expect(searchUrl.searchParams.get('identifier')).toBe(
      'https://fhir.kemkes.go.id/id/nik|7209061211900001',
    );
    expect(requestCalls[2]?.[0]).toEqual(
      new URL('https://satusehat.example.test/fhir-r4/v1/Patient/P10000001'),
    );
    expect(requestCalls[2]?.[1]).toEqual(
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(patch) }),
    );
  });

  it('fails before requesting a token when the FHIR base URL is missing', async () => {
    delete process.env.SATUSEHAT_FHIR_BASE_URL;
    const getAccessToken = jest.fn();
    const auth = {
      getAccessToken,
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await expect(
      client.createOrganization({ resourceType: 'Organization' }),
    ).rejects.toMatchObject({ code: 'SATUSEHAT_FHIR_BASE_URL_MISSING' });
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('searches Organization resources with SATUSEHAT query parameters', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          resourceType: 'Bundle',
          type: 'searchset',
          total: 1,
          entry: [],
        }),
      ),
    });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await expect(
      client.searchOrganizations({
        name: 'Klinik Mitra Sehat',
        partof: '100000004',
      }),
    ).resolves.toEqual(expect.objectContaining({ resourceType: 'Bundle' }));

    expect(fetchMock).toHaveBeenCalledWith(
      new URL(
        'https://satusehat.example.test/fhir-r4/v1/Organization?name=Klinik+Mitra+Sehat&partof=100000004',
      ),
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('follows Bundle next links and merges all Organization pages', async () => {
    const nextUrl =
      'https://satusehat.example.test/fhir-r4/v1/Organization?partof=100000004&_page=2';
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 2,
            entry: [
              { resource: { resourceType: 'Organization', id: 'org-1' } },
            ],
            link: [{ relation: 'next', url: nextUrl }],
          }),
        ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'searchset',
            total: 2,
            entry: [
              { resource: { resourceType: 'Organization', id: 'org-2' } },
            ],
          }),
        ),
      });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await expect(
      client.searchOrganizations({ partof: '100000004' }),
    ).resolves.toEqual(
      expect.objectContaining({
        resourceType: 'Bundle',
        total: 2,
        entry: [
          { resource: { resourceType: 'Organization', id: 'org-1' } },
          { resource: { resourceType: 'Organization', id: 'org-2' } },
        ],
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requestCalls = fetchMock.mock.calls as unknown[][];
    expect(requestCalls[1]?.[0]).toEqual(new URL(nextUrl));
  });

  it('rejects pagination links outside the configured FHIR endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [],
          link: [
            {
              relation: 'next',
              url: 'https://unexpected.example.test/fhir/Organization?page=2',
            },
          ],
        }),
      ),
    });
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const client = new SatusehatFhirClient(auth);

    await expect(
      client.searchOrganizations({ partof: '100000004' }),
    ).rejects.toMatchObject({
      code: 'SATUSEHAT_FHIR_PAGINATION_URL_INVALID',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
