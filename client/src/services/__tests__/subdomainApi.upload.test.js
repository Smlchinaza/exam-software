describe('SubdomainApiClient upload', () => {
  let postMock;

  beforeEach(() => {
    jest.resetModules();

    postMock = jest.fn().mockResolvedValue({ data: { uploads: [] } });

    // Provide a mock for axios that returns an instance with post and interceptors
    jest.doMock('axios', () => ({
      create: () => ({
        post: postMock,
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      })
    }));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.dontMock('axios');
  });

  test('sends multipart/form-data with file and additional fields', async () => {
    // Require after mocking axios so the module uses the mock
    const { SubdomainApiClient } = require('../subdomainApi');

    const client = new SubdomainApiClient();

    // Create a File (jsdom supports File)
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    await client.upload('/api/uploads', file, { school_id: '42' });

    expect(postMock).toHaveBeenCalledTimes(1);

    const [url, formData, config] = postMock.mock.calls[0];

    expect(url).toBe('/api/uploads');
    // FormData should contain the file under 'file'
    expect(typeof formData.get).toBe('function');
    expect(formData.get('file')).toBe(file);
    // Additional field should be present
    expect(formData.get('school_id')).toBe('42');
    // Config should set multipart Content-Type
    expect(config).toBeDefined();
    expect(config.headers).toBeDefined();
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });
});
