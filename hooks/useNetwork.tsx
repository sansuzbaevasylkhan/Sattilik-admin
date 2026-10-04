import { createContext, useContext, useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BG_DARK } from '@/lib/theme';

interface NetworkContextType {
  isConnected: boolean | null;
  isInternetConnected: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetConnected: true,
});

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState<NetInfoState.isConnected | null>(true);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // We treat it as connected if isConnected is true.
  // In some cases, isConnected might be true but there is no actual internet access.
  // For simplicity in this implementation, we follow NetInfo's isConnected.
  const isInternetConnected = isConnected === true;

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetConnected }}>
      {children}
      {!isInternetConnected && <NetworkOverlay />}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

function NetworkOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.text}>Интернет байланысы жоқ. Қосымшаны пайдалану үшін интернетке қосылыңыз.</Text>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: BG_DARK,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    lineHeight: 24,
  },
});
