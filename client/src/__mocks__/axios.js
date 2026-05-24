// Manual mock for axios to avoid ESM import parsing issues in Jest
const instance = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), handlers: [] },
    response: { use: jest.fn(), handlers: [] }
  },
};

const create = jest.fn(() => instance);

module.exports = {
  create,
  get: instance.get,
  post: instance.post,
  put: instance.put,
  patch: instance.patch,
  delete: instance.delete,
  interceptors: instance.interceptors,
  default: {
    create,
    get: instance.get,
    post: instance.post,
    put: instance.put,
    patch: instance.patch,
    delete: instance.delete,
    interceptors: instance.interceptors,
  },
  __esModule: true,
};
