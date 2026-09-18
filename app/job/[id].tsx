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

type ApplicationResponse = {
  applied: boolean;
  application: {
    _id: string;
    status: "pending" | "accepted" | "rejected";
  } | null;
};

type JobApplication = {
  _id: string;
  status: "pending" | "accepted" | "rejected";
  applicant: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    city?: string;
    bio?: string;
  };
};

const statusLabels: Record<string, string> = {
  open: "Otwarte",
  assigned: "Przydzielone",
  in_progress: "W trakcie",
  completed: "Zakończone",
  cancelled: "Anulowane",
};

const applicationStatusLabels: Record<string, string> = {
  pending: "Oczekuje",
  accepted: "Zaakceptowano",
  rejected: "Odrzucono",
};

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(
    null,
  );

  const [withdrawing, setWithdrawing] = useState(false);

  const [applications, setApplications] = useState<JobApplication[]>([]);

  const [acceptingApplicationId, setAcceptingApplicationId] = useState<
    string | null
  >(null);

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

      const isOwner = jobData.author?._id === userData._id;

      if (isOwner) {
        const applicationsResponse = await fetch(
          `${API_URL}/api/jobs/${id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (applicationsResponse.ok) {
          const applicationsData = await applicationsResponse.json();
          setApplications(applicationsData);
        } else {
          setApplications([]);
        }

        setHasApplied(false);
        setApplicationStatus(null);
      } else {
        setApplications([]);

        const applicationResponse = await fetch(
          `${API_URL}/api/jobs/${id}/application`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const applicationData =
          (await applicationResponse.json()) as ApplicationResponse;

        if (applicationResponse.ok) {
          setHasApplied(applicationData.applied);
          setApplicationStatus(applicationData.application?.status ?? null);
        }
      }
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

  const handleApply = async () => {
    try {
      setApplying(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/apply`, {
        method: "POST",
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
        Alert.alert("Błąd", data.message || "Nie udało się wysłać zgłoszenia.");
        return;
      }

      setHasApplied(true);
      setApplicationStatus("pending");

      Alert.alert("Gotowe", "Zgłoszenie zostało wysłane.");
    } catch (error) {
      console.error("Apply to job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async () => {
    Alert.alert(
      "Wycofaj zgłoszenie",
      "Czy na pewno chcesz wycofać swoje zgłoszenie?",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Wycofaj",
          style: "destructive",
          onPress: async () => {
            try {
              setWithdrawing(true);

              const token = await SecureStore.getItemAsync("token");

              if (!token) {
                router.replace("/login");
                return;
              }

              const response = await fetch(
                `${API_URL}/api/jobs/${id}/application`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              let data;

              try {
                data = await response.json();
              } catch {
                data = {};
              }

              if (!response.ok) {
                Alert.alert(
                  "Błąd",
                  data.message || "Nie udało się wycofać zgłoszenia.",
                );
                return;
              }

              setHasApplied(false);
              setApplicationStatus(null);

              Alert.alert("Gotowe", "Zgłoszenie zostało wycofane.");
            } catch (error) {
              console.error("Withdraw application error:", error);

              Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ],
    );
  };

  const acceptApplication = async (applicationId: string) => {
    try {
      setAcceptingApplicationId(applicationId);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/jobs/applications/${applicationId}/accept`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let data;

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się wybrać kandydata.");
        return;
      }

      await fetchData();

      Alert.alert("Gotowe", "Kandydat został wybrany jako wykonawca.");
    } catch (error) {
      console.error("Accept application error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setAcceptingApplicationId(null);
    }
  };

  const handleAcceptApplication = (
    applicationId: string,
    firstName: string,
    lastName: string,
  ) => {
    Alert.alert(
      "Wybierz wykonawcę",
      `Czy na pewno chcesz wybrać ${firstName} ${lastName} do wykonania tego zlecenia?`,
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Wybierz",
          onPress: () => acceptApplication(applicationId),
        },
      ],
    );
  };

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

            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>
                {job.author?.firstName} {job.author?.lastName}
              </Text>

              {job.author?.city ? (
                <Text style={styles.authorCity}>{job.author.city}</Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {isOwner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kandydaci ({applications.length})
            </Text>

            {applications.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  Nikt jeszcze nie zgłosił się do tego zlecenia.
                </Text>
              </View>
            ) : (
              applications.map((application) => (
                <View key={application._id} style={styles.applicantCard}>
                  <Pressable
                    style={styles.applicantProfileRow}
                    onPress={() =>
                      router.push({
                        pathname: "/user/[id]",
                        params: {
                          id: application.applicant._id,
                        },
                      })
                    }
                  >
                    {application.applicant.avatar ? (
                      <Image
                        source={{
                          uri: application.applicant.avatar,
                        }}
                        style={styles.applicantAvatar}
                      />
                    ) : (
                      <View style={styles.applicantAvatarPlaceholder}>
                        <Ionicons name="person" size={24} color="#64748B" />
                      </View>
                    )}

                    <View style={styles.applicantInfo}>
                      <Text style={styles.applicantName}>
                        {application.applicant.firstName}{" "}
                        {application.applicant.lastName}
                      </Text>

                      {application.applicant.city ? (
                        <Text style={styles.applicantCity}>
                          {application.applicant.city}
                        </Text>
                      ) : null}

                      <Text style={styles.applicantStatus}>
                        {applicationStatusLabels[application.status] ??
                          application.status}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#94A3B8"
                    />
                  </Pressable>

                  {application.status === "pending" &&
                    job.status === "open" && (
                      <Pressable
                        style={[
                          styles.selectApplicantButton,
                          acceptingApplicationId !== null &&
                            styles.selectApplicantButtonDisabled,
                        ]}
                        disabled={acceptingApplicationId !== null}
                        onPress={() =>
                          handleAcceptApplication(
                            application._id,
                            application.applicant.firstName,
                            application.applicant.lastName,
                          )
                        }
                      >
                        {acceptingApplicationId === application._id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.selectApplicantButtonText}>
                            Wybierz kandydata
                          </Text>
                        )}
                      </Pressable>
                    )}
                </View>
              ))
            )}
          </View>
        )}

        {!isOwner && (
          <View style={styles.applicationSection}>
            {hasApplied && applicationStatus && (
              <View style={styles.applicationMessageBox}>
                {applicationStatus === "pending" && (
                  <>
                    <Ionicons name="time-outline" size={26} color="#D97706" />

                    <View style={styles.applicationMessageContent}>
                      <Text style={styles.applicationPendingTitle}>
                        Oczekuje na decyzję
                      </Text>

                      <Text style={styles.applicationMessageText}>
                        Zleceniodawca jeszcze nie wybrał wykonawcy.
                      </Text>
                    </View>
                  </>
                )}

                {applicationStatus === "accepted" && (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={28}
                      color="#16A34A"
                    />

                    <View style={styles.applicationMessageContent}>
                      <Text style={styles.applicationAcceptedTitle}>
                        Zostałeś wybrany
                      </Text>

                      <Text style={styles.applicationMessageText}>
                        Zleceniodawca wybrał Cię do wykonania tego zlecenia.
                      </Text>
                    </View>
                  </>
                )}

                {applicationStatus === "rejected" && (
                  <>
                    <Ionicons name="close-circle" size={28} color="#DC2626" />

                    <View style={styles.applicationMessageContent}>
                      <Text style={styles.applicationRejectedTitle}>
                        Nie wybrano Twojego zgłoszenia
                      </Text>

                      <Text style={styles.applicationMessageText}>
                        Zleceniodawca wybrał innego wykonawcę.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {!hasApplied ? (
              <Pressable
                style={[
                  styles.applyButton,
                  applying && styles.applyButtonDisabled,
                ]}
                onPress={handleApply}
                disabled={applying}
              >
                <Text style={styles.applyButtonText}>
                  {applying ? "Wysyłanie..." : "Zgłoś się do zlecenia"}
                </Text>
              </Pressable>
            ) : applicationStatus === "pending" ? (
              <Pressable
                style={[
                  styles.withdrawButton,
                  withdrawing && styles.applyButtonDisabled,
                ]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                <Text style={styles.withdrawButtonText}>
                  {withdrawing ? "Wycofywanie..." : "Wycofaj zgłoszenie"}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.applicationLocked}>
                <Text style={styles.applicationLockedText}>
                  Zgłoszenie zostało już rozpatrzone.
                </Text>
              </View>
            )}
          </View>
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

  emptyText: {
    fontSize: 15,
    color: "#64748B",
  },

  authorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  authorInfo: {
    flex: 1,
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

  applicantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  applicantProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  applicantAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  applicantAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  applicantInfo: {
    flex: 1,
  },

  applicantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },

  applicantCity: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 3,
  },

  applicantStatus: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 5,
  },

  selectApplicantButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },

  selectApplicantButtonDisabled: {
    opacity: 0.55,
  },

  selectApplicantButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  applicationSection: {
    marginTop: 32,
  },

  applicationMessageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },

  applicationMessageContent: {
    flex: 1,
  },

  applicationPendingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D97706",
  },

  applicationAcceptedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
  },

  applicationRejectedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },

  applicationMessageText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },

  applyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  applyButtonDisabled: {
    opacity: 0.55,
  },

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  withdrawButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },

  withdrawButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700",
  },

  applicationLocked: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: "center",
  },

  applicationLockedText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});
