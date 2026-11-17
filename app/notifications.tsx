import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from "react-native";

import { API_URL } from "../constants/api";

type NotificationItem = {
	_id: string;
	type:
		| "new_message"
		| "new_application"
		| "worker_selected"
		| "job_status"
		| "new_review";
	title: string;
	body: string;
	job?: string;
	isRead: boolean;
	createdAt: string;
};

export default function NotificationsScreen() {
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [loading, setLoading] = useState(true);

	const loadNotifications = useCallback(async () => {
		try {
			const token = await SecureStore.getItemAsync("token");

			if (!token) {
				router.replace("/login");
				return;
			}

			const response = await fetch(`${API_URL}/api/notifications`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				throw new Error("Nie udało się pobrać powiadomień");
			}

			const data = await response.json();
			setNotifications(data);
		} catch (error) {
			console.error(error);
			Alert.alert("Błąd", "Nie udało się pobrać powiadomień.");
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadNotifications();
		}, [loadNotifications]),
	);

	const markAsRead = async (notification: NotificationItem) => {
		try {
			const token = await SecureStore.getItemAsync("token");

			if (!token) return;

			if (!notification.isRead) {
				const response = await fetch(
					`${API_URL}/api/notifications/${notification._id}/read`,
					{
						method: "PATCH",
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error("Nie udało się oznaczyć powiadomienia");
				}

				setNotifications((current) =>
					current.map((item) =>
						item._id === notification._id ? { ...item, isRead: true } : item,
					),
				);
			}

			if (notification.job) {
				router.push({
					pathname: "/job/[id]",
					params: { id: notification.job },
				});
			}
		} catch (error) {
			console.error(error);
			Alert.alert("Błąd", "Nie udało się otworzyć powiadomienia.");
		}
	};

	const markAllAsRead = async () => {
		try {
			const token = await SecureStore.getItemAsync("token");

			if (!token) return;

			const response = await fetch(`${API_URL}/api/notifications/read-all`, {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				throw new Error("Nie udało się oznaczyć powiadomień");
			}

			setNotifications((current) =>
				current.map((item) => ({ ...item, isRead: true })),
			);
		} catch (error) {
			console.error(error);
			Alert.alert("Błąd", "Nie udało się zaktualizować powiadomień.");
		}
	};

	const unreadCount = notifications.filter((item) => !item.isRead).length;

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Pressable onPress={() => router.back()}>
					<Ionicons name='arrow-back' size={25} color='#111827' />
				</Pressable>

				<Text style={styles.heading}>Powiadomienia</Text>

				<Pressable onPress={markAllAsRead} disabled={unreadCount === 0}>
					<Ionicons
						name='checkmark-done'
						size={25}
						color={unreadCount ? "#2563EB" : "#9CA3AF"}
					/>
				</Pressable>
			</View>

			{loading ? (
				<ActivityIndicator
					size='large'
					color='#2563EB'
					style={{ marginTop: 40 }}
				/>
			) : (
				<FlatList
					data={notifications}
					keyExtractor={(item) => item._id}
					contentContainerStyle={styles.list}
					onRefresh={loadNotifications}
					refreshing={false}
					ListEmptyComponent={
						<View style={styles.empty}>
							<Ionicons
								name='notifications-outline'
								size={55}
								color='#94A3B8'
							/>
							<Text style={styles.emptyText}>Nie masz jeszcze powiadomień</Text>
						</View>
					}
					renderItem={({ item }) => (
						<Pressable
							onPress={() => markAsRead(item)}
							style={[styles.notification, !item.isRead && styles.unread]}>
							<View style={styles.iconBox}>
								<Ionicons
									name={
										item.type === "new_message"
											? "chatbubble-outline"
											: item.type === "new_application"
												? "person-add-outline"
												: item.type === "new_review"
													? "star-outline"
													: "notifications-outline"
									}
									size={23}
									color='#2563EB'
								/>
							</View>

							<View style={styles.content}>
								<Text style={styles.title}>{item.title}</Text>
								<Text style={styles.body}>{item.body}</Text>
								<Text style={styles.date}>
									{new Date(item.createdAt).toLocaleString("pl-PL")}
								</Text>
							</View>

							{!item.isRead && <View style={styles.dot} />}
						</Pressable>
					)}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#F8FAFC",
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 20,
		backgroundColor: "#FFFFFF",
		borderBottomWidth: 1,
		borderBottomColor: "#E5E7EB",
	},
	heading: {
		fontSize: 21,
		fontWeight: "700",
		color: "#111827",
	},
	list: {
		padding: 16,
		flexGrow: 1,
	},
	notification: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderRadius: 14,
		padding: 16,
		marginBottom: 10,
		gap: 12,
	},
	unread: {
		backgroundColor: "#EFF6FF",
	},
	iconBox: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#DBEAFE",
		justifyContent: "center",
		alignItems: "center",
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: 15,
		fontWeight: "700",
		color: "#111827",
	},
	body: {
		fontSize: 13,
		color: "#475569",
		marginTop: 4,
	},
	date: {
		fontSize: 11,
		color: "#94A3B8",
		marginTop: 8,
	},
	dot: {
		width: 9,
		height: 9,
		borderRadius: 5,
		backgroundColor: "#2563EB",
	},
	empty: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: 30,
		gap: 12,
	},
	emptyText: {
		fontSize: 15,
		color: "#64748B",
	},
});
