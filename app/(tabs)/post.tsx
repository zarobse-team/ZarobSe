import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { API_URL } from "../../constants/api";

export default function PostJobScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateJob = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();
    const trimmedCity = city.trim();
    const numericBudget = Number(budget);

    if (
      !trimmedTitle ||
      !trimmedDescription ||
      !trimmedCategory ||
      !trimmedCity ||
      !budget.trim()
    ) {
      Alert.alert("Błąd", "Uzupełnij wszystkie pola.");
      return;
    }

    if (trimmedTitle.length > 100) {
      Alert.alert("Błąd", "Tytuł może mieć maksymalnie 100 znaków.");
      return;
    }

    if (trimmedDescription.length > 1000) {
      Alert.alert("Błąd", "Opis może mieć maksymalnie 1000 znaków.");
      return;
    }

    if (Number.isNaN(numericBudget) || numericBudget < 0) {
      Alert.alert("Błąd", "Podaj poprawny budżet.");
      return;
    }

    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        Alert.alert("Błąd", "Musisz być zalogowany.");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          category: trimmedCategory,
          city: trimmedCity,
          budget: numericBudget,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        data = {
          message: "Serwer zwrócił nieprawidłową odpowiedź.",
        };
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się utworzyć zlecenia.");
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało utworzone.", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);

      setTitle("");
      setDescription("");
      setCategory("");
      setCity("");
      setBudget("");
    } catch (error) {
      console.error("Create job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Dodaj zlecenie</Text>

          <Text style={styles.subtitle}>
            Opisz, czego potrzebujesz i znajdź osobę do wykonania zadania.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Tytuł</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Np. Montaż szafki"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={100}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Opis</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Opisz dokładnie, czego potrzebujesz"
              placeholderTextColor="#9CA3AF"
              style={styles.descriptionInput}
              multiline
              maxLength={1000}
            />
            <Text style={styles.counter}>{description.length}/1000</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Kategoria</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Np. Montaż, Transport, Sprzątanie"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Miejscowość</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Np. Kraków"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              maxLength={80}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Budżet</Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="Np. 150"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              keyboardType="numeric"
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateJob}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Dodaj zlecenie</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5FA",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1E2A5A",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 10,
  },

  input: {
    fontSize: 16,
    color: "#1F2937",
  },

  descriptionInput: {
    fontSize: 16,
    color: "#1F2937",
    minHeight: 120,
    textAlignVertical: "top",
  },

  counter: {
    marginTop: 8,
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#9CA3AF",
  },

  button: {
    backgroundColor: "#4F7BFF",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
