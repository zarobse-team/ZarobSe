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
	Switch,
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

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [publicProfileEnabled, setPublicProfileEnabled] = useState(true);

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

			const data: UserProfile = await response.json();

			if (!response.ok) {
				Alert.alert("Błąd", "Nie udało się pobrać danych profilu.");
				return;
			}

			setFirstName(data.firstName || "");
			setLastName(data.lastName || "");
			setEmail(data.email || "");
			setPhone(data.phone || "");
			setCity(data.city || "");
			setBio(data.bio || "");
		} catch (error) {
			console.error("Profile settings fetch error:", error);

			Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
			Alert.alert("Błąd", "Imię, nazwisko i numer telefonu są wymagane.");
			return;
		}

		try {
			setSaving(true);

			const token = await SecureStore.getItemAsync("token");

			if (!token) {
				router.replace("/login");
				return;
			}

			const response = await fetch(`${API_URL}/api/auth/me`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					phone: phone.trim(),
					city: city.trim(),
					bio: bio.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				Alert.alert("Błąd", data.message || "Nie udało się zapisać zmian.");
				return;
			}

			Alert.alert("Gotowe", "Profil został zaktualizowany.", [
				{
					text: "OK",
					onPress: () => router.replace("/(tabs)/profile"),
				},
			]);
		} catch (error) {
			console.error("Profile update error:", error);

			Alert.alert("Błąd połączenia", "Nie udało się połączyć z backendem.");
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
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps='handled'>
				<Text style={styles.headerTitle}>Ustawienia profilu</Text>

				<View style={styles.avatarSection}>
					<View style={styles.avatarWrapper}>
						<Image
							source={require("../assets/images/undraw_friendly-guy-avatar_dqp5 (1).png")}
							style={styles.avatar}
						/>
					</View>

					<Text style={styles.changePhoto}>Zmień zdjęcie</Text>
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
						/>
					</View>

					<View style={styles.inputCard}>
						<Text style={styles.label}>Miejscowość</Text>

						<TextInput
							value={city}
							onChangeText={setCity}
							style={styles.input}
							autoCapitalize='words'
						/>
					</View>

					<View style={styles.inputCard}>
						<Text style={styles.label}>Opis profilu</Text>

						<TextInput
							value={bio}
							onChangeText={setBio}
							placeholder='Napisz coś o sobie'
							multiline
							style={styles.bioInput}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Preferencje</Text>

					<View style={styles.settingRow}>
						<View>
							<Text style={styles.settingTitle}>Powiadomienia</Text>

							<Text style={styles.settingDescription}>
								Otrzymuj informacje o nowych zleceniach.
							</Text>
						</View>

						<Switch
							value={notificationsEnabled}
							onValueChange={setNotificationsEnabled}
						/>
					</View>

					<View style={styles.settingRow}>
						<View>
							<Text style={styles.settingTitle}>Tryb publiczny</Text>

							<Text style={styles.settingDescription}>
								Twój profil będzie widoczny dla innych.
							</Text>
						</View>

						<Switch
							value={publicProfileEnabled}
							onValueChange={setPublicProfileEnabled}
						/>
					</View>
				</View>

				<Pressable
					style={[styles.saveButton, saving && styles.saveButtonDisabled]}
					onPress={handleSave}
					disabled={saving}>
					<Text style={styles.saveButtonText}>
						{saving ? "Zapisywanie..." : "Zapisz zmiany"}
					</Text>
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
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: 40,
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
		padding: 18,
		marginBottom: 14,
	},

	avatar: {
		width: 130,
		height: 130,
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
		minHeight: 90,
		textAlignVertical: "top",
		fontSize: 16,
		color: "#1F2937",
	},

	settingRow: {
		backgroundColor: "white",
		borderRadius: 20,
		padding: 18,
		marginBottom: 14,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		gap: 16,
	},

	settingTitle: {
		fontSize: 15,
		fontWeight: "700",
		color: "#1F2937",
		marginBottom: 4,
	},

	settingDescription: {
		color: "#6B7280",
		fontSize: 13,
		lineHeight: 18,
		maxWidth: 220,
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
});
