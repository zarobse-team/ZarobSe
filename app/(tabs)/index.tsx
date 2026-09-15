import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const categories = ["Wszystko", "Ogród", "Zwierzęta", "Dom", "Zakupy"];

export default function BrowseScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Błąd", "Brak tokenu użytkownika.");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs`, {
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
        Alert.alert("Błąd", data.message || "Nie udało się pobrać zleceń.");
        return;
      }

      setJobs(data);
    } catch (error) {
      console.error("Jobs fetch error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, []),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Zarób Se</Text>

        <Text style={styles.subtitle}>
          Znajdź lokalne zlecenie w swojej okolicy
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color="#6B7280" />

        <TextInput
          placeholder="Szukaj zleceń..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {categories.map((category, index) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                index === 0 && styles.activeCategoryPill,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  index === 0 && styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.jobsList}
        >
          {jobs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Brak zleceń</Text>

              <Text style={styles.emptyText}>
                Na razie nie ma żadnych aktywnych zleceń.
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
                <View style={styles.jobTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{job.category}</Text>
                  </View>

                  <Text style={styles.price}>{job.budget} zł</Text>
                </View>

                <Text style={styles.jobTitle}>{job.title}</Text>

                <Text style={styles.jobDescription} numberOfLines={3}>
                  {job.description}
                </Text>

                <View style={styles.jobBottomRow}>
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color="#6B7280"
                    />

                    <Text style={styles.location}>{job.city}</Text>
                  </View>

                  <Text style={styles.detailsText}>Szczegóły</Text>
                </View>

                <View style={styles.authorRow}>
                  <Ionicons
                    name="person-circle-outline"
                    size={18}
                    color="#94A3B8"
                  />

                  <Text style={styles.authorText}>
                    {job.author?.firstName} {job.author?.lastName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    backgroundColor: "#F8FAFC",
  },

  header: {
    marginBottom: 22,
  },

  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2563EB",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
  },

  searchBox: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },

  categoriesWrapper: {
    height: 72,
    marginVertical: 18,
    justifyContent: "center",
  },

  categories: {
    gap: 10,
    paddingRight: 20,
    alignItems: "center",
  },

  categoryPill: {
    height: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  activeCategoryPill: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },

  activeCategoryText: {
    color: "#FFFFFF",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  jobsList: {
    paddingBottom: 30,
    gap: 14,
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },

  jobCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },

  categoryBadgeText: {
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

  jobDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },

  jobBottomRow: {
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

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  authorText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
});
