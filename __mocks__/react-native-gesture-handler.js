const React = require('react');
const View = require('react-native').View;

module.exports = {
  Gesture: {
    Tap: () => ({ numberOfTaps: () => ({ onEnd: () => ({}) }) }),
    Pan: () => ({
      activeOffsetX: () => ({
        failOffsetY: () => ({
          onBegin: () => ({
            onUpdate: () => ({
              onEnd: () => ({}),
            }),
          }),
        }),
      }),
    }),
    Race: (...args) => args[0],
  },
  GestureDetector: ({ children }) => React.createElement(View, null, children),
};
