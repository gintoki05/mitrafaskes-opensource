import { SatusehatAuthService } from './satusehat-auth.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';

describe('SatusehatFhirClient', () => {
  let fetchMock: jest.Mock;
  let originalBaseUrl: string | undefined;

  beforeEach(() => {
    originalBaseUrl = process.env.SATUSEHAT_FHIR_BASE_URL;
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
});
