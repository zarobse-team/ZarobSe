import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	AlertButton,
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

export default function ProfileSettingsScreen() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [city, setCity] = useState("");
	const [bio, setBio] = useState("");

	const [skills, setSkills] = useState<string[]>([]);
	const [newSkill, setNewSkill] = useState("");

	const [avatar, setAvatar] = useState("");
	const [avatarChanged, setAvatarChanged] = useState(false);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

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
				Alert.alert(
					"Błąd",
					data.message || "Nie udało się pobrać danych profilu.",
				);
				return;
			}

			const profile = data as UserProfile;

			setFirstName(profile.firstName || "");
			setLastName(profile.lastName || "");
			setEmail(profile.email || "");
			setPhone(profile.phone || "");
			setCity(profile.city || "");
			setBio(profile.bio || "");
			setAvatar(profile.avatar || "");
			setSkills(profile.skills || []);
			setAvatarChanged(false);
		} catch (error) {
			console.error("Profile settings fetch error:", error);

			Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
		} finally {
			setLoading(false);
		}
	};

	const chooseFromGallery = async () => {
		try {
			const permission =
				await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permission.granted) {
				Alert.alert(
					"Brak uprawnień",
					"Aplikacja potrzebuje dostępu do galerii.",
				);
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.7,
			});

			if (!result.canceled) {
				setAvatar(result.assets[0].uri);
				setAvatarChanged(true);
			}
		} catch (error) {
			console.error("Gallery error:", error);

			Alert.alert("Błąd", "Nie udało się wybrać zdjęcia.");
		}
	};

	const takePhoto = async () => {
		try {
			const permission = await ImagePicker.requestCameraPermissionsAsync();

			if (!permission.granted) {
				Alert.alert(
					"Brak uprawnień",
					"Aplikacja potrzebuje dostępu do aparatu.",
				);
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images"],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.7,
			});

			if (!result.canceled) {
				setAvatar(result.assets[0].uri);
				setAvatarChanged(true);
			}
		} catch (error) {
			console.error("Camera error:", error);

			Alert.alert("Błąd", "Nie udało się zrobić zdjęcia.");
		}
	};

	const removeAvatar = () => {
		setAvatar("");
		setAvatarChanged(true);
	};

	const handleChangePhoto = () => {
		const options: AlertButton[] = [
			{
				text: "Aparat",
				onPress: takePhoto,
			},
			{
				text: "Galeria",
				onPress: chooseFromGallery,
			},
		];

		if (avatar) {
			options.push({
				text: "Usuń zdjęcie",
				style: "destructive",
				onPress: removeAvatar,
			});
		}

		options.push({
			text: "Anuluj",
			style: "cancel",
		});

		Alert.alert("Zdjęcie profilowe", "Wybierz opcję.", options);
	};

	const uploadAvatar = async (imageUri: string): Promise<string> => {
		const formData = new FormData();

		formData.append("file", {
			uri: imageUri,
			type: "image/jpeg",
			name: "avatar.jpg",
		} as any);

		formData.append("upload_preset", "zarobse_avatars");

		const response = await fetch(
			"https://api.cloudinary.com/v1_1/jjtzvske/image/upload",
			{
				method: "POST",
				body: formData,
			},
		);

		const data = await response.json();

		if (!response.ok) {
			console.error("Cloudinary upload error:", data);

			throw new Error("Nie udało się wysłać zdjęcia.");
		}

		return data.secure_url;
	};

	const addSkill = () => {
		const skill = newSkill.trim();

		if (!skill) {
			return;
		}

		if (skill.length > 30) {
			Alert.alert("Błąd", "Umiejętność może mieć maksymalnie 30 znaków.");
			return;
		}

		if (skills.length >= 10) {
			Alert.alert("Błąd", "Możesz dodać maksymalnie 10 umiejętności.");
			return;
		}

		const alreadyExists = skills.some(
			(existingSkill) => existingSkill.toLowerCase() === skill.toLowerCase(),
		);

		if (alreadyExists) {
			Alert.alert("Błąd", "Ta umiejętność jest już dodana.");
			return;
		}

		setSkills((currentSkills) => [...currentSkills, skill]);

		setNewSkill("");
	};

	const removeSkill = (skillToRemove: string) => {
		setSkills((currentSkills) =>
			currentSkills.filter((skill) => skill !== skillToRemove),
		);
	};

	const handleSave = async () => {
		const trimmedFirstName = firstName.trim();
		const trimmedLastName = lastName.trim();
		const trimmedPhone = phone.trim();
		const trimmedCity = city.trim();
		const trimmedBio = bio.trim();

		if (!trimmedFirstName || !trimmedLastName || !trimmedPhone) {
			Alert.alert("Błąd", "Imię, nazwisko i numer telefonu są wymagane.");
			return;
		}

		const normalizedPhone = trimmedPhone.replace(/[\s()-]/g, "");

		const phoneRegex = /^\+?[0-9]{9,15}$/;

		if (!phoneRegex.test(normalizedPhone)) {
			Alert.alert(
				"Błędny numer telefonu",
				"Podaj poprawny numer telefonu, np. +48 500 600 700.",
			);
			return;
		}

		if (trimmedFirstName.length > 50) {
			Alert.alert("Błąd", "Imię może mieć maksymalnie 50 znaków.");
			return;
		}

		if (trimmedLastName.length > 50) {
			Alert.alert("Błąd", "Nazwisko może mieć maksymalnie 50 znaków.");
			return;
		}

		if (trimmedCity.length > 80) {
			Alert.alert("Błąd", "Miejscowość może mieć maksymalnie 80 znaków.");
			return;
		}

		if (trimmedBio.length > 300) {
			Alert.alert("Błąd", "Opis profilu może mieć maksymalnie 300 znaków.");
			return;
		}

		try {
			setSaving(true);

			const token = await SecureStore.getItemAsync("token");

			if (!token) {
				router.replace("/login");
				return;
			}

			let avatarUrl = avatar;

			if (avatarChanged && avatar) {
				avatarUrl = await uploadAvatar(avatar);
			}

			const response = await fetch(`${API_URL}/api/auth/me`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					firstName: trimmedFirstName,
					lastName: trimmedLastName,
					phone: trimmedPhone,
					city: trimmedCity,
					bio: trimmedBio,
					skills,
					avatar: avatarUrl,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				Alert.alert("Błąd", data.message || "Nie udało się zapisać zmian.");
				return;
			}

			setAvatar(avatarUrl);
			setAvatarChanged(false);

			Alert.alert("Gotowe", "Profil został zaktualizowany.", [
				{
					text: "OK",
					onPress: () => router.replace("/(tabs)/profile"),
				},
			]);
		} catch (error) {
			console.error("Profile update error:", error);

			Alert.alert("Błąd", "Nie udało się zapisać profilu lub wysłać zdjęcia.");
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => {
		fetchProfile();
	}, []);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView
				style={styles.keyboardView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps='handled'
					keyboardDismissMode={
						Platform.OS === "ios" ? "interactive" : "on-drag"
					}>
					<Text style={styles.headerTitle}>Ustawienia profilu</Text>

					<View style={styles.avatarSection}>
						<View style={styles.avatarWrapper}>
							<Image
								source={
									avatar
										? { uri: avatar }
										: require("../assets/images/undraw_friendly-guy-avatar_dqp5 (1).png")
								}
								style={styles.avatar}
							/>
						</View>

						<Pressable onPress={handleChangePhoto} disabled={saving}>
							<Text style={styles.changePhoto}>Zmień zdjęcie</Text>
						</Pressable>
					</View>

					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Dane użytkownika</Text>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Imię</Text>

							<TextInput
								value={firstName}
								onChangeText={setFirstName}
								style={styles.input}
								autoCapitalize='words'
								autoCorrect={false}
								maxLength={50}
							/>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Nazwisko</Text>

							<TextInput
								value={lastName}
								onChangeText={setLastName}
								style={styles.input}
								autoCapitalize='words'
								autoCorrect={false}
								maxLength={50}
							/>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Adres e-mail</Text>

							<TextInput
								value={email}
								editable={false}
								style={[styles.input, styles.disabledInput]}
							/>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Numer telefonu</Text>

							<TextInput
								value={phone}
								onChangeText={setPhone}
								style={styles.input}
								keyboardType='phone-pad'
								maxLength={20}
								placeholder='+48 500 600 700'
								placeholderTextColor='#9CA3AF'
							/>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Miejscowość</Text>

							<TextInput
								value={city}
								onChangeText={setCity}
								style={styles.input}
								autoCapitalize='words'
								maxLength={80}
							/>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Opis profilu</Text>

							<TextInput
								value={bio}
								onChangeText={setBio}
								placeholder='Napisz coś o sobie'
								placeholderTextColor='#9CA3AF'
								multiline
								maxLength={300}
								style={styles.bioInput}
							/>

							<Text style={styles.counterText}>{bio.length}/300</Text>
						</View>

						<View style={styles.inputCard}>
							<Text style={styles.label}>Umiejętności</Text>

							{skills.length > 0 && (
								<View style={styles.skillsContainer}>
									{skills.map((skill) => (
										<View key={skill} style={styles.skillTag}>
											<Text style={styles.skillTagText}>{skill}</Text>

											<Pressable
												onPress={() => removeSkill(skill)}
												hitSlop={10}>
												<Text style={styles.removeSkillText}>×</Text>
											</Pressable>
										</View>
									))}
								</View>
							)}

							<View style={styles.addSkillRow}>
								<TextInput
									value={newSkill}
									onChangeText={setNewSkill}
									placeholder='Np. montaż mebli'
									placeholderTextColor='#9CA3AF'
									style={styles.skillInput}
									maxLength={30}
									returnKeyType='done'
									onSubmitEditing={addSkill}
								/>

								<Pressable
									style={styles.addSkillButton}
									onPress={addSkill}
									disabled={skills.length >= 10}>
									<Text style={styles.addSkillButtonText}>+</Text>
								</Pressable>
							</View>

							<Text style={styles.helperText}>
								{skills.length}/10
								{" • "}
								maks. 30 znaków na umiejętność
							</Text>
						</View>
					</View>

					<Pressable
						style={[styles.saveButton, saving && styles.saveButtonDisabled]}
						onPress={handleSave}
						disabled={saving}>
						{saving ? (
							<View style={styles.savingRow}>
								<ActivityIndicator size='small' color='white' />

								<Text style={styles.saveButtonText}>Zapisywanie...</Text>
							</View>
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
		backgroundColor: "#F5F5FA",
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
		paddingBottom: 100,
	},

	headerTitle: {
		fontSize: 32,
		fontWeight: "800",
		color: "#1E2A5A",
		marginBottom: 28,
	},

	avatarSection: {
		alignItems: "center",
		marginBottom: 36,
	},

	avatarWrapper: {
		backgroundColor: "#ECEBFA",
		borderRadius: 999,
		padding: 5,
		marginBottom: 14,
	},

	avatar: {
		width: 130,
		height: 130,
		borderRadius: 65,
	},

	changePhoto: {
		color: "#4F7BFF",
		fontWeight: "700",
		fontSize: 15,
	},

	section: {
		marginBottom: 32,
	},

	sectionTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#1E2A5A",
		marginBottom: 16,
	},

	inputCard: {
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

	disabledInput: {
		color: "#9CA3AF",
	},

	bioInput: {
		minHeight: 100,
		textAlignVertical: "top",
		fontSize: 16,
		color: "#1F2937",
	},

	counterText: {
		marginTop: 8,
		alignSelf: "flex-end",
		fontSize: 12,
		color: "#9CA3AF",
	},

	skillsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginBottom: 14,
	},

	skillTag: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#ECEBFA",
		paddingLeft: 14,
		paddingRight: 10,
		paddingVertical: 9,
		borderRadius: 999,
		gap: 8,
	},

	skillTagText: {
		color: "#4F5DA8",
		fontSize: 14,
		fontWeight: "600",
	},

	removeSkillText: {
		color: "#6B7280",
		fontSize: 20,
		fontWeight: "600",
		lineHeight: 20,
	},

	addSkillRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},

	skillInput: {
		flex: 1,
		backgroundColor: "#F5F5FA",
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingVertical: 13,
		fontSize: 16,
		color: "#1F2937",
	},

	addSkillButton: {
		width: 46,
		height: 46,
		borderRadius: 14,
		backgroundColor: "#4F7BFF",
		alignItems: "center",
		justifyContent: "center",
	},

	addSkillButtonText: {
		color: "white",
		fontSize: 28,
		fontWeight: "500",
		lineHeight: 30,
	},

	helperText: {
		marginTop: 10,
		fontSize: 12,
		color: "#9CA3AF",
		lineHeight: 18,
	},

	saveButton: {
		backgroundColor: "#4F7BFF",
		paddingVertical: 18,
		borderRadius: 18,
		alignItems: "center",
		marginBottom: 40,
	},

	saveButtonDisabled: {
		opacity: 0.6,
	},

	saveButtonText: {
		color: "white",
		fontWeight: "700",
		fontSize: 16,
	},

	savingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
});
