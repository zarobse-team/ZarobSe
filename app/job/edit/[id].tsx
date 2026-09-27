import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { fetch as expoFetch } from "expo/fetch";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { JOB_CATEGORIES } from "../../../constants/categories";

const MAX_IMAGES = 5;

type Job = {
  _id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  budget: number;
  images?: string[];
};

type NewImage = {
  uri: string;
};

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const totalImages = existingImages.length + newImages.length;

  const isValidCategory = JOB_CATEGORIES.includes(
    category as (typeof JOB_CATEGORIES)[number],
  );

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
      setExistingImages(Array.isArray(data.images) ? data.images : []);
      setNewImages([]);
    } catch (error) {
      console.error("Edit job fetch error:", error);

      Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
    } finally {
      setLoading(false);
    }
  };

  const openCategoryModal = () => {
    Keyboard.dismiss();
    setCategoryOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryOpen(false);
  };

  const handleSelectCategory = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setCategoryOpen(false);
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages((current) =>
      current.filter((image) => image !== imageUrl),
    );
  };

  const removeNewImage = (index: number) => {
    setNewImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const pickImages = async () => {
    if (totalImages >= MAX_IMAGES) {
      Alert.alert(
        "Limit zdjęć",
        `Możesz mieć maksymalnie ${MAX_IMAGES} zdjęć.`,
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Brak uprawnień", "Aplikacja potrzebuje dostępu do galerii.");
      return;
    }

    const remaining = MAX_IMAGES - totalImages;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const selected = result.assets.slice(0, remaining).map((asset) => ({
      uri: asset.uri,
    }));

    setNewImages((current) => [...current, ...selected]);
  };

  const takePhoto = async () => {
    if (totalImages >= MAX_IMAGES) {
      Alert.alert(
        "Limit zdjęć",
        `Możesz mieć maksymalnie ${MAX_IMAGES} zdjęć.`,
      );
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Brak uprawnień", "Aplikacja potrzebuje dostępu do aparatu.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    setNewImages((current) => [
      ...current,
      {
        uri: asset.uri,
      },
    ]);
  };

  const showImageSourceOptions = () => {
    Keyboard.dismiss();

    Alert.alert("Dodaj zdjęcie", "Wybierz źródło zdjęcia.", [
      {
        text: "Galeria",
        onPress: pickImages,
      },
      {
        text: "Aparat",
        onPress: takePhoto,
      },
      {
        text: "Anuluj",
        style: "cancel",
      },
    ]);
  };

  const uploadImageToCloudinary = async (imageUri: string) => {
    if (!cloudName || !uploadPreset) {
      throw new Error("Brak konfiguracji Cloudinary w pliku .env.");
    }

    const file = new File(imageUri);

    const formData = new FormData();

    formData.append("file", file);

    formData.append("upload_preset", uploadPreset);

    const response = await expoFetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary upload error:", data);

      throw new Error(
        data?.error?.message || "Nie udało się przesłać zdjęcia.",
      );
    }

    if (!data.secure_url) {
      throw new Error("Cloudinary nie zwrócił adresu zdjęcia.");
    }

    return data.secure_url as string;
  };

  const uploadNewImages = async () => {
    const uploadedUrls: string[] = [];

    for (const image of newImages) {
      const url = await uploadImageToCloudinary(image.uri);

      uploadedUrls.push(url);
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();

    const trimmedDescription = description.trim();

    const trimmedCity = city.trim();

    const numericBudget = Number(budget.replace(",", "."));

    if (
      !trimmedTitle ||
      !trimmedDescription ||
      !category ||
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

    if (!isValidCategory) {
      Alert.alert(
        "Błąd",
        "To zlecenie ma starą kategorię. Wybierz kategorię z aktualnej listy.",
      );
      return;
    }

    if (Number.isNaN(numericBudget) || numericBudget < 0) {
      Alert.alert("Błąd", "Podaj poprawny budżet.");
      return;
    }

    if (totalImages > MAX_IMAGES) {
      Alert.alert("Błąd", `Możesz mieć maksymalnie ${MAX_IMAGES} zdjęć.`);
      return;
    }

    try {
      setSaving(true);
      Keyboard.dismiss();

      const token = await SecureStore.getItemAsync("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const uploadedNewImages = await uploadNewImages();

      const finalImages = [...existingImages, ...uploadedNewImages];

      const response = await fetch(`${API_URL}/api/jobs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          category,
          city: trimmedCity,
          budget: numericBudget,
          images: finalImages,
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

      setExistingImages(finalImages);
      setNewImages([]);

      Alert.alert("Gotowe", "Zlecenie zostało zaktualizowane.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Edit job error:", error);

      const message =
        error instanceof Error ? error.message : "Nie udało się zapisać zmian.";

      Alert.alert("Błąd", message);
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
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          <Text style={styles.title}>Edytuj zlecenie</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Tytuł</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              maxLength={100}
              returnKeyType="next"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.labelRow}>
              <Text style={styles.labelNoMargin}>Opis</Text>

              <Text style={styles.counter}>
                {description.length}
                /1000
              </Text>
            </View>

            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.descriptionInput}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.photosHeader}>
              <View>
                <Text style={styles.labelNoMargin}>Zdjęcia</Text>

                <Text style={styles.photosSubtitle}>
                  Opcjonalnie, maks. {MAX_IMAGES}
                </Text>
              </View>

              <Text style={styles.counter}>
                {totalImages}/{MAX_IMAGES}
              </Text>
            </View>

            {totalImages > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesRow}
              >
                {existingImages.map((imageUrl) => (
                  <View key={imageUrl} style={styles.imageWrapper}>
                    <Image
                      source={{
                        uri: imageUrl,
                      }}
                      style={styles.previewImage}
                    />

                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => removeExistingImage(imageUrl)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={17} color="#FFFFFF" />
                    </Pressable>

                    <View style={styles.savedImageBadge}>
                      <Text style={styles.savedImageBadgeText}>zapisane</Text>
                    </View>
                  </View>
                ))}

                {newImages.map((image, index) => (
                  <View
                    key={`${image.uri}-${index}`}
                    style={styles.imageWrapper}
                  >
                    <Image
                      source={{
                        uri: image.uri,
                      }}
                      style={styles.previewImage}
                    />

                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() => removeNewImage(index)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={17} color="#FFFFFF" />
                    </Pressable>

                    <View style={styles.newImageBadge}>
                      <Text style={styles.newImageBadgeText}>nowe</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {totalImages < MAX_IMAGES && (
              <Pressable
                style={styles.addPhotoButton}
                onPress={showImageSourceOptions}
              >
                <View style={styles.addPhotoIcon}>
                  <Ionicons name="camera-outline" size={22} color="#2563EB" />
                </View>

                <View style={styles.addPhotoTextWrapper}>
                  <Text style={styles.addPhotoTitle}>Dodaj zdjęcia</Text>

                  <Text style={styles.addPhotoText}>
                    Wybierz z galerii lub zrób zdjęcie
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </Pressable>
            )}

            {totalImages === MAX_IMAGES && (
              <View style={styles.limitInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color="#64748B"
                />

                <Text style={styles.limitInfoText}>
                  Osiągnięto limit 5 zdjęć.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Kategoria</Text>

            <Pressable
              style={[
                styles.categorySelector,
                category !== "" &&
                  !isValidCategory &&
                  styles.categorySelectorInvalid,
              ]}
              onPress={openCategoryModal}
            >
              <View style={styles.categorySelectorLeft}>
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={
                    category !== "" && !isValidCategory
                      ? "#DC2626"
                      : category
                        ? "#2563EB"
                        : "#9CA3AF"
                  }
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.categorySelectorText,
                    !category && styles.categoryPlaceholder,
                    category !== "" &&
                      !isValidCategory &&
                      styles.invalidCategoryText,
                  ]}
                >
                  {category || "Wybierz kategorię"}
                </Text>
              </View>

              <Ionicons name="chevron-down" size={20} color="#64748B" />
            </Pressable>

            {category !== "" && !isValidCategory && (
              <View style={styles.categoryWarning}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color="#DC2626"
                />

                <Text style={styles.categoryWarningText}>
                  To stara kategoria. Wybierz nową kategorię z listy.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Miejscowość</Text>

            <TextInput
              value={city}
              onChangeText={setCity}
              style={styles.input}
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Budżet</Text>

            <View style={styles.budgetRow}>
              <TextInput
                value={budget}
                onChangeText={setBudget}
                style={styles.budgetInput}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={styles.currency}>zł</Text>
            </View>
          </View>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator color="#FFFFFF" />

                <Text style={styles.saveButtonText}>Zapisywanie...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCategoryModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeCategoryModal}>
          <Pressable
            style={styles.modalContent}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Wybierz kategorię</Text>

                <Text style={styles.modalSubtitle}>
                  Wybierz kategorię najlepiej pasującą do zlecenia.
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeCategoryModal}
                hitSlop={10}
              >
                <Ionicons name="close" size={23} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.categoriesScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {JOB_CATEGORIES.map((item) => {
                const isSelected = category === item;

                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                    onPress={() => handleSelectCategory(item)}
                  >
                    <View style={styles.categoryOptionLeft}>
                      <View
                        style={[
                          styles.categoryIcon,
                          isSelected && styles.categoryIconSelected,
                        ]}
                      >
                        <Ionicons
                          name="grid-outline"
                          size={18}
                          color={isSelected ? "#2563EB" : "#64748B"}
                        />
                      </View>

                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#2563EB"
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    flexGrow: 1,
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

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 10,
  },

  labelNoMargin: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  input: {
    fontSize: 16,
    color: "#1F2937",
    minHeight: 26,
  },

  descriptionInput: {
    fontSize: 16,
    color: "#1F2937",
    minHeight: 120,
  },

  counter: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  photosHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  photosSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#9CA3AF",
  },

  imagesRow: {
    gap: 10,
    paddingBottom: 14,
  },

  imageWrapper: {
    width: 110,
    height: 110,
    position: "relative",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },

  removeImageButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },

  savedImageBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  savedImageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  newImageBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(37, 99, 235, 0.88)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  newImageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  addPhotoButton: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  addPhotoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  addPhotoTextWrapper: {
    flex: 1,
    marginLeft: 12,
  },

  addPhotoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },

  addPhotoText: {
    marginTop: 3,
    fontSize: 12,
    color: "#94A3B8",
  },

  limitInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  limitInfoText: {
    fontSize: 12,
    color: "#64748B",
  },

  categorySelector: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
  },

  categorySelectorInvalid: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },

  categorySelectorLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginRight: 10,
  },

  categorySelectorText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },

  categoryPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400",
  },

  invalidCategoryText: {
    color: "#DC2626",
  },

  categoryWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 9,
  },

  categoryWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#DC2626",
  },

  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  budgetInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 26,
  },

  currency: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 8,
  },

  saveButton: {
    backgroundColor: "#2563EB",
    minHeight: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "75%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  modalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0F172A",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  categoriesScroll: {
    flexGrow: 0,
  },

  categoryOption: {
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  categoryOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    borderBottomColor: "transparent",
  },

  categoryOptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryIconSelected: {
    backgroundColor: "#DBEAFE",
  },

  categoryOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  categoryOptionTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
