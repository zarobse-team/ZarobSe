import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
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
	const [categoryOpen, setCategoryOpen] = useState(false);
	const [city, setCity] = useState("");
	const [budget, setBudget] = useState("");

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

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

		try {
			setSaving(true);
			Keyboard.dismiss();

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
					category,
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
					<ActivityIndicator size='large' color='#2563EB' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps='handled'
					keyboardDismissMode='on-drag'
					onScrollBeginDrag={() => Keyboard.dismiss()}>
					<Text style={styles.title}>Edytuj zlecenie</Text>

					<View style={styles.card}>
						<Text style={styles.label}>Tytuł</Text>

						<TextInput
							value={title}
							onChangeText={setTitle}
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
							style={styles.descriptionInput}
							multiline
							maxLength={1000}
							textAlignVertical='top'
						/>
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
							onPress={openCategoryModal}>
							<View style={styles.categorySelectorLeft}>
								<Ionicons
									name='grid-outline'
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
									]}>
									{category || "Wybierz kategorię"}
								</Text>
							</View>

							<Ionicons name='chevron-down' size={20} color='#64748B' />
						</Pressable>

						{category !== "" && !isValidCategory && (
							<View style={styles.categoryWarning}>
								<Ionicons
									name='alert-circle-outline'
									size={17}
									color='#DC2626'
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
							returnKeyType='done'
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
								keyboardType='decimal-pad'
								returnKeyType='done'
								onSubmitEditing={() => Keyboard.dismiss()}
							/>

							<Text style={styles.currency}>zł</Text>
						</View>
					</View>

					<Pressable
						style={[styles.saveButton, saving && styles.saveButtonDisabled]}
						onPress={handleSave}
						disabled={saving}>
						{saving ? (
							<ActivityIndicator color='#FFFFFF' />
						) : (
							<>
								<Ionicons
									name='checkmark-circle-outline'
									size={21}
									color='#FFFFFF'
								/>

								<Text style={styles.saveButtonText}>Zapisz zmiany</Text>
							</>
						)}
					</Pressable>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* MODAL WYBORU KATEGORII */}
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
							<View>
								<Text style={styles.modalTitle}>Wybierz kategorię</Text>

								<Text style={styles.modalSubtitle}>
									Wybierz kategorię najlepiej pasującą do zlecenia.
								</Text>
							</View>

							<Pressable
								style={styles.closeButton}
								onPress={closeCategoryModal}
								hitSlop={10}>
								<Ionicons name='close' size={23} color='#64748B' />
							</Pressable>
						</View>

						<ScrollView
							style={styles.categoriesScroll}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps='handled'>
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

	// MODAL

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

	modalTitle: {
		fontSize: 21,
		fontWeight: "800",
		color: "#0F172A",
	},

	modalSubtitle: {
		fontSize: 13,
		color: "#64748B",
		marginTop: 4,
		paddingRight: 20,
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
