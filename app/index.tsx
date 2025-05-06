import { Redirect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


export default function Index() {
  return (
    <Redirect href="/(tabs)/home" />
  )
}