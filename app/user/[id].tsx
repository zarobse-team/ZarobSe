import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_URL } from "../../constants/api";

type PublicUser = {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  city?: string;
  bio?: string;
  createdAt?: string;
  stats: {
    postedJobs: number;
    completedJobs: number;
    rating: number | null;
    reviewsCount: number;
  };
};

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        Alert.alert(
          "Błąd",
          data.message || "Nie udało się pobrać profilu użytkownika.",
        );
        return;
      }

      setUser(data);
    } catch (error) {
      console.error("Public user profile error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchUser();
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text>Nie udało się pobrać profilu.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E2A5A" />

          <Text style={styles.backText}>Wróć</Text>
        </Pressable>

        <View style={styles.profileCard}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={46} color="#64748B" />
            </View>
          )}

          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>

          {user.city ? (
            <View style={styles.cityRow}>
              <Ionicons name="location-outline" size={17} color="#64748B" />

              <Text style={styles.city}>{user.city}</Text>
            </View>
          ) : null}

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={20} color="#F59E0B" />

            <Text style={styles.ratingText}>
              {user.stats.rating !== null
                ? user.stats.rating.toFixed(1)
                : "Brak ocen"}
            </Text>

            {user.stats.reviewsCount > 0 && (
              <Text style={styles.reviewsText}>
                ({user.stats.reviewsCount} opinii)
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.stats.postedJobs}</Text>

            <Text style={styles.statLabel}>Wystawione</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.stats.completedJobs}</Text>

            <Text style={styles.statLabel}>Zakończone</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O użytkowniku</Text>

          <View style={styles.card}>
            <Text style={styles.bio}>
              {user.bio?.trim()
                ? user.bio
                : "Użytkownik nie dodał jeszcze opisu."}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opinie</Text>

          <View style={styles.card}>
            {user.stats.reviewsCount === 0 ? (
              <Text style={styles.emptyText}>
                Ten użytkownik nie ma jeszcze opinii.
              </Text>
            ) : (
              <Text style={styles.emptyText}>
                Opinie dodamy po wdrożeniu systemu ocen.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E2A5A",
  },

  profileCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },

  cityRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  city: {
    fontSize: 15,
    color: "#64748B",
  },

  ratingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  ratingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },

  reviewsText: {
    fontSize: 14,
    color: "#64748B",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2563EB",
  },

  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E2A5A",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
  },

  bio: {
    fontSize: 15,
    lineHeight: 23,
    color: "#334155",
  },

  emptyText: {
    fontSize: 15,
    color: "#64748B",
  },
});
