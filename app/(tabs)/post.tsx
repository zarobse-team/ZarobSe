import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

import { API_URL } from "../../constants/api";
import { JOB_CATEGORIES } from "../../constants/categories";

const MAX_IMAGES = 5;

type SelectedImage = {
	uri: string;
};

type LocationSuggestion = {
	name: string;
	city: string;
	street: string;
	latitude: number;
	longitude: number;
	type: string;
};

export default function PostJobScreen() {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [categoryOpen, setCategoryOpen] = useState(false);
	const [city, setCity] = useState("");
	const [street, setStreet] = useState("");
	const [citySuggestions, setCitySuggestions] = useState<LocationSuggestion[]>(
		[],
	);
	const [citySearchLoading, setCitySearchLoading] = useState(false);
	const [budget, setBudget] = useState("");
	const [images, setImages] = useState<SelectedImage[]>([]);
	const [loading, setLoading] = useState(false);

	const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

	const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

	useEffect(() => {
		const query = city.trim();

		if (query.length < 3) {
			setCitySuggestions([]);
			return;
		}

		const timeout = setTimeout(async () => {
			try {
				setCitySearchLoading(true);

				const response = await fetch(
					`${API_URL}/api/location/cities?q=${encodeURIComponent(query)}`,
				);

				if (!response.ok) {
					throw new Error("Nie udało się pobrać podpowiedzi.");
				}

				const data: LocationSuggestion[] = await response.json();

				setCitySuggestions(data);
			} catch (error) {
				console.error("City suggestions error:", error);
				setCitySuggestions([]);
			} finally {
				setCitySearchLoading(false);
			}
		}, 400);

		return () => clearTimeout(timeout);
	}, [city]);

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

	const pickImages = async () => {
		if (images.length >= MAX_IMAGES) {
			Alert.alert(
				"Limit zdjęć",
				`Możesz dodać maksymalnie ${MAX_IMAGES} zdjęć.`,
			);
			return;
		}

		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (!permission.granted) {
			Alert.alert("Brak uprawnień", "Aplikacja potrzebuje dostępu do galerii.");
			return;
		}

		const remaining = MAX_IMAGES - images.length;

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

		setImages((current) => [...current, ...selected]);
	};

	const takePhoto = async () => {
		if (images.length >= MAX_IMAGES) {
			Alert.alert(
				"Limit zdjęć",
				`Możesz dodać maksymalnie ${MAX_IMAGES} zdjęć.`,
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

		setImages((current) => [
			...current,
			{
				uri: asset.uri,
			},
		]);
	};

	const removeImage = (index: number) => {
		setImages((current) =>
			current.filter((_, currentIndex) => currentIndex !== index),
		);
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

	const uploadImages = async () => {
		if (images.length === 0) {
			return [];
		}

		const uploadedUrls: string[] = [];

		for (const image of images) {
			const url = await uploadImageToCloudinary(image.uri);

			uploadedUrls.push(url);
		}

		return uploadedUrls;
	};

	const handleCreateJob = async () => {
		const trimmedTitle = title.trim();
		const trimmedDescription = description.trim();
		const trimmedCity = city.trim();
		const trimmedStreet = street.trim();

		const numericBudget = Number(budget.replace(",", "."));

		if (
			!trimmedTitle ||
			!trimmedDescription ||
			!category ||
			!trimmedCity ||
			!trimmedStreet ||
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

		if (!JOB_CATEGORIES.includes(category as (typeof JOB_CATEGORIES)[number])) {
			Alert.alert("Błąd", "Wybierz poprawną kategorię.");
			return;
		}

		if (Number.isNaN(numericBudget) || numericBudget < 0) {
			Alert.alert("Błąd", "Podaj poprawny budżet.");
			return;
		}

		try {
			setLoading(true);
			Keyboard.dismiss();

			const token = await SecureStore.getItemAsync("token");

			if (!token) {
				Alert.alert("Błąd", "Musisz być zalogowany.");

				router.replace("/login");

				return;
			}

			const uploadedImages = await uploadImages();

			const response = await fetch(`${API_URL}/api/jobs`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					title: trimmedTitle,
					description: trimmedDescription,
					category,
					city: trimmedCity,
					street: trimmedStreet,
					budget: numericBudget,
					images: uploadedImages,
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

			setTitle("");
			setDescription("");
			setCategory("");
			setCategoryOpen(false);
			setCity("");
			setStreet("");
			setBudget("");
			setImages([]);

			Alert.alert("Gotowe", "Zlecenie zostało utworzone.", [
				{
					text: "OK",
					onPress: () => router.replace("/(tabs)"),
				},
			]);
		} catch (error) {
			console.error("Create job error:", error);

			const message =
				error instanceof Error
					? error.message
					: "Nie udało się utworzyć zlecenia.";

			Alert.alert("Błąd", message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps='handled'
					keyboardDismissMode='on-drag'
					onScrollBeginDrag={() => Keyboard.dismiss()}>
					<Text style={styles.title}>Dodaj zlecenie</Text>

					<Text style={styles.subtitle}>
						Opisz, czego potrzebujesz i znajdź osobę do wykonania zadania.
					</Text>

					<View style={styles.card}>
						<Text style={styles.label}>Tytuł</Text>

						<TextInput
							value={title}
							onChangeText={setTitle}
							placeholder='Np. Montaż szafki'
							placeholderTextColor='#9CA3AF'
							style={styles.input}
							maxLength={100}
							returnKeyType='next'
						/>
					</View>

					<View style={styles.card}>
						<View style={styles.labelRow}>
							<Text style={styles.labelNoMargin}>Opis</Text>

							<Text style={styles.counter}>{description.length}/1000</Text>
						</View>

						<TextInput
							value={description}
							onChangeText={setDescription}
							placeholder='Opisz dokładnie, czego potrzebujesz'
							placeholderTextColor='#9CA3AF'
							style={styles.descriptionInput}
							multiline
							maxLength={1000}
							textAlignVertical='top'
						/>
					</View>

					<View style={styles.card}>
						<View style={styles.photosHeader}>
							<View>
								<Text style={styles.labelNoMargin}>Zdjęcia</Text>

								<Text style={styles.photosSubtitle}>Opcjonalnie, maks. 5</Text>
							</View>

							<Text style={styles.counter}>{images.length}/5</Text>
						</View>

						{images.length > 0 && (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.imagesRow}>
								{images.map((image, index) => (
									<View
										key={`${image.uri}-${index}`}
										style={styles.imageWrapper}>
										<Image
											source={{
												uri: image.uri,
											}}
											style={styles.previewImage}
										/>

										<Pressable
											style={styles.removeImageButton}
											onPress={() => removeImage(index)}>
											<Ionicons name='close' size={17} color='#FFFFFF' />
										</Pressable>
									</View>
								))}
							</ScrollView>
						)}

						{images.length < MAX_IMAGES && (
							<Pressable
								style={styles.addPhotoButton}
								onPress={showImageSourceOptions}>
								<View style={styles.addPhotoIcon}>
									<Ionicons name='camera-outline' size={22} color='#2563EB' />
								</View>

								<View style={styles.addPhotoTextWrapper}>
									<Text style={styles.addPhotoTitle}>Dodaj zdjęcia</Text>

									<Text style={styles.addPhotoText}>
										Wybierz z galerii lub zrób zdjęcie
									</Text>
								</View>

								<Ionicons name='chevron-forward' size={20} color='#94A3B8' />
							</Pressable>
						)}
					</View>

					<View style={styles.card}>
						<Text style={styles.label}>Kategoria</Text>

						<Pressable
							style={styles.categorySelector}
							onPress={openCategoryModal}>
							<View style={styles.categorySelectorLeft}>
								<Ionicons
									name='grid-outline'
									size={20}
									color={category ? "#2563EB" : "#9CA3AF"}
								/>

								<Text
									numberOfLines={1}
									style={[
										styles.categorySelectorText,
										!category && styles.categoryPlaceholder,
									]}>
									{category || "Wybierz kategorię"}
								</Text>
							</View>

							<Ionicons name='chevron-down' size={20} color='#64748B' />
						</Pressable>
					</View>

					<View style={styles.card}>
						<Text style={styles.label}>Miejscowość</Text>

						<TextInput
							value={city}
							onChangeText={setCity}
							placeholder='Np. Kraków'
							placeholderTextColor='#9CA3AF'
							style={styles.input}
							maxLength={80}
							autoCorrect={false}
						/>

						{citySearchLoading && (
							<ActivityIndicator size='small' style={styles.locationLoader} />
						)}

						{citySuggestions.length > 0 && (
							<View style={styles.suggestionsContainer}>
								{citySuggestions.map((item, index) => (
									<Pressable
										key={`${item.name}-${index}`}
										style={styles.suggestionItem}
										onPress={() => {
											setCity(item.name);
											setCitySuggestions([]);
											Keyboard.dismiss();
										}}>
										<Ionicons
											name='location-outline'
											size={18}
											color='#2563EB'
										/>

										<Text style={styles.suggestionText}>{item.name}</Text>
									</Pressable>
								))}
							</View>
						)}
					</View>

					<View style={styles.card}>
						<Text style={styles.label}>Ulica</Text>

						<TextInput
							value={street}
							onChangeText={setStreet}
							placeholder='Np. Długa'
							placeholderTextColor='#9CA3AF'
							style={styles.input}
							maxLength={100}
						/>
					</View>

					<View style={styles.card}>
						<Text style={styles.label}>Budżet</Text>

						<View style={styles.budgetRow}>
							<TextInput
								value={budget}
								onChangeText={setBudget}
								placeholder='Np. 150'
								placeholderTextColor='#9CA3AF'
								style={styles.budgetInput}
								keyboardType='decimal-pad'
							/>

							<Text style={styles.currency}>zł</Text>
						</View>
					</View>

					<Pressable
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleCreateJob}
						disabled={loading}>
						{loading ? (
							<>
								<ActivityIndicator color='#FFFFFF' />

								<Text style={styles.buttonText}>Dodawanie...</Text>
							</>
						) : (
							<>
								<Ionicons name='add-circle-outline' size={21} color='#FFFFFF' />

								<Text style={styles.buttonText}>Dodaj zlecenie</Text>
							</>
						)}
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal
				visible={categoryOpen}
				transparent
				animationType='fade'
				onRequestClose={closeCategoryModal}>
				<Pressable style={styles.modalOverlay} onPress={closeCategoryModal}>
					<Pressable
						style={styles.modalContent}
						onPress={(event) => event.stopPropagation()}>
						<View style={styles.modalHeader}>
							<View style={styles.modalHeaderText}>
								<Text style={styles.modalTitle}>Wybierz kategorię</Text>

								<Text style={styles.modalSubtitle}>
									Wybierz kategorię najlepiej pasującą do zlecenia.
								</Text>
							</View>

							<Pressable
								style={styles.closeButton}
								onPress={closeCategoryModal}>
								<Ionicons name='close' size={23} color='#64748B' />
							</Pressable>
						</View>

						<ScrollView
							style={styles.categoriesScroll}
							showsVerticalScrollIndicator={false}>
							{JOB_CATEGORIES.map((item) => {
								const isSelected = category === item;

								return (
									<Pressable
										key={item}
										style={[
											styles.categoryOption,
											isSelected && styles.categoryOptionSelected,
										]}
										onPress={() => handleSelectCategory(item)}>
										<View style={styles.categoryOptionLeft}>
											<View
												style={[
													styles.categoryIcon,
													isSelected && styles.categoryIconSelected,
												]}>
												<Ionicons
													name='grid-outline'
													size={18}
													color={isSelected ? "#2563EB" : "#64748B"}
												/>
											</View>

											<Text
												style={[
													styles.categoryOptionText,
													isSelected && styles.categoryOptionTextSelected,
												]}>
												{item}
											</Text>
										</View>

										{isSelected && (
											<Ionicons
												name='checkmark-circle'
												size={22}
												color='#2563EB'
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
		backgroundColor: "#F5F5FA",
	},

	keyboardView: {
		flex: 1,
	},

	scrollContent: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: 40,
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
	locationLoader: {
		marginTop: 12,
	},

	suggestionsContainer: {
		marginTop: 12,
		borderTopWidth: 1,
		borderTopColor: "#E5E7EB",
	},

	suggestionItem: {
		minHeight: 48,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#F1F5F9",
	},

	suggestionText: {
		fontSize: 15,
		color: "#1F2937",
		fontWeight: "500",
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

	button: {
		backgroundColor: "#4F7BFF",
		minHeight: 58,
		borderRadius: 18,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
		marginTop: 10,
	},

	buttonDisabled: {
		opacity: 0.6,
	},

	buttonText: {
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
