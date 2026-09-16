import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
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

type CurrentUser = {
  _id: string;
};

const statusLabels: Record<string, string> = {
  open: "Otwarte",
  assigned: "Przydzielone",
  in_progress: "W trakcie",
  completed: "Zakończone",
  cancelled: "Anulowane",
};

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const [jobResponse, userResponse] = await Promise.all([
        fetch(`${API_URL}/api/jobs/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const jobData = await jobResponse.json();
      const userData = (await userResponse.json()) as CurrentUser;

      if (!jobResponse.ok) {
        Alert.alert(
          "Błąd",
          jobData.message || "Nie udało się pobrać zlecenia.",
        );
        return;
      }

      if (!userResponse.ok) {
        Alert.alert("Błąd", "Nie udało się pobrać danych użytkownika.");
        return;
      }

      setJob(jobData);
      setCurrentUserId(userData._id);
    } catch (error) {
      console.error("Job details error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchData();
      }

      setMenuVisible(false);
    }, [id]),
  );

  const deleteJob = async () => {
    try {
      setDeleting(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        method: "DELETE",
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
        Alert.alert("Błąd", data.message || "Nie udało się usunąć zlecenia.");
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało usunięte.", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/my-jobs"),
        },
      ]);
    } catch (error) {
      console.error("Delete job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    setMenuVisible(false);

    Alert.alert(
      "Usuń zlecenie",
      "Czy na pewno chcesz usunąć to zlecenie? Tej operacji nie można cofnąć.",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Usuń",
          style: "destructive",
          onPress: deleteJob,
        },
      ],
    );
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <Text>Nie udało się pobrać zlecenia.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = job.author?._id === currentUserId;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1E2A5A" />

            <Text style={styles.backText}>Wróć</Text>
          </Pressable>

          {isOwner && (
            <View style={styles.menuWrapper}>
              <Pressable
                style={styles.menuButton}
                onPress={() => setMenuVisible((current) => !current)}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={26}
                  color="#1E2A5A"
                />
              </Pressable>

              {menuVisible && (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);

                      router.push({
                        pathname: "/job/edit/[id]",
                        params: { id: job._id },
                      });
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#1F2937" />

                    <Text style={styles.menuItemText}>Edytuj</Text>
                  </Pressable>

                  <View style={styles.menuDivider} />

                  <Pressable
                    style={styles.menuItem}
                    onPress={handleDelete}
                    disabled={deleting}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />

                    <Text style={styles.deleteMenuText}>Usuń</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.topRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{job.category}</Text>
          </View>

          <Text style={styles.price}>{job.budget} zł</Text>
        </View>

        <Text style={styles.title}>{job.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={18} color="#64748B" />

            <Text style={styles.location}>{job.city}</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {statusLabels[job.status] ?? job.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opis zlecenia</Text>

          <View style={styles.card}>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zleceniodawca</Text>

          <Pressable
            style={styles.authorCard}
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: { id: job.author._id },
              })
            }
          >
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
          </Pressable>
        </View>

        {!isOwner && (
          <Pressable
            style={styles.applyButton}
            onPress={() =>
              Alert.alert(
                "Jeszcze chwila",
                "System zgłoszeń dodamy w kolejnym etapie.",
              )
            }
          >
            <Text style={styles.applyButtonText}>Zgłoś się do zlecenia</Text>
          </Pressable>
        )}
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    zIndex: 10,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E2A5A",
  },

  menuWrapper: {
    position: "relative",
    zIndex: 20,
  },

  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  dropdownMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 6,
    zIndex: 100,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },

  deleteMenuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
  },

  menuDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
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

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "600",
  },

  statusBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
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
