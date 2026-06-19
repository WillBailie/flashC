const React = require('react');
const View = require('react-native').View;

function createMockElement(name) {
  return React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }));
}

const Circle = createMockElement('Circle');
const G = createMockElement('G');
const Svg = createMockElement('Svg');
Svg.Circle = Circle;
Svg.G = G;

module.exports = {
  __esModule: true,
  default: Svg,
  Circle,
  G,
  Svg,
  Rect: createMockElement('Rect'),
  Path: createMockElement('Path'),
  Line: createMockElement('Line'),
  Text: createMockElement('Text'),
  LinearGradient: createMockElement('LinearGradient'),
  Stop: createMockElement('Stop'),
  Defs: createMockElement('Defs'),
};
