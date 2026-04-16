import { View, StyleSheet } from 'react-native';
import { Slot } from 'expo-router';
import { TopNavBar } from '../../components/navigation/TopNavBar';

export default function AppLayout() {
  return (
    <View style={styles.root}>
      <TopNavBar />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0C1B33',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
