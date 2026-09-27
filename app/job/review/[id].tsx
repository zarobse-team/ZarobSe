import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
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

type ReviewStatusResponse = {
  reviewed: boolean;
  review: {
    _id: string;
    rating: number;
    comment?: string;
  } | null;
};

export default function JobReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingComment, setExistingComment] = useState("");

  const fetchReviewStatus = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/review`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data: ReviewStatusResponse | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data) {
        Alert.alert("Błąd", "Nie udało się pobrać informacji o opinii.");
        return;
      }

      setAlreadyReviewed(data.reviewed);

      if (data.review) {
        setExistingRating(data.review.rating);
        setExistingComment(data.review.comment ?? "");
      }
    } catch (error) {
      console.error("Fetch review status error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReviewStatus();
    }
  }, [id]);

  const submitReview = async () => {
    if (rating < 1 || rating > 5) {
      Alert.alert("Wybierz ocenę", "Wybierz od 1 do 5 gwiazdek.");
      return;
    }

    if (comment.trim().length > 1000) {
      Alert.alert("Błąd", "Komentarz może mieć maksymalnie 1000 znaków.");
      return;
    }

    try {
      setSubmitting(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się wystawić opinii.");
        return;
      }

      Alert.alert("Gotowe", "Opinia została wystawiona.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Submit review error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setSubmitting(false);
    }
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
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E2A5A" />

            <Text style={styles.backText}>Wróć</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Ionicons name="star" size={36} color="#F59E0B" />
          </View>

          <Text style={styles.title}>
            {alreadyReviewed ? "Twoja opinia" : "Wystaw opinię"}
          </Text>

          <Text style={styles.subtitle}>
            {alreadyReviewed
              ? "Opinia dla tego zlecenia została już wystawiona."
              : "Oceń współpracę po zakończonym zleceniu."}
          </Text>

          {alreadyReviewed ? (
            <View style={styles.reviewCard}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      existingRating && star <= existingRating
                        ? "star"
                        : "star-outline"
                    }
                    size={34}
                    color="#F59E0B"
                  />
                ))}
              </View>

              {existingComment ? (
                <Text style={styles.existingComment}>{existingComment}</Text>
              ) : (
                <Text style={styles.noComment}>Bez komentarza</Text>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.label}>Twoja ocena</Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(star)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={star <= rating ? "star" : "star-outline"}
                      size={42}
                      color="#F59E0B"
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.ratingText}>
                {rating === 0 ? "Wybierz liczbę gwiazdek" : `${rating}/5`}
              </Text>

              <Text style={styles.label}>Komentarz</Text>

              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Napisz kilka słów o współpracy..."
                placeholderTextColor="#94A3B8"
                style={styles.commentInput}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />

              <Text style={styles.charactersCount}>{comment.length}/1000</Text>

              <Pressable
                style={[
                  styles.submitButton,
                  (rating === 0 || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={submitReview}
                disabled={rating === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="star-outline" size={21} color="#FFFFFF" />

                    <Text style={styles.submitButtonText}>Wystaw opinię</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E2A5A",
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 36,
  },

  iconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  title: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },

  label: {
    marginTop: 30,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#1E2A5A",
  },

  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  ratingText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },

  commentInput: {
    minHeight: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    color: "#0F172A",
  },

  charactersCount: {
    marginTop: 6,
    textAlign: "right",
    fontSize: 12,
    color: "#94A3B8",
  },

  submitButton: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    borderRadius: 18,
    minHeight: 56,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  submitButtonDisabled: {
    opacity: 0.45,
  },

  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  reviewCard: {
    marginTop: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },

  existingComment: {
    marginTop: 20,
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    textAlign: "center",
  },

  noComment: {
    marginTop: 20,
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
});
