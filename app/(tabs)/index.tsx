import TooltipModal, { TooltipModalRef } from '@/src/components/decision/tooltip-modal';
import { screenWidth } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  const router = useRouter();
  const weatherModalRef = useRef<TooltipModalRef>(null!);
  // 1. Create refs for the actual buttons
  const weatherButtonRef = useRef<View>(null!);
  const tutorialButtonRef = useRef<View>(null!);
  const handleOpenTooltip = (
    buttonRef: React.RefObject<View>,
    modalRef: React.RefObject<TooltipModalRef>
  ) => {
    // .measure() calculates the size and position of the element on the screen
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {

      // Calculate exactly where the modal should go
      const calculatedTop = pageY + height + 5; // 5 pixels below the bottom of the button
      const calculatedRight = screenWidth - pageX - width; // Distance from the right edge
      const calculatedPointerOffset = (width / 2) - 10; // Center the triangle under the icon

      // Pass the math to the modal!
      modalRef.current?.open({
        top: calculatedTop,
        right: calculatedRight,
        pointerOffset: calculatedPointerOffset > 0 ? calculatedPointerOffset : 10,
      });
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      {/* Header Section */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.greeting}>Hi, Juan!</Text>
            <Text style={styles.date}>Thursday, March 26</Text>
          </View>

         <View style={styles.headerActions}>
            {/* 3. Attach the View ref, and trigger the calculation onPress */}
            <TouchableOpacity
              ref={weatherButtonRef}
              onPress={() => handleOpenTooltip(weatherButtonRef, weatherModalRef)}
              style={styles.iconButton}
            >
              <Ionicons name="partly-sunny-outline" size={28} color="#0A3B28" />
            </TouchableOpacity>

            <TouchableOpacity
              ref={tutorialButtonRef}
              onPress={() =>console.log('Tutorial button pressed!')} // Replace with actual handler when you set up the second modal
              style={styles.iconButton}
            >
              <Ionicons name="help-circle-outline" size={28} color="#0A3B28" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Farm Status Overview */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Active Crop Profile</Text>
            <Text style={styles.statusPlot}>Plot A</Text>
          </View>
          <Text style={styles.cropName}>🌾 Rice (IR64)</Text>
          <Text style={styles.cropStage}>Day 45 • Tillering Stage</Text>

          <View style={styles.dataLogContainer}>
            <Text style={styles.dataLogText}>Last data sync: 2 days ago</Text>
          </View>
        </View>

        {/* The Main Action Button */}
        <View style={styles.actionSection}>
      <TouchableOpacity
        style={styles.mainButton}
        onPress={() => router.push('/decision-type')}
      >
        <Text style={styles.mainButtonText}>Generate Decision</Text>
      </TouchableOpacity>
        </View>

        {/* Recent System Insights (Replaces Tasks) */}
        <View style={styles.insightSection}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightCategory}>🛡️ Crop Protection</Text>
              <Text style={styles.insightDate}>Mar 24</Text>
            </View>
            <Text style={styles.insightText}>
              Conditions favorable for Leaf Blight. Early protective measures recommended based on your last observation.
            </Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightCategory}>🚜 Harvest Window</Text>
              <Text style={styles.insightDate}>Mar 15</Text>
            </View>
            <Text style={styles.insightText}>
              Estimated optimal harvest window for Plot A approaches in approximately 30 days.
            </Text>
          </View>
        </View>

      </ScrollView>
{/* Weather Modal */}
      <TooltipModal ref={weatherModalRef} title="Current Weather">
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>Los Baños, Calabarzon</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>28°C</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 14 }}>Partly Cloudy</Text>
      </TooltipModal>

      {/* Tutorial Modal (If you set up a second ref for it)
      <TooltipModal
        ref={tutorialModalRef}
        title="Quick Tips"
        top={100}
        right={20}
        pointerOffset={15} // <-- Keeps the pointer closer to the right edge for the last icon
      >
        <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
          Tap "Generate Decision" to get AI insights for your active crop profile.
        </Text>
      </TooltipModal> */}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4FE',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerActions: {
    flexDirection: 'row', // This places the icons side-by-side
    alignItems: 'center',
    gap: 15, // Creates space between the two icons (Requires React Native 0.71+)
  },
  iconButton: {
    padding: 5, // Gives a nice invisible hit area for fingers to tap easily
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A3B28',
  },
  date: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 4,
  },
  weatherButton: {
    padding: 5,
  },
  weatherIcon: {
    fontSize: 28,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusPlot: {
    fontSize: 14,
    color: '#0A3B28',
    fontWeight: 'bold',
  },
  cropName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  cropStage: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 5,
    marginBottom: 15,
  },
  dataLogContainer: {
    backgroundColor: '#F7FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  dataLogText: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    marginBottom: 40,
  },

  mainButton: {
    backgroundColor: '#D1E8E2',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mainButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  insightSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A3B28',
    marginBottom: 15,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#38A169', // A green accent line
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightCategory: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  insightDate: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  insightText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  }
});