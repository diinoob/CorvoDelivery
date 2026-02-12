import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';

interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ visible, onClose, onSave }) => {
  const signatureRef = useRef<any>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (!isEmpty) {
      signatureRef.current?.readSignature();
    }
  };

  const handleOK = (signature: string) => {
    // signature is a base64 data URL
    onSave(signature);
    onClose();
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const style = `.m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; margin: 0px; }
    body, html { width: 100%; height: 100%; }`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Assinatura Digital</Text>
          <TouchableOpacity onPress={handleSave} disabled={isEmpty}>
            <Text style={[styles.saveText, isEmpty && styles.saveTextDisabled]}>
              Guardar
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Ionicons name="finger-print" size={24} color="#64748b" />
          <Text style={styles.instructionsText}>
            Peça ao cliente para assinar no espaço abaixo
          </Text>
        </View>

        <View style={styles.signatureContainer}>
          {Platform.OS === 'web' ? (
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              onBegin={handleBegin}
              webStyle={style}
              backgroundColor="#ffffff"
              penColor="#1a365d"
              dotSize={2}
              minWidth={2}
              maxWidth={4}
            />
          ) : (
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              onBegin={handleBegin}
              webStyle={style}
              backgroundColor="#ffffff"
              penColor="#1a365d"
              dotSize={2}
              minWidth={2}
              maxWidth={4}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.clearButtonText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cancelText: {
    fontSize: 16,
    color: '#64748b',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a365d',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  saveTextDisabled: {
    opacity: 0.4,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    backgroundColor: '#f1f5f9',
  },
  instructionsText: {
    fontSize: 14,
    color: '#64748b',
  },
  signatureContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#ef4444',
  },
});
