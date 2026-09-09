import { Link, router } from "expo-router";
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

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !phone || !password) {
      Alert.alert("Błąd", "Uzupełnij wszystkie pola.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert("Błąd", "Podaj poprawny adres email.");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Błąd", "Hasło musi mieć co najmniej 8 znaków.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: normalizedEmail,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Błąd rejestracji",
          data.message || "Nie udało się utworzyć konta.",
        );
        return;
      }

      Alert.alert("Konto utworzone", "Możesz się teraz zalogować.", [
        {
          text: "OK",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error) {
      console.error("Register error:", error);

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

              <Text style={styles.title}>Dołącz do społeczności ZaróbSe</Text>

              <Text style={styles.description}>
                Twórz lokalne zlecenia, pomagaj innym i buduj swoją reputację.
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                placeholder="Imię"
                placeholderTextColor="#bababa"
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <TextInput
                placeholder="Nazwisko"
                placeholderTextColor="#bababa"
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />

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
                placeholder="Numer telefonu"
                placeholderTextColor="#bababa"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
                  styles.registerButton,
                  loading && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? "Rejestrowanie..." : "Zarejestruj się"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Masz już konto?</Text>

              <Link href="/login" style={styles.loginLink}>
                Zaloguj się
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
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
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

  registerButton: {
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

  registerButtonDisabled: {
    opacity: 0.6,
  },

  registerButtonText: {
    color: "white",
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "700",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 4,
  },

  loginText: {
    color: "#6B7280",
  },

  loginLink: {
    color: "#4169E1",
  },
});
