import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

// These are the dynamic coordinates we will pass when opening the modal
export interface TooltipConfig {
  top: number;
  right: number;
  pointerOffset: number;
}

export interface TooltipModalRef {
  open: (config: TooltipConfig) => void;
  close: () => void;
}

export interface TooltipModalProps {
  title?: string;
  children?: React.ReactNode;
}

const TooltipModal = forwardRef<TooltipModalRef, TooltipModalProps>(
  ({ title, children }, ref) => {
    const [visible, setVisible] = useState(false);

    // Default starting state for the coordinates
    const [config, setConfig] = useState<TooltipConfig>({ top: 0, right: 0, pointerOffset: 15 });

    useImperativeHandle(ref, () => ({
      // Now open() accepts the calculated coordinates and updates the state
      open: (newConfig: TooltipConfig) => {
        setConfig(newConfig);
        setVisible(true);
      },
      close: () => setVisible(false)
    }));

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          {/* Apply the dynamic top and right values here */}
          <Pressable style={[styles.tooltipContainer, { top: config.top, right: config.right }]}>

            {/* Apply the dynamic pointer offset here */}
            <View style={[styles.tooltipPointer, { right: config.pointerOffset }]} />

            {title && <Text style={styles.title}>{title}</Text>}

            <View style={styles.contentContainer}>
              {children}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);

export default TooltipModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  tooltipContainer: {
    position: 'absolute',
    backgroundColor: '#68C398',
    padding: 15,
    borderRadius: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  tooltipPointer: {
    position: 'absolute',
    top: -10,
    right: 15,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#68C398',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentContainer: {
    marginTop: 2,
  }
});