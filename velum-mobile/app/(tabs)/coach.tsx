import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { coachApi, type CoachMessage } from '../../src/api/client';
import { Card } from '../../src/components/Card';

// Quick response cache for common patterns
const QUICK_RESPONSES: Record<string, string> = {
  'hello': 'Hey! 👋 Ready to crush your goals today?',
  'hi': 'Hi there! What are we working on?',
  'hey': 'Hey! 💪',
};

interface Message extends CoachMessage {
  isStreaming?: boolean;
  error?: boolean;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm Archie, your Velum coach. Ask me about nutrition, fitness, budget, or goals. 💪",
      id: 'welcome',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isTyping) return;

    // Clear input immediately for responsive feel
    setInputText('');

    // Add user message to UI immediately (optimistic UI)
    const userMessage: Message = {
      role: 'user',
      content: trimmedInput,
      id: `user-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    // Add placeholder for assistant response
    const assistantPlaceholder: Message = {
      role: 'assistant',
      content: '',
      id: `assistant-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setIsTyping(true);

    // Small delay to let UI update
    setTimeout(scrollToBottom, 50);

    // Check for quick responses
    const lowerInput = trimmedInput.toLowerCase().trim();
    if (QUICK_RESPONSES[lowerInput]) {
      // Use cached response for instant feedback
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantPlaceholder.id
              ? {
                  ...m,
                  content: QUICK_RESPONSES[lowerInput],
                  isStreaming: false,
                  source: 'local_cache',
                }
              : m
          )
        );
        setIsTyping(false);
        scrollToBottom();
      }, 300);
      return;
    }

    // Send to API with streaming
    try {
      await coachApi.sendMessage(trimmedInput, {
        onTyping: () => {
          setIsTyping(true);
        },
        onChunk: (chunk, fullText) => {
          // Update the placeholder with streaming content
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantPlaceholder.id
                ? { ...m, content: fullText, isStreaming: true }
                : m
            )
          );
          scrollToBottom();
        },
        onDone: (response) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantPlaceholder.id
                ? {
                    ...m,
                    content: response.content,
                    isStreaming: false,
                    source: response.source,
                  }
                : m
            )
          );
          setIsTyping(false);
          scrollToBottom();
        },
        onError: (error) => {
          console.error('[Coach] Streaming error:', error);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantPlaceholder.id
                ? {
                    ...m,
                    content: "Sorry, I'm having trouble connecting. Please try again.",
                    isStreaming: false,
                    error: true,
                  }
                : m
            )
          );
          setIsTyping(false);
          scrollToBottom();
        },
      });
    } catch (error) {
      console.error('[Coach] Send error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantPlaceholder.id
            ? {
                ...m,
                content: "Sorry, I'm having trouble connecting. Please try again.",
                isStreaming: false,
                error: true,
              }
            : m
        )
      );
      setIsTyping(false);
      scrollToBottom();
    }
  }, [inputText, isTyping, scrollToBottom]);

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <View
        key={message.id || index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            message.error && styles.errorBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              message.error && styles.errorText,
            ]}
          >
            {message.content}
            {message.isStreaming && (
              <Text style={styles.typingIndicator}>▊</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((message, index) => renderMessage(message, index))}
        
        {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.textLight} />
              <Text style={styles.typingText}>Archie is typing...</Text>
            </View>
          </View>
        )}
        
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message Archie..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            editable={!isTyping}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() && !isTyping ? colors.accent : colors.textLight}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sidebar,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.bg,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: colors.error + '20',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: colors.darkText,
  },
  assistantText: {
    color: colors.text,
  },
  errorText: {
    color: colors.error,
  },
  typingIndicator: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: colors.textLight,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
