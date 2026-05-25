import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: 'white',
          fontSize: 34,
          fontWeight: 'bold',
        }}
      >
        Echo's Tale
      </Text>

      <Text
        style={{
          color: '#888',
          marginTop: 12,
          fontSize: 16,
        }}
      >
        First iPhone app by Shey
      </Text>
    </View>
  );
}