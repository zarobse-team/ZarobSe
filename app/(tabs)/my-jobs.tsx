import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../constants/api";

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  status: string;
  createdAt: string;
};

type ActiveTab = "posted" | "applied";

export default function MyJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("posted");

  const fetchMyJobs = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/my`, {
        method: "GET",
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
        Alert.alert(
          "Błąd",
          data.message || "Nie udało się pobrać Twoich zleceń.",
        );
        return;
      }

      setJobs(data);
    } catch (error) {
      console.error("My jobs fetch error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyJobs();
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moje zlecenia</Text>

      <Text style={styles.subtitle}>
        Zarządzaj swoimi zleceniami i zgłoszeniami
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[
            styles.tabButton,
            activeTab === "posted" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("posted")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "posted" && styles.activeTabText,
            ]}
          >
            Wystawione
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabButton,
            activeTab === "applied" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("applied")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "applied" && styles.activeTabText,
            ]}
          >
            Zgłoszenia
          </Text>
        </Pressable>
      </View>

      {activeTab === "posted" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {jobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={48} color="#94A3B8" />

              <Text style={styles.emptyTitle}>Brak wystawionych zleceń</Text>

              <Text style={styles.emptyText}>
                Nie dodałeś jeszcze żadnego zlecenia.
              </Text>
            </View>
          ) : (
            jobs.map((job) => (
              <TouchableOpacity
                key={job._id}
                style={styles.jobCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/job/[id]",
                    params: { id: job._id },
                  })
                }
              >
                <View style={styles.topRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{job.category}</Text>
                  </View>

                  <Text style={styles.price}>{job.budget} zł</Text>
                </View>

                <Text style={styles.jobTitle}>{job.title}</Text>

                <Text style={styles.description} numberOfLines={2}>
                  {job.description}
                </Text>

                <View style={styles.bottomRow}>
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color="#64748B"
                    />

                    <Text style={styles.location}>{job.city}</Text>
                  </View>

                  <Text style={styles.detailsText}>Szczegóły</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="hand-left-outline" size={48} color="#94A3B8" />

          <Text style={styles.emptyTitle}>Brak zgłoszeń</Text>

          <Text style={styles.emptyText}>
            Nie zgłosiłeś się jeszcze do żadnego zlecenia.
          </Text>

          <Text style={styles.placeholderText}>
            Ta sekcja zacznie działać po dodaniu systemu zgłoszeń.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E2A5A",
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 15,
    color: "#64748B",
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 10,
  },

  activeTabButton: {
    backgroundColor: "#FFFFFF",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },

  activeTabText: {
    color: "#2563EB",
  },

  list: {
    paddingBottom: 30,
    gap: 14,
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },

  placeholderText: {
    marginTop: 12,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },

  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16A34A",
  },

  jobTitle: {
    marginTop: 14,
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },

  description: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },

  bottomRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  location: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  detailsText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
});
