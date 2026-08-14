import { Link, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL } from "../constants/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Błąd logowania",
          data.message || "Nie udało się zalogować.",
        );

        return;
      }

      await SecureStore.setItemAsync("token", data.token);

      console.log("TOKEN ZAPISANY:", data.token);

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Login error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.heroSection}>
              <Image
                source={require("../assets/images/login.png")}
                style={styles.image}
              />

              <Text style={styles.title}>Zarabiaj lokalnie z ZaróbSe</Text>

              <Text style={styles.description}>
                Znajduj lokalne zlecenia i buduj swoją reputację w społeczności.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                placeholder="E-mail"
                placeholderTextColor="#bababa"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <TextInput
                placeholder="Hasło"
                placeholderTextColor="#bababa"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[
                  styles.loginButtonContainer,
                  loading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Logowanie..." : "Zaloguj"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Nie masz konta?</Text>

              <Link href="/register" style={styles.registerLink}>
                Zarejestruj się
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5FA",
    paddingHorizontal: 24,
  },

  keyboardView: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },

  content: {
    width: "100%",
    maxWidth: 320,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },

  image: {
    width: 300,
    height: 230,
    borderRadius: 24,
    marginBottom: 24,
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#1E2A5A",
    textAlign: "center",
  },

  description: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },

  form: {
    gap: 16,
  },

  input: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
  },

  buttonContainer: {
    marginTop: 24,
  },

  loginButtonContainer: {
    backgroundColor: "#4169E1",
    borderRadius: 16,
    shadowColor: "#4169E1",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  loginButtonDisabled: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: "white",
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "700",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 4,
  },

  registerText: {
    color: "#6B7280",
  },

  registerLink: {
    color: "#4169E1",
  },
});
