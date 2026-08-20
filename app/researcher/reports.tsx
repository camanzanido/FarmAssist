// app/researcher/reports.tsx
// Placeholder screen — content to be built out separately. Exists so
// RoleGuard has something real to redirect to/from during testing.
import { View, Text } from 'react-native';

export default function ResearcherReportsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1b8a7e', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>Reports</Text>
    </View>
  );
}
