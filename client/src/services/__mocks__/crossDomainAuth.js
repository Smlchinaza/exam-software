const mock = {
  initiateTransfer: jest.fn((loginData, domain) => {
    const transferData = {
      ...loginData,
      sourceDomain: typeof window !== 'undefined' ? window.location.hostname : domain,
      targetDomain: domain,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000),
      transferId: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const storage = typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : sessionStorage;
    storage.setItem('auth-transfer-data', JSON.stringify(transferData));

    return transferData;
  }),
  handleIncomingTransfer: jest.fn(async (id) => {
    const storage = typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : sessionStorage;
    const data = JSON.parse(storage.getItem('auth-transfer-data') || 'null');
    if (!data || data.transferId !== id) throw new Error('Invalid transfer ID');
    if (data.expiresAt && Date.now() > data.expiresAt) throw new Error('Transfer has expired');
    return data;
  })
};

module.exports = mock;
module.exports.default = mock;
module.exports.__esModule = true;
