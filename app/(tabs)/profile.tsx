import { router, useFocusEffect } from "expo-router";
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

type UserProfile = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  avatar: string;
  skills: string[];
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się pobrać profilu.");
        return;
      }

      setUser(data);
    } catch (error) {
      console.error("Profile error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("token");
    router.replace("/welcome");
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
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
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={
                user.avatar
                  ? { uri: user.avatar }
                  : require("../../assets/images/undraw_friendly-guy-avatar_dqp5 (1).png")
              }
              style={styles.avatar}
            />
          </View>

          <Text style={styles.fullName}>
            {user.firstName} {user.lastName}
          </Text>

          {user.city ? <Text style={styles.location}>{user.city}</Text> : null}

          <Pressable
            style={styles.editButton}
            onPress={() => router.push("/profilesettings")}
          >
            <Text style={styles.editButtonText}>Edytuj profil</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>O mnie</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {user.bio || "Brak informacji o użytkowniku."}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane kontaktowe</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-mail</Text>

              <Text style={styles.infoText}>{user.email}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Numer telefonu</Text>

              <Text style={styles.infoText}>{user.phone}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Miejscowość</Text>

              <Text style={styles.infoText}>{user.city || "Nie podano"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Umiejętności</Text>

          <View style={styles.infoCard}>
            {user.skills && user.skills.length > 0 ? (
              <View style={styles.tagsContainer}>
                {user.skills.map((skill, index) => (
                  <View key={`${skill}-${index}`} style={styles.tag}>
                    <Text style={styles.tagText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.infoText}>Brak dodanych umiejętności.</Text>
            )}
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Wyloguj</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5FA",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 34,
  },

  avatarWrapper: {
    backgroundColor: "#ECEBFA",
    borderRadius: 999,
    padding: 5,
    marginBottom: 16,
  },

  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },

  fullName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E2A5A",
    textAlign: "center",
  },

  location: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 18,
  },

  editButton: {
    backgroundColor: "#4F7BFF",
    paddingHorizontal: 26,
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 18,
  },

  editButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  section: {
    marginBottom: 26,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E2A5A",
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
  },

  infoRow: {
    gap: 4,
  },

  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  infoText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 23,
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEF3",
    marginVertical: 15,
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tag: {
    backgroundColor: "#ECEBFA",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },

  tagText: {
    color: "#4F5DA8",
    fontWeight: "600",
    fontSize: 14,
  },

  logoutButton: {
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 6,
  },

  logoutButtonText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 16,
  },
});
