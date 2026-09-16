import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
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

import { API_URL } from "../../../constants/api";

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
};

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchJob = async () => {
    try {
      setLoading(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as Job;

      if (!response.ok) {
        Alert.alert("Błąd", "Nie udało się pobrać zlecenia.");
        return;
      }

      setTitle(data.title || "");
      setDescription(data.description || "");
      setCategory(data.category || "");
      setCity(data.city || "");
      setBudget(String(data.budget ?? ""));
    } catch (error) {
      console.error("Edit job fetch error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
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
      setSaving(true);

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        method: "PATCH",
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
        data = {};
      }

      if (!response.ok) {
        Alert.alert("Błąd", data.message || "Nie udało się zapisać zmian.");
        return;
      }

      Alert.alert("Gotowe", "Zlecenie zostało zaktualizowane.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Edit job error:", error);

      Alert.alert("Błąd", "Nie udało się połączyć z backendem.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edytuj zlecenie</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Tytuł</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              maxLength={100}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Opis</Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
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
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Miejscowość</Text>

            <TextInput
              value={city}
              onChangeText={setCity}
              style={styles.input}
              maxLength={80}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Budżet</Text>

            <TextInput
              value={budget}
              onChangeText={setBudget}
              style={styles.input}
              keyboardType="numeric"
            />
          </View>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
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
    backgroundColor: "#F8FAFC",
  },

  keyboardView: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E2A5A",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFFFFF",
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

  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
