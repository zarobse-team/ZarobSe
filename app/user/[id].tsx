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

type ReviewUser = {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

type ReviewJob = {
  _id: string;
  title: string;
};

type Review = {
  _id: string;
  rating: number;
  comment?: string;
  reviewer: ReviewUser;
  job?: ReviewJob;
  createdAt: string;
};

type ReviewsResponse = {
  reviews: Review[];
  averageRating: number;
  reviewsCount: number;
};

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<PublicUser | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const [userResponse, reviewsResponse] = await Promise.all([
        fetch(`${API_URL}/api/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),

        fetch(`${API_URL}/api/users/${id}/reviews`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      let userData;
      let reviewsData: ReviewsResponse | null = null;

      try {
        userData = await userResponse.json();
      } catch {
        userData = {};
      }

      try {
        reviewsData = await reviewsResponse.json();
      } catch {
        reviewsData = null;
      }

      if (!userResponse.ok) {
        Alert.alert(
          "Błąd",
          userData.message || "Nie udało się pobrać profilu użytkownika.",
        );
        return;
      }

      setUser(userData);

      if (reviewsResponse.ok && reviewsData) {
        setReviews(reviewsData.reviews ?? []);
        setAverageRating(reviewsData.averageRating ?? 0);
        setReviewsCount(reviewsData.reviewsCount ?? 0);
      } else {
        setReviews([]);
        setAverageRating(0);
        setReviewsCount(0);
      }
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
            <Image
              source={{
                uri: user.avatar,
              }}
              style={styles.avatar}
            />
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
              {reviewsCount > 0 ? averageRating.toFixed(1) : "Brak ocen"}
            </Text>

            {reviewsCount > 0 && (
              <Text style={styles.reviewsText}>
                ({reviewsCount} {reviewsCount === 1 ? "opinia" : "opinii"})
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
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitleNoMargin}>Opinie</Text>

            {reviewsCount > 0 && (
              <View style={styles.reviewsSummary}>
                <Ionicons name="star" size={17} color="#F59E0B" />

                <Text style={styles.reviewsSummaryText}>
                  {averageRating.toFixed(1)}
                </Text>

                <Text style={styles.reviewsSummaryCount}>· {reviewsCount}</Text>
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyReviews}>
                <Ionicons name="star-outline" size={34} color="#94A3B8" />

                <Text style={styles.emptyText}>
                  Ten użytkownik nie ma jeszcze opinii.
                </Text>
              </View>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <View style={styles.reviewerRow}>
                    {review.reviewer?.avatar ? (
                      <Image
                        source={{
                          uri: review.reviewer.avatar,
                        }}
                        style={styles.reviewerAvatar}
                      />
                    ) : (
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#64748B" />
                      </View>
                    )}

                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.firstName} {review.reviewer?.lastName}
                      </Text>

                      <Text style={styles.reviewDate}>
                        {formatDate(review.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= review.rating ? "star" : "star-outline"}
                      size={19}
                      color="#F59E0B"
                    />
                  ))}

                  <Text style={styles.reviewRating}>{review.rating}/5</Text>
                </View>

                {review.comment?.trim() ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : (
                  <Text style={styles.noComment}>Bez komentarza</Text>
                )}

                {review.job?.title ? (
                  <View style={styles.jobRow}>
                    <Ionicons
                      name="briefcase-outline"
                      size={15}
                      color="#64748B"
                    />

                    <Text style={styles.jobTitle} numberOfLines={1}>
                      {review.job.title}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
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

  sectionTitleNoMargin: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E2A5A",
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

  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  reviewsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reviewsSummaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },

  reviewsSummaryCount: {
    fontSize: 14,
    color: "#64748B",
  },

  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },

  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  reviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  reviewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  reviewerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewerInfo: {
    marginLeft: 12,
    flex: 1,
  },

  reviewerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  reviewDate: {
    marginTop: 3,
    fontSize: 12,
    color: "#94A3B8",
  },

  starsRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  reviewRating: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },

  reviewComment: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
  },

  noComment: {
    marginTop: 12,
    fontSize: 14,
    fontStyle: "italic",
    color: "#94A3B8",
  },

  jobRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  jobTitle: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
  },

  emptyReviews: {
    alignItems: "center",
    paddingVertical: 8,
  },

  emptyText: {
    marginTop: 8,
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
});
