// Debugging and Testing Script for Enhanced Features
// Run this in the browser console to test all enhanced features

const DebugTests = {
  // Test environment detection
  testEnvironment() {
    console.log('=== ENVIRONMENT TEST ===');
    console.log('Domain:', window.location.hostname);
    console.log('Protocol:', window.location.protocol);
    console.log('User Agent:', navigator.userAgent);
    console.log('Online:', navigator.onLine);
    console.log('Local Storage:', typeof(Storage) !== 'undefined' ? 'Available' : 'Not Available');
    console.log('Service Worker:', 'serviceWorker' in navigator ? 'Supported' : 'Not Supported');
  },

  // Test local storage functionality
  testLocalStorage() {
    console.log('=== LOCAL STORAGE TEST ===');
    try {
      const testKey = 'test_key_' + Date.now();
      const testValue = 'test_value_' + Math.random();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      console.log('Write/Read Test:', retrieved === testValue ? '✅ PASS' : '❌ FAIL');
      console.log('Current user ID:', localStorage.getItem('weddingAppUserId'));
    } catch (error) {
      console.error('Local Storage Error:', error);
    }
  },

  // Test API endpoint directly
  async testDirectAPI() {
    console.log('=== DIRECT API TEST ===');
    const endpoints = [
      '/api/analyze-text',
      '/api/text-to-speech',
      '/api/get-settings'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test', test: true })
        });
        console.log(`${endpoint}:`, response.status, response.statusText);
        
        if (response.status === 404) {
          console.warn(`❌ ${endpoint} - Not Found (404)`);
        } else if (response.status >= 500) {
          console.warn(`❌ ${endpoint} - Server Error (${response.status})`);
        } else if (response.status === 405) {
          console.warn(`⚠️ ${endpoint} - Method Not Allowed (405) - Expected for GET`);
        } else {
          console.log(`✅ ${endpoint} - Responding (${response.status})`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint} - Error:`, error.message);
      }
    }
  },

  // Test Gemini API key presence
  async testGeminiAPI() {
    console.log('=== GEMINI API TEST ===');
    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello, this is a test message for Gemini API.' })
      });
      
      console.log('Gemini API Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Gemini API Response:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ Gemini API Error:', errorText);
      }
    } catch (error) {
      console.error('❌ Gemini API Test Failed:', error);
    }
  },

  // Test notification permission and service worker
  async testNotifications() {
    console.log('=== NOTIFICATION TEST ===');
    
    console.log('Notification Permission:', Notification.permission);
    console.log('Service Worker Support:', 'serviceWorker' in navigator);
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        console.log('SW Registration:', registration ? 'Registered' : 'Not Registered');
        
        if (registration) {
          console.log('SW State:', registration.active?.state);
          console.log('SW Scope:', registration.scope);
        }
      } catch (error) {
        console.error('SW Error:', error);
      }
    }
  },

  // Test CORS and same-origin policy
  async testCORS() {
    console.log('=== CORS TEST ===');
    try {
      const response = await fetch(window.location.origin + '/api/analyze-text', {
        method: 'OPTIONS'
      });
      console.log('CORS Preflight:', response.status);
      console.log('CORS Headers:', Object.fromEntries(response.headers.entries()));
    } catch (error) {
      console.error('CORS Error:', error);
    }
  },

  // Test user preferences system
  testUserPreferences() {
    console.log('=== USER PREFERENCES TEST ===');
    
    // Check if user preferences manager exists
    if (window.userPreferencesManager) {
      console.log('✅ User Preferences Manager: Available');
      try {
        const prefs = window.userPreferencesManager.getAllPreferences();
        console.log('Current Preferences:', prefs);
      } catch (error) {
        console.error('❌ Error getting preferences:', error);
      }
    } else {
      console.log('❌ User Preferences Manager: Not Available');
    }
    
    // Check localStorage for preferences
    const storedPrefs = localStorage.getItem('weddingAppUserPreferences');
    console.log('Stored Preferences:', storedPrefs ? JSON.parse(storedPrefs) : 'None');
  },

  // Test enhanced components
  testEnhancedComponents() {
    console.log('=== ENHANCED COMPONENTS TEST ===');
    
    const components = [
      'userPreferencesManager',
      'enhancedOnboardingManager',
      'EnhancedFloatingControls',
      'EnhancedAudioPlayer',
      'EnhancedSettingsManager'
    ];
    
    components.forEach(component => {
      const exists = window[component] || document.querySelector(`[data-component="${component}"]`);
      console.log(`${component}:`, exists ? '✅ Available' : '❌ Not Found');
    });
  },

  // Test FirebaseAuth�� endpoints systematically
  async testAllNetworkEndpoints() {
    console.log('=== NETWORK ENDPOINTS TEST ===');
    
    const tests = [
      {
        name: 'Analyze Text',
        url: '/api/analyze-text',
        method: 'POST',
        body: { text: 'Test message for analysis' }
      },
      {
        name: 'Text to Speech',
        url: '/api/text-to-speech',
        method: 'POST',
        body: { text: 'Hello world', voice: 'default' }
      },
      {
        name: 'Get Settings',
        url: '/api/get-settings',
        method: 'GET',
        body: null
      },
      {
        name: 'Register Push',
        url: '/api/register-push',
        method: 'POST',
        body: { subscription: { endpoint: 'test' } }
      }
    ];
    
    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}...`);
        const options = {
          method: test.method,
          headers: { 'Content-Type': 'application/json' }
        };
        
        if (test.body) {
          options.body = JSON.stringify(test.body);
        }
        
        const response = await fetch(test.url, options);
        console.log(`${test.name}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          try {
            const data = await response.json();
            console.log(`✅ ${test.name} Success:`, data);
          } catch {
            console.log(`✅ ${test.name} Success (non-JSON response)`);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ ${test.name} Error:`, errorText);
        }
      } catch (error) {
        console.error(`❌ ${test.name} Failed:`, error.message);
      }
    }
  },

  // Run all tests
  async runAllTests() {
    console.log('🧪 STARTING COMPREHENSIVE DEBUG TESTS');
    console.log('=====================================');
    
    this.testEnvironment();
    this.testLocalStorage();
    this.testUserPreferences();
    this.testEnhancedComponents();
    await this.testDirectAPI();
    await this.testAllNetworkEndpoints();
    await this.testGeminiAPI();
    await this.testNotifications();
    await this.testCORS();
    
    console.log('=====================================');
    console.log('🏁 DEBUG TESTS COMPLETED');
    console.log('Check the results above for any issues marked with ❌');
  }
};

// Auto-run tests when script is loaded
if (typeof window !== 'undefined') {
  window.DebugTests = DebugTests;
  
  // Add to global window for easy access
  window.runAllTests = () => DebugTests.runAllTests();
  
  // Initialize tests when script is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🎯 Test suite ready! Run window.runAllTests() in console to execute all tests.');
    });
  } else {
    console.log('🎯 Test suite ready! Run window.runAllTests() in console to execute all tests.');
  }
}
