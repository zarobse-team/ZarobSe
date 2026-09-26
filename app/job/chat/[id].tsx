import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { API_URL } from "../../../constants/api";

type Sender = {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

type Message = {
  _id: string;
  job: string;
  sender: Sender;
  content: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CurrentUser = {
  _id: string;
};

export default function JobChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);

  const fetchMessages = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        if (showLoader) {
          Alert.alert(
            "Błąd",
            data.message || "Nie udało się pobrać wiadomości.",
          );
        }

        return;
      }

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch chat messages error:", error);

      if (showLoader) {
        Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        return;
      }

      await fetch(`${API_URL}/api/jobs/${id}/messages/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Mark messages as read error:", error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as CurrentUser;

      setCurrentUserId(data._id);
    } catch (error) {
      console.error("Fetch current user error:", error);
    }
  };

  const sendMessage = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent || sending) {
      return;
    }

    if (trimmedContent.length > 2000) {
      Alert.alert("Błąd", "Wiadomość może mieć maksymalnie 2000 znaków.");
      return;
    }

    try {
      setSending(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: trimmedContent,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się wysłać wiadomości.");
        return;
      }

      setContent("");

      setMessages((current) => [...current, data as Message]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({
          animated: true,
        });
      }, 100);
    } catch (error) {
      console.error("Send chat message error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!id) {
      return;
    }

    const initialize = async () => {
      await fetchCurrentUser();
      await fetchMessages(true);
      await markMessagesAsRead();
    };

    initialize();

    const interval = setInterval(async () => {
      await fetchMessages();
      await markMessagesAsRead();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [id]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: false,
      });
    }, 100);
  }, [messages.length]);

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E2A5A" />
          </Pressable>

          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Czat</Text>

            <Text style={styles.headerSubtitle}>
              Rozmowa dotycząca zlecenia
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isMine = item.sender?._id === currentUserId;

            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.myMessageRow : styles.otherMessageRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myMessageBubble : styles.otherMessageBubble,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.senderName}>
                      {item.sender?.firstName} {item.sender?.lastName}
                    </Text>
                  )}

                  <Text
                    style={[styles.messageText, isMine && styles.myMessageText]}
                  >
                    {item.content}
                  </Text>

                  <View style={styles.messageFooter}>
                    <Text
                      style={[
                        styles.messageTime,
                        isMine && styles.myMessageTime,
                      ]}
                    >
                      {formatTime(item.createdAt)}
                    </Text>

                    {isMine && (
                      <Ionicons
                        name={item.readAt ? "checkmark-done" : "checkmark"}
                        size={15}
                        color={item.readAt ? "#DBEAFE" : "#BFDBFE"}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={46}
                color="#94A3B8"
              />

              <Text style={styles.emptyTitle}>Brak wiadomości</Text>

              <Text style={styles.emptyText}>
                Napisz pierwszą wiadomość dotyczącą tego zlecenia.
              </Text>
            </View>
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Napisz wiadomość..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            multiline
            maxLength={2000}
          />

          <Pressable
            style={[
              styles.sendButton,
              (!content.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!content.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  keyboardView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  headerTextWrapper: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },

  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },

  emptyMessagesList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  messageRow: {
    width: "100%",
    marginBottom: 10,
  },

  myMessageRow: {
    alignItems: "flex-end",
  },

  otherMessageRow: {
    alignItems: "flex-start",
  },

  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  myMessageBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 5,
  },

  otherMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  senderName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 4,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
    color: "#1F2937",
  },

  myMessageText: {
    color: "#FFFFFF",
  },

  messageFooter: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  messageTime: {
    fontSize: 10,
    color: "#94A3B8",
  },

  myMessageTime: {
    color: "#BFDBFE",
  },

  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#94A3B8",
    textAlign: "center",
  },

  inputContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    color: "#0F172A",
  },

  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    opacity: 0.45,
  },
});
