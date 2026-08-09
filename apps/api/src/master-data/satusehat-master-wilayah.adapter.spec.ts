import { SatusehatAuthService } from '../satusehat/satusehat-auth.service';
import { SatusehatMasterWilayahAdapter } from './satusehat-master-wilayah.adapter';
import { MasterDataProviderError } from './master-wilayah.provider';

const response = (
  body: unknown,
  status = 200,
  headers: HeadersInit = {},
) => ({
  ok: status >= 200 && status < 300,
  status,
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  headers: new Headers(headers),
});

describe('SatusehatMasterWilayahAdapter', () => {
  const originalBaseUrl = process.env.SATUSEHAT_MASTER_DATA_BASE_URL;
  const originalTimeout = process.env.SATUSEHAT_HTTP_TIMEOUT_MS;

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.SATUSEHAT_MASTER_DATA_BASE_URL;
    else process.env.SATUSEHAT_MASTER_DATA_BASE_URL = originalBaseUrl;
    if (originalTimeout === undefined) delete process.env.SATUSEHAT_HTTP_TIMEOUT_MS;
    else process.env.SATUSEHAT_HTTP_TIMEOUT_MS = originalTimeout;
    jest.restoreAllMocks();
  });

  it('fetches the four levels through the Master Data API, not FHIR', async () => {
    process.env.SATUSEHAT_MASTER_DATA_BASE_URL =
      'https://masterdata.example.test/masterdata/v1';
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ data: [{ code: '11', parent_code: '', bps_code: '11', name: 'Aceh' }] }))
      .mockResolvedValueOnce(response({ data: [{ code: '1103', parent_code: '11', bps_code: '1105', name: 'Kab. Aceh Timur' }] }))
      .mockResolvedValueOnce(response({ data: [{ code: '110301', parent_code: '1103', bps_code: '1105140', name: 'Darul Aman' }] }))
      .mockResolvedValueOnce(response({ data: [{ code: '1103012002', parent_code: '110301', bps_code: '1105140007', name: 'Alue Luddin Dua' }] }));
    global.fetch = fetchMock;

    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const adapter = new SatusehatMasterWilayahAdapter(auth);

    await expect(adapter.fetchSnapshot()).resolves.toMatchObject({
      source: 'SATUSEHAT',
      sourceVersion: 'master-wilayah-v1',
      complete: true,
      records: expect.arrayContaining([
        expect.objectContaining({ level: 'PROVINCE', code: '11' }),
        expect.objectContaining({ level: 'VILLAGE', code: '1103012002' }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      new URL('https://masterdata.example.test/masterdata/v1/provinces?codes='),
    );
    expect(fetchMock.mock.calls[1]?.[0]).toEqual(
      new URL('https://masterdata.example.test/masterdata/v1/cities?province_codes=11'),
    );
    expect(fetchMock.mock.calls[2]?.[0]).toEqual(
      new URL('https://masterdata.example.test/masterdata/v1/districts?city_codes=1103'),
    );
    expect(fetchMock.mock.calls[3]?.[0]).toEqual(
      new URL('https://masterdata.example.test/masterdata/v1/sub-districts?district_codes=110301'),
    );
  });

  it('turns provider failures and invalid response into safe typed errors', async () => {
    process.env.SATUSEHAT_MASTER_DATA_BASE_URL =
      'https://masterdata.example.test/masterdata/v1';
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const adapter = new SatusehatMasterWilayahAdapter(auth);

    global.fetch = jest.fn().mockResolvedValue(response({ message: 'down' }, 503));
    await expect(adapter.fetchSnapshot()).rejects.toMatchObject<Partial<MasterDataProviderError>>({
      code: 'MASTER_DATA_PROVIDER_HTTP_ERROR',
      httpStatus: 503,
    });

    global.fetch = jest.fn().mockResolvedValue(response({ data: { code: 'invalid' } }));
    await expect(adapter.fetchSnapshot()).rejects.toMatchObject({
      code: 'MASTER_DATA_PROVIDER_RESPONSE_INVALID',
    });
  });

  it('uses a gateway-safe 500-code parent batch instead of many small requests', async () => {
    process.env.SATUSEHAT_MASTER_DATA_BASE_URL =
      'https://masterdata.example.test/masterdata/v1';
    const provinces = Array.from({ length: 2_001 }, (_, index) => ({
      code: String(index + 1),
      parent_code: '',
      name: `Province ${index + 1}`,
    }));
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ data: provinces }))
      .mockResolvedValue(response({ data: [] }));
    global.fetch = fetchMock;

    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const adapter = new SatusehatMasterWilayahAdapter(auth);

    await expect(adapter.fetchSnapshot()).resolves.toMatchObject({
      complete: true,
      records: expect.arrayContaining([
        expect.objectContaining({ level: 'PROVINCE', code: '1' }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);

    const firstCityRequest = new URL(fetchMock.mock.calls[1]?.[0] as URL);
    const lastCityRequest = new URL(fetchMock.mock.calls[5]?.[0] as URL);
    expect(firstCityRequest.searchParams.get('province_codes')?.split(',')).toHaveLength(500);
    expect(lastCityRequest.searchParams.get('province_codes')?.split(',')).toHaveLength(1);
  });

  it('exposes a safe actionable error for provider rate limiting', async () => {
    process.env.SATUSEHAT_MASTER_DATA_BASE_URL =
      'https://masterdata.example.test/masterdata/v1';
    const auth = {
      getAccessToken: jest.fn().mockResolvedValue('access-token'),
    } as unknown as SatusehatAuthService;
    const adapter = new SatusehatMasterWilayahAdapter(auth);

    global.fetch = jest
      .fn()
      .mockResolvedValue(response({ message: 'too many requests' }, 429, {
        'Retry-After': '30',
      }));

    await expect(adapter.fetchSnapshot()).rejects.toMatchObject({
      code: 'MASTER_DATA_PROVIDER_RATE_LIMITED',
      httpStatus: 429,
      message: expect.stringContaining('30 detik'),
    });
  });
});
