import { router } from "expo-router";
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

type UserProfile = {
  _id: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  skills: string[];
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
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

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Nie udało się pobrać profilu.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require("../../assets/images/undraw_friendly-guy-avatar_dqp5 (1).png")}
              style={styles.avatar}
            />
          </View>

          <Text style={styles.username}>@{user.username}</Text>

          <Text style={styles.description}>
            {user.bio || "Brak opisu profilu."}
          </Text>

          <Pressable
            style={styles.editButton}
            onPress={() => router.push("/profilesettings")}
          >
            <Text style={styles.editButtonText}>Edytuj profil</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Wyloguj</Text>
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Zleceń</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Ocena</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Opinie</Text>
          </View>
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
          <Text style={styles.sectionTitle}>Umiejętności</Text>

          <View style={styles.tagsContainer}>
            {user.skills.length > 0 ? (
              user.skills.map((skill) => (
                <View key={skill} style={styles.tag}>
                  <Text style={styles.tagText}>{skill}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.infoText}>Brak dodanych umiejętności.</Text>
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
    backgroundColor: "#F5F5FA",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 32,
  },

  avatarWrapper: {
    backgroundColor: "#ECEBFA",
    borderRadius: 999,
    padding: 18,
    marginBottom: 20,
  },

  avatar: {
    width: 150,
    height: 150,
  },

  username: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E2A5A",
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 12,
  },

  editButton: {
    marginTop: 20,
    backgroundColor: "#4F7BFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },

  editButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  logoutButton: {
    marginTop: 12,
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  logoutButtonText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 14,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 32,
  },

  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4F7BFF",
    marginBottom: 6,
  },

  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E2A5A",
    marginBottom: 14,
  },

  infoCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },

  infoText: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 24,
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tag: {
    backgroundColor: "#ECEBFA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },

  tagText: {
    color: "#4F7BFF",
    fontWeight: "600",
    fontSize: 13,
  },
});
