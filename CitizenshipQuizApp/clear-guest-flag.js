// Quick script to clear the hasEverCreatedAccount flag for testing

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearFlag() {
  try {
    await AsyncStorage.removeItem('hasEverCreatedAccount');
    console.log('✅ Cleared hasEverCreatedAccount flag');
    console.log('Restart the app to see WelcomeScreen');
  } catch (error) {
    console.error('Error:', error);
  }
}

clearFlag();
