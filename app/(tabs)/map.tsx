import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Keyboard,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { API_URL } from "../../constants/api";

const KRAKOW_REGION = {
	latitude: 50.0647,
	longitude: 19.945,
	latitudeDelta: 0.12,
	longitudeDelta: 0.12,
};

type LocationSearchResult = {
	name: string;
	latitude: number;
	longitude: number;
	type: string;
};

export default function MapScreen() {
	const mapRef = useRef<MapView>(null);
	const insets = useSafeAreaInsets();

	const [search, setSearch] = useState("");
	const [searchLoading, setSearchLoading] = useState(false);
	const [locationLoading, setLocationLoading] = useState(false);

	// WYSZUKIWANIE MIEJSCOWOŚCI
	const handleSearch = async () => {
		const query = search.trim();

		if (!query) {
			return;
		}

		try {
			setSearchLoading(true);
			Keyboard.dismiss();

			const response = await fetch(
				`${API_URL}/api/location/search?q=${encodeURIComponent(query)}`,
			);

			if (!response.ok) {
				throw new Error("Nie udało się wyszukać miejscowości.");
			}

			const results: LocationSearchResult[] = await response.json();

			if (results.length === 0) {
				Alert.alert("Brak wyników", `Nie znaleziono miejscowości „${query}”.`);
				return;
			}

			const place = results[0];

			mapRef.current?.animateToRegion(
				{
					latitude: place.latitude,
					longitude: place.longitude,
					latitudeDelta: 0.12,
					longitudeDelta: 0.12,
				},
				600,
			);
		} catch (error) {
			console.error("Location search error:", error);

			Alert.alert(
				"Błąd wyszukiwania",
				"Nie udało się wyszukać miejscowości. Spróbuj ponownie.",
			);
		} finally {
			setSearchLoading(false);
		}
	};

	// AKTUALNA LOKALIZACJA
	const handleMyLocation = async () => {
		try {
			setLocationLoading(true);
			Keyboard.dismiss();

			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== "granted") {
				Alert.alert(
					"Brak dostępu do lokalizacji",
					"Aby pokazać Twoją pozycję na mapie, zezwól aplikacji na dostęp do lokalizacji.",
				);
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			const { latitude, longitude } = location.coords;

			mapRef.current?.animateToRegion(
				{
					latitude,
					longitude,
					latitudeDelta: 0.03,
					longitudeDelta: 0.03,
				},
				600,
			);
		} catch (error) {
			console.error("Location error:", error);

			Alert.alert(
				"Błąd lokalizacji",
				"Nie udało się pobrać Twojej lokalizacji.",
			);
		} finally {
			setLocationLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			{/* MAPA */}
			<MapView
				ref={mapRef}
				style={styles.map}
				initialRegion={KRAKOW_REGION}
				showsCompass={false}
				showsScale={false}
				showsUserLocation
				toolbarEnabled={false}
				onPress={() => Keyboard.dismiss()}>
				{/* TESTOWA PINEZKA */}
				<Marker
					coordinate={{
						latitude: 50.0647,
						longitude: 19.945,
					}}
					title='Montaż szafki'
					description='150 zł • Kraków'>
					<View style={styles.marker}>
						<Ionicons name='briefcase' size={18} color='#FFFFFF' />
					</View>
				</Marker>
			</MapView>

			{/* GÓRNY PANEL */}
			<View
				style={[
					styles.topContainer,
					{
						top: insets.top + 8,
					},
				]}
				pointerEvents='box-none'>
				<View style={styles.header}>
					<View style={styles.headerText}>
						<Text style={styles.title}>Mapa zleceń</Text>

						<Text style={styles.subtitle}>
							Zobacz zlecenia dostępne w okolicy
						</Text>
					</View>

					<View style={styles.headerIcon}>
						<Ionicons name='map-outline' size={22} color='#2563EB' />
					</View>
				</View>

				{/* WYSZUKIWARKA */}
				<View style={styles.searchBox}>
					<Ionicons name='search' size={20} color='#64748B' />

					<TextInput
						value={search}
						onChangeText={setSearch}
						placeholder='Szukaj miejscowości...'
						placeholderTextColor='#94A3B8'
						style={styles.searchInput}
						returnKeyType='search'
						onSubmitEditing={handleSearch}
						editable={!searchLoading}
					/>

					{searchLoading ? (
						<ActivityIndicator size='small' color='#2563EB' />
					) : search.length > 0 ? (
						<Pressable
							onPress={() => {
								setSearch("");
								Keyboard.dismiss();
							}}
							hitSlop={8}>
							<Ionicons name='close-circle' size={20} color='#94A3B8' />
						</Pressable>
					) : null}
				</View>
			</View>

			{/* INFORMACJA NA DOLE */}
			<View
				style={[
					styles.resultsBadge,
					{
						bottom: insets.bottom + 14,
					},
				]}>
				<Ionicons name='location' size={16} color='#2563EB' />

				<Text style={styles.resultsText}>Zlecenia w tej okolicy</Text>
			</View>

			{/* PRZYCISK MOJEJ LOKALIZACJI */}
			<Pressable
				style={[
					styles.locationButton,
					{
						bottom: insets.bottom + 12,
					},
					locationLoading && styles.locationButtonDisabled,
				]}
				onPress={handleMyLocation}
				disabled={locationLoading}>
				{locationLoading ? (
					<ActivityIndicator size='small' color='#2563EB' />
				) : (
					<Ionicons name='locate' size={23} color='#2563EB' />
				)}
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FAFC",
	},

	map: {
		flex: 1,
	},

	topContainer: {
		position: "absolute",
		left: 16,
		right: 16,
	},

	header: {
		backgroundColor: "rgba(255, 255, 255, 0.96)",
		borderRadius: 22,
		paddingHorizontal: 18,
		paddingVertical: 15,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",

		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 3,
		},
		shadowOpacity: 0.12,
		shadowRadius: 8,
		elevation: 5,
	},

	headerText: {
		flex: 1,
		paddingRight: 12,
	},

	title: {
		fontSize: 24,
		fontWeight: "800",
		color: "#1E2A5A",
	},

	subtitle: {
		marginTop: 3,
		fontSize: 13,
		color: "#64748B",
	},

	headerIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: "#EFF6FF",
		alignItems: "center",
		justifyContent: "center",
	},

	searchBox: {
		height: 54,
		backgroundColor: "#FFFFFF",
		borderRadius: 18,
		marginTop: 10,
		paddingHorizontal: 15,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,

		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 3,
		},
		shadowOpacity: 0.1,
		shadowRadius: 7,
		elevation: 4,
	},

	searchInput: {
		flex: 1,
		fontSize: 15,
		color: "#1F2937",
	},

	marker: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#2563EB",
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 3,
		borderColor: "#FFFFFF",

		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},

	resultsBadge: {
		position: "absolute",
		left: 16,

		height: 46,
		paddingHorizontal: 14,

		backgroundColor: "#FFFFFF",
		borderRadius: 16,

		flexDirection: "row",
		alignItems: "center",
		gap: 7,

		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.12,
		shadowRadius: 6,
		elevation: 4,
	},

	resultsText: {
		fontSize: 13,
		fontWeight: "700",
		color: "#334155",
	},

	locationButton: {
		position: "absolute",
		right: 16,

		width: 50,
		height: 50,
		borderRadius: 16,

		backgroundColor: "#FFFFFF",

		alignItems: "center",
		justifyContent: "center",

		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.14,
		shadowRadius: 6,
		elevation: 5,
	},

	locationButtonDisabled: {
		opacity: 0.7,
	},
});
