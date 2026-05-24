const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  Routes: ({ children }) => React.createElement(React.Fragment, null, children),
  Route: () => null,
  Navigate: () => null,
  Link: ({ children }) => React.createElement('a', null, children),
  useLocation: () => ({ pathname: '/', search: '' }),
  useNavigate: () => () => {},
};
