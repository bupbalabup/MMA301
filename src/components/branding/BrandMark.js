import { Image, StyleSheet, View } from 'react-native';

const SOURCES = {
  symbol: require('../../assets/branding/logo-symbol.png'),
  horizontal: require('../../assets/branding/logo-horizontal.png'),
  monoDark: require('../../assets/branding/logo-mono-dark.png'),
  monoLight: require('../../assets/branding/logo-mono-light.png'),
};

export default function BrandMark({ size = 40, style, variant = 'symbol' }) {
  const isHorizontal = variant === 'horizontal';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      <Image
        source={SOURCES[variant] ?? SOURCES.symbol}
        style={[
          styles.image,
          isHorizontal
            ? { height: size, width: size * 3.75 }
            : { height: size, width: size },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'contain',
  },
});

