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

type UserData = {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  city?: string;
  bio?: string;
};

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
  completionRequested: boolean;
  author: UserData;
  assignedTo?: UserData | null;
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
  applicant: UserData;
  createdAt: string;
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

  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [applicationStatus, setApplicationStatus] = useState<
    "pending" | "accepted" | "rejected" | null
  >(null);

  const [withdrawing, setWithdrawing] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  const [acceptingApplicationId, setAcceptingApplicationId] = useState<
    string | null
  >(null);

  const [startingJob, setStartingJob] = useState(false);
  const [requestingCompletion, setRequestingCompletion] = useState(false);
  const [completingJob, setCompletingJob] = useState(false);
  const [cancellingJob, setCancellingJob] = useState(false);

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
        setHasApplied(false);
        setApplicationStatus(null);

        const applicationsResponse = await fetch(
          `${API_URL}/api/jobs/${id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const applicationsData = await applicationsResponse.json();

        if (applicationsResponse.ok) {
          setApplications(applicationsData);
        } else {
          setApplications([]);
        }
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

  const withdrawApplication = async () => {
    try {
      setWithdrawing(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/application`, {
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
  };

  const handleWithdrawApplication = () => {
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
          onPress: withdrawApplication,
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

      Alert.alert("Gotowe", "Kandydat został wybrany.");

      await fetchData();
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
      `Czy na pewno chcesz wybrać ${firstName} ${lastName} do tego zlecenia?`,
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

  const startJob = async () => {
    try {
      setStartingJob(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/start`, {
        method: "PATCH",
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
          data.message || "Nie udało się rozpocząć zlecenia.",
        );
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało rozpoczęte.");

      await fetchData();
    } catch (error) {
      console.error("Start job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setStartingJob(false);
    }
  };

  const handleStartJob = () => {
    Alert.alert(
      "Rozpocznij zlecenie",
      "Czy na pewno chcesz rozpocząć realizację tego zlecenia?",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Rozpocznij",
          onPress: startJob,
        },
      ],
    );
  };

  const requestCompletion = async () => {
    try {
      setRequestingCompletion(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/jobs/${id}/request-completion`,
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
        Alert.alert(
          "Błąd",
          data.message || "Nie udało się oznaczyć zlecenia jako wykonanego.",
        );
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało oznaczone jako wykonane.");

      await fetchData();
    } catch (error) {
      console.error("Request completion error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setRequestingCompletion(false);
    }
  };

  const handleRequestCompletion = () => {
    Alert.alert(
      "Oznacz jako wykonane",
      "Czy na pewno zakończyłeś realizację tego zlecenia?",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Oznacz jako wykonane",
          onPress: requestCompletion,
        },
      ],
    );
  };

  const completeJob = async () => {
    try {
      setCompletingJob(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/complete`, {
        method: "PATCH",
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
          data.message || "Nie udało się zakończyć zlecenia.",
        );
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało zakończone.");

      await fetchData();
    } catch (error) {
      console.error("Complete job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setCompletingJob(false);
    }
  };

  const handleCompleteJob = () => {
    Alert.alert(
      "Potwierdź zakończenie",
      "Czy potwierdzasz, że zlecenie zostało wykonane?",
      [
        {
          text: "Anuluj",
          style: "cancel",
        },
        {
          text: "Potwierdź",
          onPress: completeJob,
        },
      ],
    );
  };

  const cancelJob = async () => {
    try {
      setCancellingJob(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}/cancel`, {
        method: "PATCH",
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
        Alert.alert("Błąd", data.message || "Nie udało się anulować zlecenia.");
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało anulowane.");

      await fetchData();
    } catch (error) {
      console.error("Cancel job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setCancellingJob(false);
    }
  };

  const handleCancelJob = () => {
    Alert.alert(
      "Anuluj zlecenie",
      "Czy na pewno chcesz anulować to zlecenie? Zlecenie pozostanie w historii, ale nie będzie już realizowane.",
      [
        {
          text: "Nie",
          style: "cancel",
        },
        {
          text: "Anuluj zlecenie",
          style: "destructive",
          onPress: cancelJob,
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

  const isAssignedWorker = job.assignedTo?._id === currentUserId;

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

          {isOwner && job.status === "open" && (
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
                        params: {
                          id: job._id,
                        },
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
            style={styles.personCard}
            onPress={() =>
              router.push({
                pathname: "/user/[id]",
                params: {
                  id: job.author._id,
                },
              })
            }
          >
            {job.author?.avatar ? (
              <Image
                source={{
                  uri: job.author.avatar,
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color="#64748B" />
              </View>
            )}

            <View style={styles.personInfo}>
              <Text style={styles.personName}>
                {job.author?.firstName} {job.author?.lastName}
              </Text>

              {job.author?.city ? (
                <Text style={styles.personCity}>{job.author.city}</Text>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {job.assignedTo && job.status !== "open" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wybrany wykonawca</Text>

            <Pressable
              style={styles.personCard}
              onPress={() =>
                router.push({
                  pathname: "/user/[id]",
                  params: {
                    id: job.assignedTo!._id,
                  },
                })
              }
            >
              {job.assignedTo.avatar ? (
                <Image
                  source={{
                    uri: job.assignedTo.avatar,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color="#64748B" />
                </View>
              )}

              <View style={styles.personInfo}>
                <Text style={styles.personName}>
                  {job.assignedTo.firstName} {job.assignedTo.lastName}
                </Text>

                {job.assignedTo.city ? (
                  <Text style={styles.personCity}>{job.assignedTo.city}</Text>
                ) : null}
              </View>

              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </Pressable>
          </View>
        )}

        {isOwner && job.status === "open" && applications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kandydaci</Text>

            {applications.map((application) => (
              <View key={application._id} style={styles.applicationCard}>
                <Pressable
                  style={styles.applicantRow}
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
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </Pressable>

                {application.status === "pending" && (
                  <Pressable
                    style={[
                      styles.selectApplicantButton,
                      acceptingApplicationId !== null && styles.buttonDisabled,
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
                    <Text style={styles.selectApplicantButtonText}>
                      {acceptingApplicationId === application._id
                        ? "Wybieranie..."
                        : "Wybierz kandydata"}
                    </Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {isOwner && job.status === "open" && applications.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kandydaci</Text>

            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color="#94A3B8" />

              <Text style={styles.emptyText}>
                Nikt jeszcze nie zgłosił się do tego zlecenia.
              </Text>
            </View>
          </View>
        )}

        {isAssignedWorker && job.status === "assigned" && (
          <View style={styles.jobActionSection}>
            <View style={styles.jobActionCard}>
              <Ionicons
                name="checkmark-circle-outline"
                size={38}
                color="#16A34A"
              />

              <Text style={styles.jobActionTitle}>Zostałeś wybrany</Text>

              <Text style={styles.jobActionText}>
                Zleceniodawca wybrał Cię do realizacji tego zlecenia. Gdy
                będziesz gotowy, rozpocznij realizację.
              </Text>

              <Pressable
                style={[
                  styles.startJobButton,
                  startingJob && styles.buttonDisabled,
                ]}
                onPress={handleStartJob}
                disabled={startingJob}
              >
                <Text style={styles.startJobButtonText}>
                  {startingJob ? "Rozpoczynanie..." : "Rozpocznij zlecenie"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isAssignedWorker && job.status === "in_progress" && (
          <View style={styles.jobActionSection}>
            <View style={styles.progressCard}>
              <Ionicons
                name={
                  job.completionRequested ? "time-outline" : "hammer-outline"
                }
                size={36}
                color={job.completionRequested ? "#D97706" : "#2563EB"}
              />

              <Text style={styles.jobActionTitle}>
                {job.completionRequested
                  ? "Czekamy na potwierdzenie"
                  : "Zlecenie jest w trakcie"}
              </Text>

              <Text style={styles.jobActionText}>
                {job.completionRequested
                  ? "Oznaczyłeś zlecenie jako wykonane. Zleceniodawca musi teraz potwierdzić zakończenie."
                  : "Gdy zakończysz realizację, oznacz zlecenie jako wykonane."}
              </Text>

              {!job.completionRequested && (
                <Pressable
                  style={[
                    styles.completeRequestButton,
                    requestingCompletion && styles.buttonDisabled,
                  ]}
                  onPress={handleRequestCompletion}
                  disabled={requestingCompletion}
                >
                  <Text style={styles.completeRequestButtonText}>
                    {requestingCompletion
                      ? "Zapisywanie..."
                      : "Oznacz jako wykonane"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {isOwner &&
          job.status === "in_progress" &&
          !job.completionRequested && (
            <View style={styles.jobActionSection}>
              <View style={styles.progressCard}>
                <Ionicons name="hammer-outline" size={36} color="#2563EB" />

                <Text style={styles.jobActionTitle}>
                  Zlecenie jest w trakcie
                </Text>

                <Text style={styles.jobActionText}>
                  Wykonawca realizuje zlecenie. Gdy oznaczy pracę jako wykonaną,
                  pojawi się tutaj możliwość potwierdzenia zakończenia.
                </Text>
              </View>
            </View>
          )}

        {isOwner && job.status === "in_progress" && job.completionRequested && (
          <View style={styles.jobActionSection}>
            <View style={styles.completionConfirmCard}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={40}
                color="#16A34A"
              />

              <Text style={styles.jobActionTitle}>
                Wykonawca zakończył pracę
              </Text>

              <Text style={styles.jobActionText}>
                Wykonawca oznaczył zlecenie jako wykonane. Jeśli wszystko się
                zgadza, potwierdź zakończenie.
              </Text>

              <Pressable
                style={[
                  styles.confirmCompletionButton,
                  completingJob && styles.buttonDisabled,
                ]}
                onPress={handleCompleteJob}
                disabled={completingJob}
              >
                <Text style={styles.confirmCompletionButtonText}>
                  {completingJob ? "Potwierdzanie..." : "Potwierdź zakończenie"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isOwner &&
          (job.status === "assigned" || job.status === "in_progress") && (
            <View style={styles.cancelSection}>
              <Pressable
                style={[
                  styles.cancelJobButton,
                  cancellingJob && styles.buttonDisabled,
                ]}
                onPress={handleCancelJob}
                disabled={cancellingJob}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={21}
                  color="#DC2626"
                />

                <Text style={styles.cancelJobButtonText}>
                  {cancellingJob ? "Anulowanie..." : "Anuluj zlecenie"}
                </Text>
              </Pressable>
            </View>
          )}

        {job.status === "cancelled" && (
          <View style={styles.jobActionSection}>
            <View style={styles.cancelledCard}>
              <Ionicons name="close-circle" size={42} color="#DC2626" />

              <Text style={styles.jobActionTitle}>Zlecenie anulowane</Text>

              <Text style={styles.jobActionText}>
                To zlecenie zostało anulowane przez zleceniodawcę.
              </Text>
            </View>
          </View>
        )}

        {job.status === "completed" && (
          <View style={styles.jobActionSection}>
            <View style={styles.completedCard}>
              <Ionicons name="checkmark-circle" size={42} color="#16A34A" />

              <Text style={styles.jobActionTitle}>Zlecenie zakończone</Text>

              <Text style={styles.jobActionText}>
                Realizacja tego zlecenia została zakończona i potwierdzona.
              </Text>
            </View>
          </View>
        )}

        {!isOwner && (
          <View style={styles.applicationSection}>
            {hasApplied && applicationStatus === "pending" && (
              <>
                <View style={styles.applicationMessageBox}>
                  <Ionicons name="time-outline" size={28} color="#D97706" />

                  <View style={styles.applicationMessageContent}>
                    <Text style={styles.applicationPendingTitle}>
                      Oczekuje na decyzję
                    </Text>

                    <Text style={styles.applicationMessageText}>
                      Twoje zgłoszenie zostało wysłane. Zleceniodawca nie wybrał
                      jeszcze wykonawcy.
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.withdrawButton,
                    withdrawing && styles.buttonDisabled,
                  ]}
                  disabled={withdrawing}
                  onPress={handleWithdrawApplication}
                >
                  <Text style={styles.withdrawButtonText}>
                    {withdrawing ? "Wycofywanie..." : "Wycofaj zgłoszenie"}
                  </Text>
                </Pressable>
              </>
            )}

            {hasApplied &&
              applicationStatus === "accepted" &&
              !isAssignedWorker && (
                <View style={styles.applicationMessageBox}>
                  <Ionicons name="checkmark-circle" size={30} color="#16A34A" />

                  <View style={styles.applicationMessageContent}>
                    <Text style={styles.applicationAcceptedTitle}>
                      Zostałeś wybrany
                    </Text>

                    <Text style={styles.applicationMessageText}>
                      Zleceniodawca wybrał Twoje zgłoszenie.
                    </Text>
                  </View>
                </View>
              )}

            {hasApplied && applicationStatus === "rejected" && (
              <View style={styles.applicationMessageBox}>
                <Ionicons
                  name="close-circle-outline"
                  size={30}
                  color="#DC2626"
                />

                <View style={styles.applicationMessageContent}>
                  <Text style={styles.applicationRejectedTitle}>
                    Nie wybrano Twojego zgłoszenia
                  </Text>

                  <Text style={styles.applicationMessageText}>
                    Zleceniodawca zdecydował się na innego wykonawcę.
                  </Text>
                </View>
              </View>
            )}

            {!hasApplied && job.status === "open" && (
              <Pressable
                style={[styles.applyButton, applying && styles.buttonDisabled]}
                onPress={handleApply}
                disabled={applying}
              >
                <Text style={styles.applyButtonText}>
                  {applying ? "Wysyłanie..." : "Zgłoś się do zlecenia"}
                </Text>
              </Pressable>
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

  personCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  personInfo: {
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

  personName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },

  personCity: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },

  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  applicantRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  applicantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  applicantAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  applicantInfo: {
    flex: 1,
    marginLeft: 12,
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

  selectApplicantButton: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },

  selectApplicantButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
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

  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  withdrawButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  withdrawButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "700",
  },

  jobActionSection: {
    marginTop: 30,
  },

  jobActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  completionConfirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  completedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  cancelledCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },

  jobActionTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  jobActionText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },

  startJobButton: {
    width: "100%",
    marginTop: 18,
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  startJobButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  completeRequestButton: {
    width: "100%",
    marginTop: 18,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  completeRequestButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  confirmCompletionButton: {
    width: "100%",
    marginTop: 18,
    backgroundColor: "#16A34A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  confirmCompletionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelSection: {
    marginTop: 18,
  },

  cancelJobButton: {
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  cancelJobButtonText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "700",
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});
