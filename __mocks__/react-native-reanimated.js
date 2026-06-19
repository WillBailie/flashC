const View = require('react-native').View;
const Text = require('react-native').Text;
const Image = require('react-native').Image;
const React = require('react');

function createAnimatedComponent(Component) {
  const AnimatedComponent = (props) => {
    const { style, animatedProps, entering, exiting, ...rest } = props;
    return React.createElement(Component, { style, ...rest });
  };
  AnimatedComponent.displayName = 'AnimatedComponent(' + (Component.displayName || Component.name || 'Component') + ')';
  return AnimatedComponent;
}

module.exports = {
  __esModule: true,
  default: {
    View: createAnimatedComponent(View),
    Text: createAnimatedComponent(Text),
    Image: createAnimatedComponent(Image),
    createAnimatedComponent,
  },
  useSharedValue: (init) => ({ value: init }),
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useDerivedValue: (cb) => ({ value: cb.value }),
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  withSequence: (...args) => args[args.length - 1],
  withDelay: (_delay, anim) => anim,
  interpolate: (value) => value,
  runOnJS: (fn) => fn,
  Easing: {
    out: (easing) => easing,
    in: (easing) => easing,
    ease: function mockEase() {},
    quad: function mockQuad() {},
    cubic: function mockCubic() {},
    back: () => function mockBack() {},
  },
  FadeInUp: { duration: () => ({}) },
};
