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

type JobStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  status: JobStatus;
  createdAt: string;
};

type ApplicationStatus = "pending" | "accepted" | "rejected";

type Application = {
  _id: string;
  status: ApplicationStatus;
  createdAt: string;
  job: {
    _id: string;
    title: string;
    description: string;
    category: string;
    city: string;
    budget: number;
    status: JobStatus;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
      city?: string;
    };
  };
};

type ActiveTab = "posted" | "applied";

const jobStatusLabels: Record<JobStatus, string> = {
  open: "Otwarte",
  assigned: "Przydzielone",
  in_progress: "W trakcie",
  completed: "Zakończone",
  cancelled: "Anulowane",
};

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Oczekuje",
  accepted: "Wybrano Ciebie",
  rejected: "Nie wybrano",
};

const getJobStatusColors = (status: JobStatus) => {
  switch (status) {
    case "open":
      return {
        backgroundColor: "#EFF6FF",
        textColor: "#2563EB",
      };

    case "assigned":
      return {
        backgroundColor: "#F3E8FF",
        textColor: "#7E22CE",
      };

    case "in_progress":
      return {
        backgroundColor: "#FFF7ED",
        textColor: "#D97706",
      };

    case "completed":
      return {
        backgroundColor: "#ECFDF5",
        textColor: "#16A34A",
      };

    case "cancelled":
      return {
        backgroundColor: "#FEF2F2",
        textColor: "#DC2626",
      };

    default:
      return {
        backgroundColor: "#F1F5F9",
        textColor: "#64748B",
      };
  }
};

const getApplicationStatusColors = (status: ApplicationStatus) => {
  switch (status) {
    case "pending":
      return {
        backgroundColor: "#FFF7ED",
        textColor: "#D97706",
      };

    case "accepted":
      return {
        backgroundColor: "#ECFDF5",
        textColor: "#16A34A",
      };

    case "rejected":
      return {
        backgroundColor: "#FEF2F2",
        textColor: "#DC2626",
      };

    default:
      return {
        backgroundColor: "#F1F5F9",
        textColor: "#64748B",
      };
  }
};

export default function MyJobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
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

      const [jobsResponse, applicationsResponse] = await Promise.all([
        fetch(`${API_URL}/api/jobs/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/api/jobs/applications/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const jobsData = await jobsResponse.json();
      const applicationsData = await applicationsResponse.json();

      if (!jobsResponse.ok) {
        Alert.alert(
          "Błąd",
          jobsData.message || "Nie udało się pobrać Twoich zleceń.",
        );
        return;
      }

      if (!applicationsResponse.ok) {
        Alert.alert(
          "Błąd",
          applicationsData.message || "Nie udało się pobrać Twoich zgłoszeń.",
        );
        return;
      }

      setJobs(jobsData);
      setApplications(applicationsData);
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
            jobs.map((job) => {
              const statusColors = getJobStatusColors(job.status);

              return (
                <TouchableOpacity
                  key={job._id}
                  style={styles.jobCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/job/[id]",
                      params: {
                        id: job._id,
                      },
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

                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.jobStatusBadge,
                        {
                          backgroundColor: statusColors.backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.jobStatusText,
                          {
                            color: statusColors.textColor,
                          },
                        ]}
                      >
                        {jobStatusLabels[job.status]}
                      </Text>
                    </View>
                  </View>

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
              );
            })
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {applications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="hand-left-outline" size={48} color="#94A3B8" />

              <Text style={styles.emptyTitle}>Brak zgłoszeń</Text>

              <Text style={styles.emptyText}>
                Nie zgłosiłeś się jeszcze do żadnego zlecenia.
              </Text>
            </View>
          ) : (
            applications.map((application) => {
              const applicationColors = getApplicationStatusColors(
                application.status,
              );

              const jobColors = getJobStatusColors(application.job.status);

              return (
                <TouchableOpacity
                  key={application._id}
                  style={styles.jobCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/job/[id]",
                      params: {
                        id: application.job._id,
                      },
                    })
                  }
                >
                  <View style={styles.topRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {application.job.category}
                      </Text>
                    </View>

                    <Text style={styles.price}>
                      {application.job.budget} zł
                    </Text>
                  </View>

                  <Text style={styles.jobTitle}>{application.job.title}</Text>

                  <Text style={styles.description} numberOfLines={2}>
                    {application.job.description}
                  </Text>

                  <View style={styles.statusesRow}>
                    <View
                      style={[
                        styles.applicationStatusBadge,
                        {
                          backgroundColor: applicationColors.backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.applicationStatusText,
                          {
                            color: applicationColors.textColor,
                          },
                        ]}
                      >
                        {applicationStatusLabels[application.status]}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.jobStatusBadge,
                        {
                          backgroundColor: jobColors.backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.jobStatusText,
                          {
                            color: jobColors.textColor,
                          },
                        ]}
                      >
                        {jobStatusLabels[application.job.status]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bottomRow}>
                    <View style={styles.locationRow}>
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color="#64748B"
                      />

                      <Text style={styles.location}>
                        {application.job.city}
                      </Text>
                    </View>

                    <Text style={styles.detailsText}>Szczegóły</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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

  statusRow: {
    marginTop: 14,
    flexDirection: "row",
  },

  statusesRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  jobStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  jobStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  applicationStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },

  applicationStatusText: {
    fontSize: 12,
    fontWeight: "700",
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
