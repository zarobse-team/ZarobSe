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

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  status: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    city: string;
  };
  createdAt: string;
  updatedAt: string;
};

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Błąd", "Musisz być zalogowany.");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        Alert.alert("Błąd", data?.message || "Nie udało się pobrać zlecenia.");
        return;
      }

      setJob(data);
    } catch (error) {
      console.error("Job details error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchJob();
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text>Nie udało się pobrać zlecenia.</Text>
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

        <View style={styles.topRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{job.category}</Text>
          </View>

          <Text style={styles.price}>{job.budget} zł</Text>
        </View>

        <Text style={styles.title}>{job.title}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color="#64748B" />

          <Text style={styles.location}>{job.city}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opis zlecenia</Text>

          <View style={styles.card}>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zleceniodawca</Text>

          <View style={styles.authorCard}>
            {job.author?.avatar ? (
              <Image
                source={{ uri: job.author.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color="#64748B" />
              </View>
            )}

            <View>
              <Text style={styles.authorName}>
                {job.author?.firstName} {job.author?.lastName}
              </Text>

              {job.author?.city ? (
                <Text style={styles.authorCity}>{job.author.city}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <Pressable
          style={styles.applyButton}
          onPress={() =>
            Alert.alert(
              "Jeszcze chwila",
              "Zgłaszanie się do zlecenia dodamy w kolejnym kroku.",
            )
          }
        >
          <Text style={styles.applyButtonText}>Zgłoś się do zlecenia</Text>
        </Pressable>
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

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },

  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  price: {
    fontSize: 24,
    fontWeight: "800",
    color: "#16A34A",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 20,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },

  location: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  section: {
    marginTop: 30,
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

  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
  },

  authorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  authorName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  authorCity: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },

  applyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 32,
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
