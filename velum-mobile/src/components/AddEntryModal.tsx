import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export interface FormField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
}

interface AddEntryModalProps {
  visible: boolean;
  title: string;
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
}

export function AddEntryModal({
  visible,
  title,
  fields,
  onSubmit,
  onClose,
}: AddEntryModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const missing = fields.filter(
      (f) => f.required && !values[f.key]?.trim(),
    );
    if (missing.length > 0) return;
    onSubmit(values);
    setValues({});
  };

  const handleClose = () => {
    setValues({});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </Pressable>
          </View>

          <ScrollView style={styles.body}>
            {fields.map((field) => (
              <View key={field.key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                </Text>

                {field.type === 'select' && field.options ? (
                  <View style={styles.selectRow}>
                    {field.options.map((option) => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.selectOption,
                          values[field.key] === option.value &&
                            styles.selectOptionActive,
                        ]}
                        onPress={() =>
                          setValues((v) => ({
                            ...v,
                            [field.key]: option.value,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.selectOptionText,
                            values[field.key] === option.value &&
                              styles.selectOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textLight}
                    value={values[field.key] || ''}
                    onChangeText={(text) =>
                      setValues((v) => ({ ...v, [field.key]: text }))
                    }
                    keyboardType={
                      field.type === 'number' ? 'decimal-pad' : 'default'
                    }
                    returnKeyType="next"
                  />
                )}
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitText}>Add Entry</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.sidebar,
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    minWidth: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.sidebar,
  },
  selectOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textLight,
  },
  selectOptionTextActive: {
    color: colors.accent,
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.dark,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: colors.darkText,
    fontSize: 16,
    fontWeight: '700',
  },
});
